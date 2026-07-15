// Inventory Management API Routes
// Handles medicine inventory operations, live/off toggle, and vendor-based stock updates

const express = require('express');
const router = express.Router();
const { pool } = require('../services/db');

/**
 * POST /api/inventory/toggle-status
 * Toggle medicine live/off status (for POS visibility)
 */
router.post('/toggle-status', async (req, res) => {
  try {
    const { id } = req.query;
    const { is_live } = req.body;

    console.log('🔄 Toggle Status Request:');
    console.log('  Medicine ID:', id);
    console.log('  is_live from body:', is_live);
    console.log('  is_live type:', typeof is_live);

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Medicine ID is required'
      });
    }

    // Explicitly convert to boolean
    const newStatus = Boolean(is_live);
    console.log('  Converted boolean:', newStatus);

    const query = `
      UPDATE medicines
      SET is_live = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
        AND (is_deleted IS NOT TRUE OR is_deleted IS NULL)
      RETURNING id, brand_name, is_live
    `;

    console.log('  Executing query with params:', [newStatus, id]);

    const result = await pool.query(query, [newStatus, id]);

    console.log('  Query result rows:', result.rows.length);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Medicine not found or already deleted'
      });
    }

    const medicine = result.rows[0];
    console.log('  Updated medicine:', medicine.brand_name, 'is_live:', medicine.is_live);

    res.status(200).json({
      success: true,
      message: `Medicine ${medicine.is_live ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: medicine.id,
        brand_name: medicine.brand_name,
        is_live: medicine.is_live,
        status: medicine.is_live ? 'Live' : 'Draft'
      }
    });
  } catch (error) {
    console.error('❌ Error toggling medicine status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle medicine status',
      message: error.message
    });
  }
});

/**
 * POST /api/inventory/update-stock
 * Smart stock update with vendor switching and ledger tracking
 */
router.post('/update-stock', async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      medicine_id,
      medicine_name,
      vendor_id,
      quantity_added,
      cost_per_box,
      tablets_per_box,
      amount_paid,
      notes
    } = req.body;

    // Validation
    if (!medicine_id || !vendor_id || !quantity_added || !cost_per_box || !tablets_per_box) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: medicine_id, vendor_id, quantity_added, cost_per_box, tablets_per_box'
      });
    }

    await client.query('BEGIN');

    // Calculate cost per tablet
    const cost_per_tablet = parseFloat(cost_per_box) / parseInt(tablets_per_box);
    const total_cost = parseFloat(cost_per_box) * (parseInt(quantity_added) / parseInt(tablets_per_box));
    const paid_amount = parseFloat(amount_paid || 0);
    const balance = total_cost - paid_amount;

    // Update medicine stock and vendor info
    const medicineUpdate = await client.query(`
      UPDATE medicines
      SET stock_quantity = stock_quantity + $1,
          current_vendor_id = $2,
          cost_per_box = $3,
          cost_per_tablet = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [quantity_added, vendor_id, cost_per_box, cost_per_tablet, medicine_id]);

    if (medicineUpdate.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Medicine not found'
      });
    }

    // Update vendor ledger
    await client.query(`
      UPDATE vendors
      SET total_ordered_amount = total_ordered_amount + $1,
          total_paid_amount = total_paid_amount + $2,
          balance_amount = balance_amount + $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE vendor_id = $4
    `, [total_cost, paid_amount, balance, vendor_id]);

    // Log supply history
    await client.query(`
      INSERT INTO vendor_supply_history (
        vendor_id, medicine_id, medicine_name, quantity_added,
        price_per_box, price_per_tablet, total_cost,
        amount_paid_this_batch, balance_remaining, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      vendor_id,
      medicine_id,
      medicine_name || medicineUpdate.rows[0].brand_name,
      quantity_added,
      cost_per_box,
      cost_per_tablet,
      total_cost,
      paid_amount,
      balance,
      notes
    ]);

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Stock updated successfully with vendor ledger tracking',
      data: {
        medicine: medicineUpdate.rows[0],
        supply_details: {
          quantity_added,
          total_cost: total_cost.toFixed(2),
          amount_paid: paid_amount.toFixed(2),
          balance_remaining: balance.toFixed(2),
          cost_per_tablet: cost_per_tablet.toFixed(4)
        }
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating stock:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update stock',
      message: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/inventory/live-medicines
 * Get only live medicines (for POS)
 */
router.get('/live-medicines', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        m.*,
        v.vendor_name as current_vendor_name
      FROM medicines m
      LEFT JOIN vendors v ON m.current_vendor_id = v.vendor_id
      WHERE m.is_live = TRUE
        AND (m.is_deleted IS NOT TRUE OR m.is_deleted IS NULL)
      ORDER BY m.brand_name ASC
    `);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching live medicines:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch live medicines',
      message: error.message
    });
  }
});

/**
 * GET /api/inventory/all-with-status
 * Get all medicines with their live status
 */
router.get('/all-with-status', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        m.*,
        v.vendor_name as current_vendor_name,
        v.vendor_id as current_vendor_id
      FROM medicines m
      LEFT JOIN vendors v ON m.current_vendor_id = v.vendor_id
      WHERE (m.is_deleted IS NOT TRUE OR m.is_deleted IS NULL)
      ORDER BY m.brand_name ASC
    `);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching medicines:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch medicines',
      message: error.message
    });
  }
});

module.exports = router;

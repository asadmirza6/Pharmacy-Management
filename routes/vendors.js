// Vendor Management API Routes
// Handles vendor CRUD operations and ledger management

const express = require('express');
const router = express.Router();
const { pool } = require('../services/db');

/**
 * GET /api/vendors
 * Fetch all vendors with ledger summary
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        vendor_id,
        vendor_name,
        contact_person,
        phone,
        email,
        address,
        total_ordered_amount,
        total_paid_amount,
        balance_amount,
        created_at,
        updated_at
      FROM vendors
      ORDER BY vendor_name ASC
    `);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vendors',
      message: error.message
    });
  }
});

/**
 * GET /api/vendors/:id
 * Get single vendor with supply history
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get vendor details
    const vendorResult = await pool.query(
      'SELECT * FROM vendors WHERE vendor_id = $1',
      [id]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found'
      });
    }

    // Get supply history
    const historyResult = await pool.query(`
      SELECT
        supply_id,
        medicine_id,
        medicine_name,
        quantity_added,
        price_per_box,
        price_per_tablet,
        total_cost,
        amount_paid_this_batch,
        balance_remaining,
        supply_date,
        notes
      FROM vendor_supply_history
      WHERE vendor_id = $1
      ORDER BY supply_date DESC
      LIMIT 50
    `, [id]);

    res.status(200).json({
      success: true,
      data: {
        vendor: vendorResult.rows[0],
        supplyHistory: historyResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching vendor details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vendor details',
      message: error.message
    });
  }
});

/**
 * POST /api/vendors
 * Create new vendor
 */
router.post('/', async (req, res) => {
  try {
    const { vendor_name, contact_person, phone, email, address } = req.body;

    if (!vendor_name) {
      return res.status(400).json({
        success: false,
        error: 'Vendor name is required'
      });
    }

    const result = await pool.query(`
      INSERT INTO vendors (vendor_name, contact_person, phone, email, address)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [vendor_name, contact_person, phone, email, address]);

    res.status(201).json({
      success: true,
      message: 'Vendor created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        success: false,
        error: 'Vendor with this name already exists'
      });
    }
    console.error('Error creating vendor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create vendor',
      message: error.message
    });
  }
});

/**
 * PUT /api/vendors/:id
 * Update vendor details
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { vendor_name, contact_person, phone, email, address } = req.body;

    const result = await pool.query(`
      UPDATE vendors
      SET vendor_name = COALESCE($1, vendor_name),
          contact_person = COALESCE($2, contact_person),
          phone = COALESCE($3, phone),
          email = COALESCE($4, email),
          address = COALESCE($5, address)
      WHERE vendor_id = $6
      RETURNING *
    `, [vendor_name, contact_person, phone, email, address, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Vendor updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating vendor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update vendor',
      message: error.message
    });
  }
});

/**
 * GET /api/vendors/:id/ledger-summary
 * Get detailed ledger summary for a vendor
 */
router.get('/:id/ledger-summary', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        v.vendor_name,
        v.total_ordered_amount,
        v.total_paid_amount,
        v.balance_amount,
        COUNT(vsh.supply_id) as total_supplies,
        MAX(vsh.supply_date) as last_supply_date
      FROM vendors v
      LEFT JOIN vendor_supply_history vsh ON v.vendor_id = vsh.vendor_id
      WHERE v.vendor_id = $1
      GROUP BY v.vendor_id, v.vendor_name, v.total_ordered_amount, v.total_paid_amount, v.balance_amount
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching ledger summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ledger summary',
      message: error.message
    });
  }
});

module.exports = router;

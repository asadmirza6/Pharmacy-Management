// Supplier API Routes - PostgreSQL Implementation
const express = require('express');
const router = express.Router();
const { pool } = require('../services/db');

/**
 * GET /api/suppliers
 * Fetch all suppliers
 */
router.get('/', async (req, res) => {
  try {
    const query = 'SELECT * FROM suppliers ORDER BY created_at DESC';
    const result = await pool.query(query);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch suppliers',
      message: error.message
    });
  }
});

/**
 * GET /api/suppliers/:id
 * Get single supplier by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM suppliers WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Supplier not found',
        message: `No supplier found with ID: ${id}`
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch supplier',
      message: error.message
    });
  }
});

/**
 * POST /api/suppliers
 * Add a new supplier
 */
router.post('/', async (req, res) => {
  try {
    const { name, contact_person, phone, email, address, city, country } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Supplier name and phone are required'
      });
    }

    // Generate new supplier ID
    const lastIdQuery = `
      SELECT id FROM suppliers
      WHERE id LIKE 'SUP-%'
      ORDER BY id DESC
      LIMIT 1
    `;
    const lastIdResult = await pool.query(lastIdQuery);

    let newId;
    if (lastIdResult.rows.length > 0) {
      const lastNum = parseInt(lastIdResult.rows[0].id.split('-')[1]);
      newId = `SUP-${String(lastNum + 1).padStart(3, '0')}`;
    } else {
      newId = 'SUP-001';
    }

    const insertQuery = `
      INSERT INTO suppliers (
        id, name, contact_person, phone, email, address, city, country, ledger_balance
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      newId,
      name,
      contact_person || null,
      phone,
      email || null,
      address || null,
      city || null,
      country || null,
      0.00
    ];

    const result = await pool.query(insertQuery, values);

    res.status(201).json({
      success: true,
      message: 'Supplier added successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding supplier:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add supplier',
      message: error.message
    });
  }
});

/**
 * POST /api/suppliers/:id/purchase
 * Add stock to a medicine and update supplier ledger
 */
router.post('/:id/purchase', async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { medicine_id, quantity, cost_price } = req.body;

    if (!medicine_id || !quantity || !cost_price) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'medicine_id, quantity, and cost_price are required'
      });
    }

    // Start transaction
    await client.query('BEGIN');

    // Check supplier exists
    const supplierResult = await client.query(
      'SELECT * FROM suppliers WHERE id = $1',
      [id]
    );

    if (supplierResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Supplier not found',
        message: `No supplier found with ID: ${id}`
      });
    }

    const supplier = supplierResult.rows[0];

    // Check medicine exists
    const medicineResult = await client.query(
      'SELECT * FROM medicines WHERE id = $1',
      [medicine_id]
    );

    if (medicineResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Medicine not found',
        message: `No medicine found with ID: ${medicine_id}`
      });
    }

    const medicine = medicineResult.rows[0];

    // Calculate purchase amount
    const purchaseAmount = parseFloat((quantity * cost_price).toFixed(2));
    const newStock = medicine.stock_quantity + parseInt(quantity);
    const newLedgerBalance = parseFloat((parseFloat(supplier.ledger_balance) + purchaseAmount).toFixed(2));

    // Update medicine stock
    await client.query(
      'UPDATE medicines SET stock_quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newStock, medicine_id]
    );

    // Update supplier ledger
    await client.query(
      'UPDATE suppliers SET ledger_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newLedgerBalance, id]
    );

    // Commit transaction
    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Stock added successfully',
      data: {
        medicine_id,
        quantity: parseInt(quantity),
        cost_price: parseFloat(cost_price),
        total_amount: purchaseAmount,
        new_stock: newStock,
        new_ledger_balance: newLedgerBalance
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing purchase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process purchase',
      message: error.message
    });
  } finally {
    client.release();
  }
});

module.exports = router;

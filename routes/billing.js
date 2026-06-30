// Billing API Routes - PostgreSQL Implementation
const express = require('express');
const router = express.Router();
const { pool } = require('../services/db');
const sessionMetrics = require('../data/session-metrics');

/**
 * POST /api/billing/checkout
 * Process customer sale with inventory deduction
 */
router.post('/checkout', async (req, res) => {
  const client = await pool.connect();

  try {
    const { items, customer_name, customer_phone, payment_method } = req.body;

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Items array is required and must contain at least one item'
      });
    }

    // Start transaction
    await client.query('BEGIN');

    // Phase 1: Validate ALL items first
    const validatedItems = [];
    for (const item of items) {
      const result = await client.query(
        'SELECT * FROM medicines WHERE id = $1',
        [item.medicine_id]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Medicine not found',
          message: `Medicine with ID ${item.medicine_id} not found`
        });
      }

      const medicine = result.rows[0];

      if (parseInt(medicine.stock_quantity) < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Insufficient stock',
          message: `Insufficient stock for ${medicine.brand_name} (available: ${medicine.stock_quantity}, requested: ${item.quantity})`
        });
      }

      validatedItems.push({ medicine, requestedQuantity: item.quantity });
    }

    // Phase 2: Deduct stock for all items
    for (const { medicine, requestedQuantity } of validatedItems) {
      const newStock = parseInt(medicine.stock_quantity) - requestedQuantity;
      await client.query(
        'UPDATE medicines SET stock_quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newStock, medicine.id]
      );
    }

    // Phase 3: Create invoice
    const invoiceNumber = `INV-${Date.now()}`;
    const totalAmount = validatedItems.reduce((sum, { medicine, requestedQuantity }) => {
      return sum + (requestedQuantity * parseFloat(medicine.selling_price));
    }, 0);

    const invoiceResult = await client.query(
      `INSERT INTO invoices (invoice_number, customer_name, customer_phone, total_amount, payment_method, payment_status, served_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        invoiceNumber,
        customer_name || 'Walk-in Customer',
        customer_phone || null,
        totalAmount.toFixed(2),
        payment_method || 'cash',
        'completed',
        'system'
      ]
    );

    const invoice = invoiceResult.rows[0];

    // Phase 4: Create invoice items
    const invoiceItems = [];
    for (const { medicine, requestedQuantity } of validatedItems) {
      const subtotal = requestedQuantity * parseFloat(medicine.selling_price);

      const itemResult = await client.query(
        `INSERT INTO invoice_items (invoice_id, medicine_id, medicine_name, batch_number, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          invoice.id,
          medicine.id,
          medicine.brand_name,
          medicine.batch_number,
          requestedQuantity,
          parseFloat(medicine.selling_price),
          subtotal.toFixed(2)
        ]
      );

      invoiceItems.push(itemResult.rows[0]);
    }

    // Commit transaction
    await client.query('COMMIT');

    // Record in session metrics
    const metricsData = {
      invoice_number: invoice.invoice_number,
      total_amount: parseFloat(invoice.total_amount),
      timestamp: invoice.timestamp,
      items: invoiceItems.map(item => ({
        medicine_id: item.medicine_id,
        medicine_name: item.medicine_name,
        quantity: parseInt(item.quantity),
        subtotal: parseFloat(item.subtotal)
      }))
    };

    console.log('Recording transaction with items:', metricsData.items.length);
    sessionMetrics.recordTransaction(metricsData);

    res.status(201).json({
      success: true,
      message: 'Sale completed successfully',
      data: {
        ...invoice,
        total_amount: parseFloat(invoice.total_amount),
        items: invoiceItems.map(item => ({
          ...item,
          unit_price: parseFloat(item.unit_price),
          subtotal: parseFloat(item.subtotal)
        }))
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Checkout error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process checkout',
      message: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/billing/invoices
 * Fetch all invoices with items
 */
router.get('/invoices', async (req, res) => {
  try {
    const invoicesResult = await pool.query(
      'SELECT * FROM invoices ORDER BY timestamp DESC LIMIT 50'
    );

    const invoices = [];
    for (const invoice of invoicesResult.rows) {
      const itemsResult = await pool.query(
        'SELECT * FROM invoice_items WHERE invoice_id = $1',
        [invoice.id]
      );

      invoices.push({
        ...invoice,
        total_amount: parseFloat(invoice.total_amount),
        items: itemsResult.rows.map(item => ({
          ...item,
          unit_price: parseFloat(item.unit_price),
          subtotal: parseFloat(item.subtotal)
        }))
      });
    }

    res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoices',
      message: error.message
    });
  }
});

/**
 * GET /api/billing/invoices/:id
 * Get single invoice with items
 */
router.get('/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const invoiceResult = await pool.query(
      'SELECT * FROM invoices WHERE id = $1',
      [id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    const invoice = invoiceResult.rows[0];

    const itemsResult = await pool.query(
      'SELECT * FROM invoice_items WHERE invoice_id = $1',
      [invoice.id]
    );

    res.status(200).json({
      success: true,
      data: {
        ...invoice,
        total_amount: parseFloat(invoice.total_amount),
        items: itemsResult.rows.map(item => ({
          ...item,
          unit_price: parseFloat(item.unit_price),
          subtotal: parseFloat(item.subtotal)
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoice',
      message: error.message
    });
  }
});

module.exports = router;

// Medicine API Routes - PostgreSQL Implementation
const express = require('express');
const router = express.Router();
const { pool } = require('../services/db');

/**
 * GET /api/medicines
 * Fetch all medicines with optional search
 */
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query, params;

    if (search) {
      query = `
        SELECT * FROM medicines
        WHERE brand_name ILIKE $1
           OR generic_name ILIKE $1
           OR batch_number ILIKE $1
        ORDER BY created_at DESC
      `;
      params = [`%${search}%`];
    } else {
      query = 'SELECT * FROM medicines ORDER BY created_at DESC';
      params = [];
    }

    const result = await pool.query(query, params);

    // Convert numeric fields from strings to numbers
    const medicines = result.rows.map(med => ({
      ...med,
      cost_price: parseFloat(med.cost_price),
      selling_price: parseFloat(med.selling_price),
      stock_quantity: parseInt(med.stock_quantity),
      reorder_threshold: parseInt(med.reorder_threshold)
    }));

    res.status(200).json({
      success: true,
      count: medicines.length,
      data: medicines
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

/**
 * GET /api/medicines/statistics
 * Get inventory statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const statsQuery = `
      SELECT
        COUNT(*) as total_items,
        COALESCE(SUM(stock_quantity * selling_price), 0) as total_value,
        COUNT(CASE WHEN expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as near_expiry_count,
        COUNT(CASE WHEN stock_quantity <= reorder_threshold THEN 1 END) as low_stock_count
      FROM medicines
    `;

    const result = await pool.query(statsQuery);
    const stats = result.rows[0];

    res.status(200).json({
      success: true,
      data: {
        total_items: parseInt(stats.total_items),
        total_value: parseFloat(stats.total_value).toFixed(2),
        near_expiry_count: parseInt(stats.near_expiry_count),
        low_stock_count: parseInt(stats.low_stock_count)
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/medicines/low-stock
 * Get medicines with low stock
 */
router.get('/low-stock', async (req, res) => {
  try {
    const query = `
      SELECT * FROM medicines
      WHERE stock_quantity <= reorder_threshold
      ORDER BY stock_quantity ASC
    `;

    const result = await pool.query(query);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching low stock medicines:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch low stock medicines',
      message: error.message
    });
  }
});

/**
 * GET /api/medicines/near-expiry
 * Get medicines nearing expiry
 */
router.get('/near-expiry', async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 30;

    const query = `
      SELECT * FROM medicines
      WHERE expiry_date <= CURRENT_DATE + INTERVAL '${threshold} days'
        AND expiry_date >= CURRENT_DATE
      ORDER BY expiry_date ASC
    `;

    const result = await pool.query(query);

    res.status(200).json({
      success: true,
      threshold: threshold,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching near-expiry medicines:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch near-expiry medicines',
      message: error.message
    });
  }
});

/**
 * GET /api/medicines/alerts
 * Get all alerts (low stock + expiry)
 */
router.get('/alerts', async (req, res) => {
  try {
    // Get low stock alerts
    const lowStockQuery = `
      SELECT id, brand_name, stock_quantity, reorder_threshold, 'low_stock' as type,
             CASE
               WHEN stock_quantity = 0 THEN 'high'
               ELSE 'medium'
             END as severity
      FROM medicines
      WHERE stock_quantity <= reorder_threshold
    `;

    // Get expiry alerts
    const expiryQuery = `
      SELECT id, brand_name, expiry_date, 'expiry' as type,
             CASE
               WHEN expiry_date < CURRENT_DATE THEN 'critical'
               WHEN expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'critical'
               WHEN expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'high'
               ELSE 'medium'
             END as severity
      FROM medicines
      WHERE expiry_date <= CURRENT_DATE + INTERVAL '60 days'
    `;

    const [lowStock, expiry] = await Promise.all([
      pool.query(lowStockQuery),
      pool.query(expiryQuery)
    ]);

    const alerts = [
      ...lowStock.rows.map(row => ({
        type: 'low_stock',
        severity: row.severity,
        message: `Low stock: ${row.brand_name} (${row.stock_quantity} remaining)`,
        timestamp: new Date().toISOString()
      })),
      ...expiry.rows.map(row => ({
        type: 'expiry',
        severity: row.severity,
        message: `Expiring soon: ${row.brand_name} (${row.expiry_date})`,
        timestamp: new Date().toISOString()
      }))
    ];

    res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts',
      message: error.message
    });
  }
});

/**
 * GET /api/medicines/:id
 * Get single medicine by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM medicines WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Medicine not found',
        message: `No medicine found with ID: ${id}`
      });
    }

    const medicine = result.rows[0];
    res.status(200).json({
      success: true,
      data: {
        ...medicine,
        cost_price: parseFloat(medicine.cost_price),
        selling_price: parseFloat(medicine.selling_price),
        stock_quantity: parseInt(medicine.stock_quantity),
        reorder_threshold: parseInt(medicine.reorder_threshold)
      }
    });
  } catch (error) {
    console.error('Error fetching medicine:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch medicine',
      message: error.message
    });
  }
});

/**
 * POST /api/medicines
 * Add new medicine
 */
router.post('/', async (req, res) => {
  try {
    const {
      brand_name,
      generic_name,
      batch_number,
      manufacturing_date,
      expiry_date,
      cost_price,
      selling_price,
      stock_quantity,
      reorder_threshold,
      supplier_id,
      supplier_name
    } = req.body;

    // Validation
    if (!brand_name || !generic_name || !batch_number || !expiry_date || !supplier_id) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Required fields missing'
      });
    }

    const insertQuery = `
      INSERT INTO medicines (
        brand_name, generic_name, batch_number, manufacturing_date,
        expiry_date, cost_price, selling_price, stock_quantity,
        reorder_threshold, supplier_id, supplier_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      brand_name,
      generic_name,
      batch_number,
      manufacturing_date,
      expiry_date,
      parseFloat(cost_price),
      parseFloat(selling_price),
      parseInt(stock_quantity),
      parseInt(reorder_threshold),
      supplier_id,
      supplier_name
    ];

    const result = await pool.query(insertQuery, values);

    const medicine = result.rows[0];
    res.status(201).json({
      success: true,
      message: 'Medicine added successfully',
      data: {
        ...medicine,
        cost_price: parseFloat(medicine.cost_price),
        selling_price: parseFloat(medicine.selling_price),
        stock_quantity: parseInt(medicine.stock_quantity),
        reorder_threshold: parseInt(medicine.reorder_threshold)
      }
    });
  } catch (error) {
    console.error('Error adding medicine:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add medicine',
      message: error.message
    });
  }
});

/**
 * PUT /api/medicines/:id
 * Update medicine
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.created_at;

    // Build dynamic update query
    const keys = Object.keys(updates);
    if (keys.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    const values = Object.values(updates);
    const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
    values.push(id);

    const updateQuery = `
      UPDATE medicines
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Medicine not found'
      });
    }

    const medicine = result.rows[0];
    res.status(200).json({
      success: true,
      message: 'Medicine updated successfully',
      data: {
        ...medicine,
        cost_price: parseFloat(medicine.cost_price),
        selling_price: parseFloat(medicine.selling_price),
        stock_quantity: parseInt(medicine.stock_quantity),
        reorder_threshold: parseInt(medicine.reorder_threshold)
      }
    });
  } catch (error) {
    console.error('Error updating medicine:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update medicine',
      message: error.message
    });
  }
});

/**
 * DELETE /api/medicines/:id
 * Delete medicine
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM medicines WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Medicine not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Medicine deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting medicine:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete medicine',
      message: error.message
    });
  }
});

module.exports = router;

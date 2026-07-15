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
        WHERE (is_deleted IS NOT TRUE OR is_deleted IS NULL)
          AND (brand_name ILIKE $1
           OR generic_name ILIKE $1
           OR batch_number ILIKE $1)
        ORDER BY created_at DESC
      `;
      params = [`%${search}%`];
    } else {
      query = `
        SELECT * FROM medicines
        WHERE (is_deleted IS NOT TRUE OR is_deleted IS NULL)
        ORDER BY created_at DESC
      `;
      params = [];
    }

    const result = await pool.query(query, params);

    // Convert numeric fields from strings to numbers and add package info
    const medicines = result.rows.map(med => {
      const unitsPerPackage = parseInt(med.units_per_package) || 1;
      const stockQuantity = parseInt(med.stock_quantity);
      const totalPackages = Math.floor(stockQuantity / unitsPerPackage);
      const looseUnits = stockQuantity % unitsPerPackage;

      return {
        ...med,
        cost_price: parseFloat(med.cost_price),
        selling_price: parseFloat(med.selling_price),
        package_cost_price: med.package_cost_price ? parseFloat(med.package_cost_price) : null,
        package_selling_price: med.package_selling_price ? parseFloat(med.package_selling_price) : null,
        stock_quantity: stockQuantity,
        reorder_threshold: parseInt(med.reorder_threshold),
        units_per_package: unitsPerPackage,
        total_packages: totalPackages,
        loose_units: looseUnits,
        display_stock: looseUnits > 0
          ? `${stockQuantity} units (${totalPackages} ${med.package_type}${totalPackages !== 1 ? 's' : ''} + ${looseUnits} loose)`
          : `${stockQuantity} units (${totalPackages} ${med.package_type}${totalPackages !== 1 ? 's' : ''})`
      };
    });

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
      WHERE (is_deleted IS NOT TRUE OR is_deleted IS NULL)
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
      WHERE (is_deleted IS NOT TRUE OR is_deleted IS NULL)
        AND stock_quantity <= reorder_threshold
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
      WHERE (is_deleted IS NOT TRUE OR is_deleted IS NULL)
        AND expiry_date <= CURRENT_DATE + INTERVAL '${threshold} days'
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
      WHERE (is_deleted IS NOT TRUE OR is_deleted IS NULL)
        AND stock_quantity <= reorder_threshold
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
      WHERE (is_deleted IS NOT TRUE OR is_deleted IS NULL)
        AND expiry_date <= CURRENT_DATE + INTERVAL '60 days'
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
    const result = await pool.query(`
      SELECT * FROM medicines
      WHERE id = $1
        AND (is_deleted IS NOT TRUE OR is_deleted IS NULL)
    `, [id]);

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
      supplier_name,
      // Package fields
      package_type,
      units_per_package,
      package_cost_price,
      package_selling_price
    } = req.body;

    // Validation
    if (!brand_name || !generic_name || !batch_number || !expiry_date || !supplier_id) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Required fields missing'
      });
    }

    // Calculate unit prices from package prices if provided
    const unitsPerPkg = parseInt(units_per_package) || 1;
    const pkgCostPrice = package_cost_price ? parseFloat(package_cost_price) : null;
    const pkgSellingPrice = package_selling_price ? parseFloat(package_selling_price) : null;

    const finalCostPrice = pkgCostPrice ? (pkgCostPrice / unitsPerPkg) : parseFloat(cost_price);
    const finalSellingPrice = pkgSellingPrice ? (pkgSellingPrice / unitsPerPkg) : parseFloat(selling_price);

    const stockQty = parseInt(stock_quantity);
    const totalPackages = Math.floor(stockQty / unitsPerPkg);

    const insertQuery = `
      INSERT INTO medicines (
        brand_name, generic_name, batch_number, manufacturing_date,
        expiry_date, cost_price, selling_price, stock_quantity,
        reorder_threshold, supplier_id, supplier_name,
        package_type, units_per_package, package_cost_price,
        package_selling_price, total_packages
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      brand_name,
      generic_name,
      batch_number,
      manufacturing_date,
      expiry_date,
      finalCostPrice,
      finalSellingPrice,
      stockQty,
      parseInt(reorder_threshold),
      supplier_id,
      supplier_name,
      package_type || 'piece',
      unitsPerPkg,
      pkgCostPrice,
      pkgSellingPrice,
      totalPackages
    ];

    const result = await pool.query(insertQuery, values);

    const medicine = result.rows[0];

    // Update supplier ledger balance - add total cost value
    const totalCostValue = stockQty * finalCostPrice;
    await pool.query(`
      UPDATE suppliers
      SET ledger_balance = COALESCE(ledger_balance, 0) + $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [totalCostValue, supplier_id]);

    res.status(201).json({
      success: true,
      message: 'Medicine added successfully',
      data: {
        ...medicine,
        cost_price: parseFloat(medicine.cost_price),
        selling_price: parseFloat(medicine.selling_price),
        package_cost_price: medicine.package_cost_price ? parseFloat(medicine.package_cost_price) : null,
        package_selling_price: medicine.package_selling_price ? parseFloat(medicine.package_selling_price) : null,
        stock_quantity: parseInt(medicine.stock_quantity),
        reorder_threshold: parseInt(medicine.reorder_threshold),
        units_per_package: parseInt(medicine.units_per_package),
        total_packages: parseInt(medicine.total_packages)
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

    // If stock_quantity is being updated, calculate ledger impact
    let shouldUpdateLedger = false;
    let ledgerDelta = 0;
    let supplierId = null;

    if (updates.stock_quantity !== undefined) {
      // Get current medicine data
      const currentResult = await pool.query('SELECT stock_quantity, cost_price, supplier_id FROM medicines WHERE id = $1', [id]);

      if (currentResult.rows.length > 0) {
        const current = currentResult.rows[0];
        const oldStock = parseInt(current.stock_quantity);
        const newStock = parseInt(updates.stock_quantity);
        const stockDifference = newStock - oldStock;

        // Only update ledger if stock is ADDED (not removed/sold)
        if (stockDifference > 0) {
          shouldUpdateLedger = true;
          const costPrice = parseFloat(updates.cost_price || current.cost_price);
          ledgerDelta = stockDifference * costPrice;
          supplierId = updates.supplier_id || current.supplier_id;
        }
      }
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

    // Update supplier ledger if stock was added
    if (shouldUpdateLedger && supplierId) {
      await pool.query(`
        UPDATE suppliers
        SET ledger_balance = COALESCE(ledger_balance, 0) + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [ledgerDelta, supplierId]);
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
 * Soft delete medicine (sets is_deleted = TRUE)
 * Prevents foreign key violations with invoice_items
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Soft delete: set is_deleted = TRUE and is_live = FALSE
    const result = await pool.query(`
      UPDATE medicines
      SET is_deleted = TRUE,
          is_live = FALSE,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND (is_deleted IS NOT TRUE OR is_deleted IS NULL)
      RETURNING id, brand_name
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Medicine not found or already deleted'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Medicine deleted successfully',
      data: result.rows[0]
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

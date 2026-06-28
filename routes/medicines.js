// Medicine Inventory API Routes
// Mock implementation for client demo

const express = require('express');
const router = express.Router();
const medicineData = require('../data/medicines');

/**
 * GET /api/medicines
 * Fetch all medicines or search by query
 * Query params: ?search=keyword
 */
router.get('/', (req, res) => {
  try {
    const { search } = req.query;

    let medicines;
    if (search) {
      medicines = medicineData.searchMedicines(search);
    } else {
      medicines = medicineData.getAllMedicines();
    }

    res.status(200).json({
      success: true,
      count: medicines.length,
      data: medicines
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch medicines',
      message: error.message
    });
  }
});

/**
 * GET /api/medicines/low-stock
 * Fetch medicines with low stock (below reorder threshold)
 */
router.get('/low-stock', (req, res) => {
  try {
    const lowStockMedicines = medicineData.getLowStockMedicines();

    res.status(200).json({
      success: true,
      count: lowStockMedicines.length,
      data: lowStockMedicines
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch low stock medicines',
      message: error.message
    });
  }
});

/**
 * T035: GET /api/medicines/statistics
 * Get inventory statistics including totals and near-expiry counts
 */
router.get('/statistics', (req, res) => {
  try {
    const stats = medicineData.getInventoryStatistics();

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

/**
 * T036: GET /api/medicines/near-expiry
 * Get medicines nearing expiry within threshold
 */
router.get('/near-expiry', (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 30;

    if (threshold < 1 || threshold > 365) {
      return res.status(400).json({
        success: false,
        error: 'Invalid threshold',
        message: 'Threshold must be between 1 and 365 days'
      });
    }

    const nearExpiry = medicineData.getNearExpiryMedicines(threshold);

    res.status(200).json({
      success: true,
      threshold: threshold,
      count: nearExpiry.length,
      data: nearExpiry
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch near-expiry medicines',
      message: error.message
    });
  }
});

/**
 * GET /api/medicines/alerts
 * Get aggregated alerts (expiry + low stock)
 */
router.get('/alerts', (req, res) => {
  try {
    const { type, severity } = req.query;
    let alerts = medicineData.getAllAlerts();

    // Filter by type if provided
    if (type) {
      alerts = alerts.filter(a => a.type === type);
    }

    // Filter by severity if provided
    if (severity) {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const minSeverity = severityOrder[severity];
      if (minSeverity !== undefined) {
        alerts = alerts.filter(a => severityOrder[a.severity] <= minSeverity);
      }
    }

    res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts',
      message: error.message
    });
  }
});

/**
 * GET /api/medicines/:id
 * Fetch a single medicine by ID
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const medicine = medicineData.getMedicineById(id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        error: 'Medicine not found',
        message: `No medicine found with ID: ${id}`
      });
    }

    res.status(200).json({
      success: true,
      data: medicine
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch medicine',
      message: error.message
    });
  }
});

/**
 * POST /api/medicines
 * Add a new medicine
 * Body: { brand_name, generic_name, batch_number, manufacturing_date, expiry_date, cost_price, selling_price, stock_quantity, reorder_threshold, supplier_id, supplier_name }
 */
router.post('/', (req, res) => {
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
    if (!brand_name || !generic_name || !batch_number) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Required fields: brand_name, generic_name, batch_number'
      });
    }

    const newMedicine = medicineData.addMedicine({
      brand_name,
      generic_name,
      batch_number,
      manufacturing_date,
      expiry_date,
      cost_price: parseFloat(cost_price),
      selling_price: parseFloat(selling_price),
      stock_quantity: parseInt(stock_quantity),
      reorder_threshold: parseInt(reorder_threshold),
      supplier_id,
      supplier_name
    });

    res.status(201).json({
      success: true,
      message: 'Medicine added successfully',
      data: newMedicine
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to add medicine',
      message: error.message
    });
  }
});

/**
 * PUT /api/medicines/:id
 * Update an existing medicine
 * Body: Any medicine fields to update
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Don't allow ID modification
    delete updates.id;
    delete updates.created_at;

    const updatedMedicine = medicineData.updateMedicine(id, updates);

    if (!updatedMedicine) {
      return res.status(404).json({
        success: false,
        error: 'Medicine not found',
        message: `No medicine found with ID: ${id}`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Medicine updated successfully',
      data: updatedMedicine
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update medicine',
      message: error.message
    });
  }
});

/**
 * DELETE /api/medicines/:id
 * Delete a medicine
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = medicineData.deleteMedicine(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Medicine not found',
        message: `No medicine found with ID: ${id}`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Medicine deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete medicine',
      message: error.message
    });
  }
});

module.exports = router;

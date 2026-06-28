// T045-T047: Supplier API Routes

const express = require('express');
const router = express.Router();
const supplierData = require('../data/suppliers');

/**
 * T046: GET /api/suppliers
 * Fetch all suppliers with contact information and ledger balances
 * @returns {Object} Response with supplier list
 * @example
 * GET /api/suppliers
 * Response: { success: true, count: 3, data: [...] }
 */
router.get('/', (req, res) => {
  try {
    const suppliers = supplierData.getAllSuppliers();

    res.status(200).json({
      success: true,
      count: suppliers.length,
      data: suppliers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch suppliers',
      message: error.message
    });
  }
});

/**
 * T047: GET /api/suppliers/:id
 * Fetch a single supplier by ID with full contact details
 * @param {string} id - Supplier ID (e.g., SUP-001)
 * @returns {Object} Response with supplier details or 404 error
 * @example
 * GET /api/suppliers/SUP-001
 * Response: { success: true, data: {...} }
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const supplier = supplierData.getSupplierById(id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: 'Supplier not found',
        message: `No supplier found with ID: ${id}`
      });
    }

    res.status(200).json({
      success: true,
      data: supplier
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch supplier',
      message: error.message
    });
  }
});

/**
 * POST /api/suppliers/:id/purchase
 * Add stock to a medicine and update supplier ledger
 */
router.post('/:id/purchase', (req, res) => {
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

    const supplier = supplierData.getSupplierById(id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: 'Supplier not found',
        message: `No supplier found with ID: ${id}`
      });
    }

    const medicineData = require('../data/medicines');
    const medicine = medicineData.getMedicineById(medicine_id);
    if (!medicine) {
      return res.status(404).json({
        success: false,
        error: 'Medicine not found',
        message: `No medicine found with ID: ${medicine_id}`
      });
    }

    const purchaseAmount = parseFloat((quantity * cost_price).toFixed(2));
    medicineData.updateMedicine(medicine_id, {
      stock_quantity: medicine.stock_quantity + parseInt(quantity)
    });

    supplierData.updateSupplier(id, {
      ledger_balance: parseFloat((supplier.ledger_balance + purchaseAmount).toFixed(2))
    });

    res.status(200).json({
      success: true,
      message: 'Stock added successfully',
      data: {
        medicine_id,
        quantity: parseInt(quantity),
        cost_price: parseFloat(cost_price),
        total_amount: purchaseAmount,
        new_stock: medicine.stock_quantity + parseInt(quantity),
        new_ledger_balance: parseFloat((supplier.ledger_balance + purchaseAmount).toFixed(2))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to process purchase',
      message: error.message
    });
  }
});

module.exports = router;

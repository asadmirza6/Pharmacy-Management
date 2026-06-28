// T016-T022: Billing API Routes
// Implements customer checkout processing with inventory deduction

const express = require('express');
const router = express.Router();
const medicineData = require('../data/medicines');
const invoiceData = require('../data/invoices');
const sessionMetrics = require('../data/session-metrics');

/**
 * T017-T020: POST /api/billing/checkout
 * Process customer sale with two-phase validation:
 * 1. Validate all items have sufficient stock
 * 2. Deduct inventory for all items
 * 3. Create invoice with denormalized details
 */
router.post('/checkout', (req, res) => {
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

    // T018: Phase 1 - Validate ALL items first (fail-fast)
    const validatedItems = [];
    for (const item of items) {
      const medicine = medicineData.getMedicineById(item.medicine_id);

      if (!medicine) {
        return res.status(400).json({
          success: false,
          error: 'Medicine not found',
          message: `Medicine with ID ${item.medicine_id} not found`
        });
      }

      if (medicine.stock_quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient stock',
          message: `Insufficient stock for ${medicine.brand_name} (available: ${medicine.stock_quantity}, requested: ${item.quantity})`
        });
      }

      validatedItems.push({ medicine, requestedQuantity: item.quantity });
    }

    // T019: Phase 2 - Deduct all items (only if all validations passed)
    validatedItems.forEach(({ medicine, requestedQuantity }) => {
      medicineData.updateMedicine(medicine.id, {
        stock_quantity: medicine.stock_quantity - requestedQuantity
      });
    });

    // T020: Phase 3 - Create invoice with denormalized item details
    const invoiceItems = validatedItems.map(({ medicine, requestedQuantity }) => ({
      medicine_id: medicine.id,
      medicine_name: medicine.brand_name,
      batch_number: medicine.batch_number,
      quantity: requestedQuantity,
      unit_price: parseFloat(medicine.selling_price),
      subtotal: parseFloat((requestedQuantity * medicine.selling_price).toFixed(2))
    }));

    const total = invoiceData.calculateTotal(invoiceItems);

    const invoice = invoiceData.createInvoice({
      items: invoiceItems,
      total_amount: parseFloat(total.toFixed(2)),
      payment_method: payment_method || 'cash',
      customer_name: customer_name || 'Walk-in Customer',
      customer_phone: customer_phone || null,
      served_by: 'system' // Placeholder until auth implemented
    });

    // Record transaction in session metrics
    sessionMetrics.recordTransaction(invoice);

    res.status(201).json({
      success: true,
      message: 'Sale completed successfully',
      data: invoice
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to process checkout',
      message: error.message
    });
  }
});

/**
 * T021: GET /api/billing/invoices
 * Retrieve all invoices with optional filters (date range, status)
 */
router.get('/invoices', (req, res) => {
  try {
    const { from_date, to_date, status } = req.query;

    let invoices;

    if (status) {
      invoices = invoiceData.getInvoicesByStatus(status);
    } else if (from_date || to_date) {
      invoices = invoiceData.getInvoicesByDateRange(from_date, to_date);
    } else {
      invoices = invoiceData.getAllInvoices();
    }

    res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoices',
      message: error.message
    });
  }
});

/**
 * T022: GET /api/billing/invoices/:id
 * Retrieve a single invoice by ID
 */
router.get('/invoices/:id', (req, res) => {
  try {
    const { id } = req.params;
    const invoice = invoiceData.getInvoiceById(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
        message: `No invoice found with ID: ${id}`
      });
    }

    res.status(200).json({
      success: true,
      data: invoice
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoice',
      message: error.message
    });
  }
});

module.exports = router;

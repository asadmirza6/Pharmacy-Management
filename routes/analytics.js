// Analytics API Routes
// Provides dashboard metrics, analytics summary, and top sellers data

const express = require('express');
const router = express.Router();
const sessionMetrics = require('../data/session-metrics');
const medicineData = require('../data/medicines');
const invoiceData = require('../data/invoices');

/**
 * GET /api/analytics/dashboard
 * Retrieves real-time metrics for Dashboard Overview tab
 */
router.get('/dashboard', (req, res) => {
  try {
    const metrics = sessionMetrics.getMetrics();
    const nearExpiryMeds = medicineData.getNearExpiryMedicines(30);
    const lowStockMeds = medicineData.getLowStockMedicines();

    res.status(200).json({
      success: true,
      data: {
        revenueToday: metrics.totalRevenue,
        transactionsToday: metrics.transactionCount,
        nearExpiryCount: nearExpiryMeds.length,
        lowStockCount: lowStockMeds.length,
        lowStockAlerts: lowStockMeds.slice(0, 10).map(med => ({
          medicineId: med.id,
          medicineName: med.brand_name,
          currentStock: med.stock_quantity,
          reorderThreshold: med.reorder_threshold
        })),
        topSellers: sessionMetrics.getTopSellers(10)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard metrics',
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/summary
 * Retrieves detailed analytics for Analytics & Ledger view
 */
router.get('/summary', (req, res) => {
  try {
    const metrics = sessionMetrics.getMetrics();
    const invoices = invoiceData.getAllInvoices();
    const sessionDurationMs = Date.now() - metrics.sessionStartTime;
    const sessionHours = sessionDurationMs / (1000 * 60 * 60);

    res.status(200).json({
      success: true,
      data: {
        totalRevenue: metrics.totalRevenue,
        totalTransactions: metrics.transactionCount,
        averageTransactionValue: metrics.transactionCount > 0
          ? metrics.totalRevenue / metrics.transactionCount
          : 0,
        salesVelocity: {
          transactionsPerHour: sessionHours > 0
            ? metrics.transactionCount / sessionHours
            : 0,
          hoursSinceStart: sessionHours
        },
        recentInvoices: invoices.slice(-50).reverse().map(inv => ({
          invoiceId: inv.id,
          invoiceNumber: inv.invoice_number,
          timestamp: inv.timestamp,
          customerName: inv.customer_name || 'Walk-in Customer',
          itemCount: inv.items.length,
          totalAmount: inv.total_amount,
          paymentMethod: inv.payment_method,
          paymentStatus: inv.payment_status
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics summary',
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/top-sellers
 * Retrieves top selling medicines with optional limit
 */
router.get('/top-sellers', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    if (limit < 1 || limit > 50) {
      return res.status(400).json({
        success: false,
        error: 'Invalid limit',
        message: 'Limit must be between 1 and 50'
      });
    }

    const topSellers = sessionMetrics.getTopSellers(limit);

    res.status(200).json({
      success: true,
      count: topSellers.length,
      data: topSellers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top sellers',
      message: error.message
    });
  }
});

module.exports = router;

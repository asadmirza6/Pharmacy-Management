// Analytics API Routes - PostgreSQL Database Integration
// Provides dashboard metrics, analytics summary, and sales data from Neon PostgreSQL

const express = require('express');
const router = express.Router();
const { pool } = require('../services/db');

/**
 * TEST ENDPOINT - Check if routes are accessible
 */
router.get('/test', async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Analytics routes are working!',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/analytics/dashboard
 * Retrieves real-time metrics for Dashboard Overview tab
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Get revenue and transactions today (from invoices)
    const revenueQuery = await pool.query(`
      SELECT
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COUNT(*) as transaction_count
      FROM invoices
      WHERE DATE(timestamp) = CURRENT_DATE
    `);

    // Get near expiry medicines count (within 30 days)
    const nearExpiryQuery = await pool.query(`
      SELECT COUNT(*) as near_expiry_count
      FROM medicines
      WHERE expiry_date > CURRENT_DATE
        AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
    `);

    // Get low stock medicines count
    const lowStockQuery = await pool.query(`
      SELECT COUNT(*) as low_stock_count
      FROM medicines
      WHERE stock_quantity <= reorder_threshold
    `);

    // Get low stock alerts (top 10)
    const lowStockAlerts = await pool.query(`
      SELECT
        id as medicine_id,
        brand_name as medicine_name,
        stock_quantity as current_stock,
        reorder_threshold
      FROM medicines
      WHERE stock_quantity <= reorder_threshold
      ORDER BY stock_quantity ASC
      LIMIT 10
    `);

    // Get top sellers (from invoice_items - grouped by medicine)
    const topSellersQuery = await pool.query(`
      SELECT
        ii.medicine_id,
        ii.medicine_name,
        SUM(ii.quantity) as total_quantity_sold,
        SUM(ii.subtotal) as total_revenue
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      ORDER BY total_quantity_sold DESC
      LIMIT 10
    `);

    res.status(200).json({
      success: true,
      data: {
        revenueToday: parseFloat(revenueQuery.rows[0].total_revenue || 0),
        transactionsToday: parseInt(revenueQuery.rows[0].transaction_count || 0),
        nearExpiryCount: parseInt(nearExpiryQuery.rows[0].near_expiry_count || 0),
        lowStockCount: parseInt(lowStockQuery.rows[0].low_stock_count || 0),
        lowStockAlerts: lowStockAlerts.rows,
        topSellers: topSellersQuery.rows.map(item => ({
          medicineId: item.medicine_id,
          medicineName: item.medicine_name,
          quantitySold: parseInt(item.total_quantity_sold),
          revenue: parseFloat(item.total_revenue)
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard metrics',
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/low-stock
 * Retrieves medicines with stock below reorder threshold
 */
router.get('/low-stock', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        brand_name as medicine_name,
        generic_name,
        stock_quantity as current_stock,
        reorder_threshold as minimum_threshold,
        supplier_name
      FROM medicines
      WHERE stock_quantity <= reorder_threshold
      ORDER BY stock_quantity ASC
    `);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching low stock medicines:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch low stock data',
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/top-selling
 * Retrieves top selling medicines with optional limit
 */
router.get('/top-selling', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    if (limit < 1 || limit > 50) {
      return res.status(400).json({
        success: false,
        error: 'Invalid limit',
        message: 'Limit must be between 1 and 50'
      });
    }

    const result = await pool.query(`
      SELECT
        ii.medicine_id,
        ii.medicine_name,
        SUM(ii.quantity) as total_quantity_sold,
        SUM(ii.subtotal) as total_revenue_generated,
        COUNT(DISTINCT ii.invoice_id) as number_of_orders
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      GROUP BY ii.medicine_id, ii.medicine_name
      ORDER BY total_quantity_sold DESC
      LIMIT $1
    `, [limit]);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows.map(item => ({
        medicineId: item.medicine_id,
        medicineName: item.medicine_name,
        totalQuantitySold: parseInt(item.total_quantity_sold),
        totalRevenueGenerated: parseFloat(item.total_revenue_generated),
        numberOfOrders: parseInt(item.number_of_orders)
      }))
    });
  } catch (error) {
    console.error('Error fetching top sellers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top sellers',
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/sales-over-time
 * Retrieves sales analytics grouped by date (daily, monthly, or custom period)
 */
router.get('/sales-over-time', async (req, res) => {
  try {
    const period = req.query.period || 'daily'; // daily, monthly, yearly
    const days = parseInt(req.query.days) || 30; // Last N days for daily view

    let query;
    let params = [];

    if (period === 'daily') {
      query = `
        SELECT
          DATE(timestamp) as date,
          COUNT(*) as transaction_count,
          SUM(total_amount) as total_sales,
          AVG(total_amount) as avg_transaction_value
        FROM invoices
        WHERE timestamp >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
      `;
    } else if (period === 'monthly') {
      query = `
        SELECT
          TO_CHAR(timestamp, 'YYYY-MM') as month,
          COUNT(*) as transaction_count,
          SUM(total_amount) as total_sales,
          AVG(total_amount) as avg_transaction_value
        FROM invoices
        GROUP BY TO_CHAR(timestamp, 'YYYY-MM')
        ORDER BY month DESC
        LIMIT 12
      `;
    } else {
      query = `
        SELECT
          EXTRACT(YEAR FROM timestamp) as year,
          COUNT(*) as transaction_count,
          SUM(total_amount) as total_sales,
          AVG(total_amount) as avg_transaction_value
        FROM invoices
        GROUP BY EXTRACT(YEAR FROM timestamp)
        ORDER BY year DESC
      `;
    }

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      period: period,
      count: result.rows.length,
      data: result.rows.map(row => ({
        period: row.date || row.month || row.year?.toString(),
        transactionCount: parseInt(row.transaction_count),
        totalSales: parseFloat(row.total_sales || 0),
        avgTransactionValue: parseFloat(row.avg_transaction_value || 0)
      }))
    });
  } catch (error) {
    console.error('Error fetching sales over time:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sales analytics',
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/summary
 * Retrieves detailed analytics for Analytics & Ledger view
 */
router.get('/summary', async (req, res) => {
  try {
    // Get overall totals
    const totalsQuery = await pool.query(`
      SELECT
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COUNT(*) as total_transactions,
        COALESCE(AVG(total_amount), 0) as avg_transaction_value
      FROM invoices
    `);

    // Get recent invoices (last 50)
    const invoicesQuery = await pool.query(`
      SELECT
        id,
        invoice_number,
        timestamp,
        customer_name,
        total_amount,
        payment_method,
        payment_status,
        (SELECT COUNT(*) FROM invoice_items WHERE invoice_id = invoices.id) as items_count
      FROM invoices
      ORDER BY timestamp DESC
      LIMIT 50
    `);

    const totals = totalsQuery.rows[0];

    res.status(200).json({
      success: true,
      data: {
        totalRevenue: parseFloat(totals.total_revenue),
        totalTransactions: parseInt(totals.total_transactions),
        averageTransactionValue: parseFloat(totals.avg_transaction_value),
        recentInvoices: invoicesQuery.rows.map(inv => ({
          invoiceId: inv.id,
          invoiceNumber: inv.invoice_number,
          timestamp: inv.timestamp,
          customerName: inv.customer_name || 'Walk-in Customer',
          itemCount: parseInt(inv.items_count),
          totalAmount: parseFloat(inv.total_amount),
          paymentMethod: inv.payment_method,
          paymentStatus: inv.payment_status
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics summary',
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/transactions
 * Retrieves transactions for a specific date with items and user who processed them
 * Query parameters:
 *   - date: YYYY-MM-DD format (optional, defaults to today)
 */
router.get('/transactions', async (req, res) => {
  try {
    const requestedDate = req.query.date || new Date().toISOString().split('T')[0];

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(requestedDate)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format',
        message: 'Date must be in YYYY-MM-DD format'
      });
    }

    // Get summary for the date
    const summaryQuery = await pool.query(`
      SELECT
        COALESCE(SUM(total_amount), 0) as total_sales,
        COUNT(*) as total_transactions
      FROM invoices
      WHERE DATE(timestamp) = $1
    `, [requestedDate]);

    // Get all transactions for the date with items
    const transactionsQuery = await pool.query(`
      SELECT
        i.id,
        i.invoice_number,
        i.timestamp,
        i.customer_name,
        i.customer_phone,
        i.total_amount,
        i.payment_method,
        i.payment_status,
        i.served_by
      FROM invoices i
      WHERE DATE(i.timestamp) = $1
      ORDER BY i.timestamp DESC
    `, [requestedDate]);

    const transactions = [];

    for (const invoice of transactionsQuery.rows) {
      // Get items for this invoice
      const itemsQuery = await pool.query(`
        SELECT
          medicine_name,
          batch_number,
          quantity,
          unit_price,
          subtotal
        FROM invoice_items
        WHERE invoice_id = $1
        ORDER BY medicine_name
      `, [invoice.id]);

      transactions.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        timestamp: invoice.timestamp,
        customerName: invoice.customer_name || 'Walk-in Customer',
        customerPhone: invoice.customer_phone,
        totalAmount: parseFloat(invoice.total_amount),
        paymentMethod: invoice.payment_method,
        paymentStatus: invoice.payment_status,
        processedBy: invoice.served_by || 'System',
        items: itemsQuery.rows.map(item => ({
          medicineName: item.medicine_name,
          batchNumber: item.batch_number,
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unit_price),
          subtotal: parseFloat(item.subtotal)
        }))
      });
    }

    const summary = summaryQuery.rows[0];

    res.status(200).json({
      success: true,
      date: requestedDate,
      summary: {
        totalSales: parseFloat(summary.total_sales),
        totalTransactions: parseInt(summary.total_transactions)
      },
      data: transactions
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions',
      message: error.message
    });
  }
});

module.exports = router;

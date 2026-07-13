// Production Database Integration
// MySQL-backed pharmacy management system
// Author: Database Architecture Team
// Date: 2026-06-23

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');

// Import database connection pool
const { pool } = require('./services/db');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { requireAdmin, requireBillingAccess, requireStockAccess } = require('./middleware/auth');

const medicineRoutes = require('./routes/medicines');
const patientRoutes = require('./routes/patients');

// Initialize session metrics
const sessionMetrics = require('./data/session-metrics');
sessionMetrics.initialize();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// CORS configuration - MUST allow credentials for session cookies
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], // Allow both localhost and 127.0.0.1
  credentials: true, // Allow cookies/session
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session middleware - MUST come before routes
app.use(session({
  secret: process.env.SESSION_SECRET || 'pharmacy_secret_key_2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 3600000, // 1 hour
    sameSite: 'lax' // Allow cookie to be sent with redirects
  }
}));

// Serve static files from public directory
app.use(express.static('public'));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    res.status(200).json({
      success: true,
      message: 'Pharmacy API Server is running',
      database: 'connected',
      timestamp: new Date().toISOString(),
      version: '2.0.0-production'
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Pharmacy API Server is running',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString(),
      version: '2.0.0-production'
    });
  }
});

// API Documentation endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Pharmacy Management System - Medicine Inventory API',
    version: '1.0.0-demo',
    endpoints: {
      health: 'GET /health - Server health check',
      getAllMedicines: 'GET /api/medicines - Fetch all medicines',
      searchMedicines: 'GET /api/medicines?search=keyword - Search medicines',
      getLowStock: 'GET /api/medicines/low-stock - Get low stock alerts',
      getStatistics: 'GET /api/medicines/statistics - Get inventory statistics',
      getNearExpiry: 'GET /api/medicines/near-expiry - Get medicines nearing expiry',
      getAlerts: 'GET /api/medicines/alerts - Get all system alerts',
      getMedicineById: 'GET /api/medicines/:id - Get single medicine',
      addMedicine: 'POST /api/medicines - Add new medicine',
      updateMedicine: 'PUT /api/medicines/:id - Update medicine',
      deleteMedicine: 'DELETE /api/medicines/:id - Delete medicine',
      checkout: 'POST /api/billing/checkout - Process customer checkout',
      getInvoices: 'GET /api/billing/invoices - Fetch all invoices',
      getInvoiceById: 'GET /api/billing/invoices/:id - Get single invoice',
      getAllSuppliers: 'GET /api/suppliers - Fetch all suppliers',
      getSupplierById: 'GET /api/suppliers/:id - Get single supplier'
    },
    documentation: 'Visit /api/docs for detailed API documentation'
  });
});

// Detailed API Documentation
app.get('/api/docs', (req, res) => {
  res.status(200).json({
    success: true,
    title: 'Medicine Inventory API Documentation',
    baseURL: `http://localhost:${PORT}/api`,
    endpoints: [
      {
        method: 'GET',
        path: '/medicines',
        description: 'Fetch all medicines or search by keyword',
        queryParams: {
          search: 'Optional - Search term for brand_name, generic_name, or batch_number'
        },
        responseExample: {
          success: true,
          count: 5,
          data: [
            {
              id: 'uuid',
              brand_name: 'Paracetamol 500mg Tablets',
              generic_name: 'Acetaminophen',
              batch_number: 'B2024-001',
              manufacturing_date: '2024-01-15',
              expiry_date: '2027-01-14',
              cost_price: 5.00,
              selling_price: 8.50,
              stock_quantity: 500,
              reorder_threshold: 50,
              supplier_id: 'SUP-001',
              supplier_name: 'PharmaCorp International Ltd'
            }
          ]
        }
      },
      {
        method: 'GET',
        path: '/medicines/low-stock',
        description: 'Fetch medicines with stock below reorder threshold',
        responseExample: {
          success: true,
          count: 1,
          data: []
        }
      },
      {
        method: 'GET',
        path: '/medicines/:id',
        description: 'Fetch a single medicine by ID',
        responseExample: {
          success: true,
          data: {}
        }
      },
      {
        method: 'POST',
        path: '/medicines',
        description: 'Add a new medicine to inventory',
        bodyExample: {
          brand_name: 'New Medicine 100mg',
          generic_name: 'Generic Name',
          batch_number: 'B2024-999',
          manufacturing_date: '2024-06-01',
          expiry_date: '2027-06-01',
          cost_price: 10.00,
          selling_price: 15.00,
          stock_quantity: 100,
          reorder_threshold: 20,
          supplier_id: 'SUP-001',
          supplier_name: 'Supplier Name'
        },
        responseExample: {
          success: true,
          message: 'Medicine added successfully',
          data: {}
        }
      },
      {
        method: 'PUT',
        path: '/medicines/:id',
        description: 'Update an existing medicine',
        bodyExample: {
          stock_quantity: 450,
          selling_price: 9.00
        },
        responseExample: {
          success: true,
          message: 'Medicine updated successfully',
          data: {}
        }
      },
      {
        method: 'DELETE',
        path: '/medicines/:id',
        description: 'Delete a medicine from inventory',
        responseExample: {
          success: true,
          message: 'Medicine deleted successfully'
        }
      }
    ]
  });
});

// =============================================
// TEST ENDPOINT
// =============================================
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'Test endpoint working!' });
});

// =============================================
// AUTHENTICATION ROUTES (Public)
// =============================================

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
console.log('✅ Authentication routes mounted at /api/auth');

// =============================================
// USER MANAGEMENT ROUTES (Admin Only)
// =============================================

const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);
console.log('✅ User management routes mounted at /api/users');

// =============================================
// PROTECTED ROUTES (Role-Based Access)
// =============================================

// Mount medicine routes (Stock users and Admin)
app.use('/api/medicines', requireStockAccess, medicineRoutes);

// Mount patient routes
app.use('/api/patients', patientRoutes);

// T023: Mount billing routes (Billing users and Admin)
const billingRoutes = require('./routes/billing');
app.use('/api/billing', requireBillingAccess, billingRoutes);
console.log('✅ Billing routes mounted at /api/billing (Billing/Admin access)');

// Mount analytics routes (Admin only)
const analyticsRoutes = require('./routes/analytics');
app.use('/api/analytics', requireAdmin, analyticsRoutes);
console.log('✅ Analytics routes mounted at /api/analytics (Admin access)');

// T048: Mount supplier routes (Stock users and Admin)
const supplierRoutes = require('./routes/suppliers');
app.use('/api/suppliers', requireStockAccess, supplierRoutes);
console.log('✅ Supplier routes mounted at /api/suppliers (Stock/Admin access)');

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: ['/health', '/api', '/api/docs', '/api/medicines', '/api/billing', '/api/analytics', '/api/suppliers']
  });
});

// Error handler middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 Pharmacy Management System - Production Database');
  console.log('='.repeat(60));
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`💊 Medicine Endpoints: http://localhost:${PORT}/api/medicines`);
  console.log(`💰 Billing Endpoints: http://localhost:${PORT}/api/billing`);
  console.log(`🚚 Supplier Endpoints: http://localhost:${PORT}/api/suppliers`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
  console.log('='.repeat(60));
  console.warn('⚠️  WARNING: Using in-memory data store');
  console.warn('⚠️  All data will be lost on server restart');
  console.warn('⚠️  For production, configure MySQL database via .env');
  console.log('='.repeat(60));
  console.log('Ready for production operations! 🎉');
  console.log('='.repeat(60));
});

module.exports = app;

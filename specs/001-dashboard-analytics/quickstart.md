# Quickstart: Dashboard Analytics Integration

**Feature**: 001-dashboard-analytics  
**Branch**: `001-dashboard-analytics`  
**Date**: 2026-06-27

## Overview

This guide helps developers set up, implement, and test the Dashboard Analytics Integration feature. Follow these steps to add real-time business metrics and analytics to the Pharmacy Management System.

---

## Prerequisites

- Node.js 14+ installed
- Git repository cloned
- Branch `001-dashboard-analytics` checked out
- Server dependencies installed (`npm install`)

---

## Implementation Checklist

### Phase 1: Backend - Session Metrics Tracking

#### Step 1.1: Create Session Metrics Data Store

**File**: `data/session-metrics.js` (NEW)

```javascript
// In-memory session metrics tracker
let sessionMetrics = null;

function initialize() {
  sessionMetrics = {
    sessionStartTime: new Date(),
    totalRevenue: 0,
    transactionCount: 0,
    salesByMedicine: new Map()
  };
  console.log('Session metrics initialized at:', sessionMetrics.sessionStartTime);
}

function recordTransaction(invoice) {
  if (!sessionMetrics) initialize();
  
  sessionMetrics.totalRevenue += invoice.total_amount;
  sessionMetrics.transactionCount += 1;
  
  invoice.items.forEach(item => {
    const existing = sessionMetrics.salesByMedicine.get(item.medicine_id);
    if (existing) {
      existing.quantitySold += item.quantity;
      existing.revenue += item.subtotal;
    } else {
      sessionMetrics.salesByMedicine.set(item.medicine_id, {
        medicineId: item.medicine_id,
        medicineName: item.medicine_name,
        quantitySold: item.quantity,
        revenue: item.subtotal
      });
    }
  });
}

function getMetrics() {
  if (!sessionMetrics) initialize();
  return sessionMetrics;
}

function getTopSellers(limit = 10) {
  if (!sessionMetrics) initialize();
  const salesArray = Array.from(sessionMetrics.salesByMedicine.values());
  return salesArray
    .sort((a, b) => {
      if (b.quantitySold !== a.quantitySold) return b.quantitySold - a.quantitySold;
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      return a.medicineName.localeCompare(b.medicineName);
    })
    .slice(0, limit);
}

function reset() {
  initialize();
}

module.exports = {
  initialize,
  recordTransaction,
  getMetrics,
  getTopSellers,
  reset
};
```

**Test**: Run `node -e "const sm = require('./data/session-metrics'); sm.initialize(); console.log(sm.getMetrics());"` from project root.

---

#### Step 1.2: Create Analytics Route

**File**: `routes/analytics.js` (NEW)

```javascript
const express = require('express');
const router = express.Router();
const sessionMetrics = require('../data/session-metrics');
const medicineData = require('../data/medicines');
const invoiceData = require('../data/invoices');

// GET /api/analytics/dashboard
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

// GET /api/analytics/summary
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

// GET /api/analytics/top-sellers
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
```

**Test**: Start server and curl `http://localhost:3000/api/analytics/dashboard`

---

#### Step 1.3: Initialize Session Metrics on Server Startup

**File**: `server.js` (MODIFY)

Add these lines after requiring routes and before mounting routes:

```javascript
// Initialize session metrics
const sessionMetrics = require('./data/session-metrics');
sessionMetrics.initialize();

// Mount analytics routes
const analyticsRoutes = require('./routes/analytics');
app.use('/api/analytics', analyticsRoutes);
```

**Test**: Restart server and check console for "Session metrics initialized at: [timestamp]"

---

#### Step 1.4: Add Hook to Billing Checkout

**File**: `routes/billing.js` (MODIFY)

Add at the top:
```javascript
const sessionMetrics = require('../data/session-metrics');
```

Inside the checkout route, after invoice creation, add:
```javascript
// Record transaction in session metrics
sessionMetrics.recordTransaction(invoice);
```

**Complete modified section**:
```javascript
const invoice = invoiceData.createInvoice({
  items: invoiceItems,
  total_amount: parseFloat(total.toFixed(2)),
  payment_method: payment_method || 'cash',
  customer_name: customer_name || 'Walk-in Customer',
  customer_phone: customer_phone || null,
  served_by: 'system'
});

// NEW: Record transaction in session metrics
sessionMetrics.recordTransaction(invoice);

res.status(201).json({
  success: true,
  message: 'Sale completed successfully',
  data: invoice
});
```

**Test**: Complete a checkout and verify metrics update via `/api/analytics/dashboard`

---

### Phase 2: Frontend - Dashboard UI

#### Step 2.1: Add Dashboard Overview Tab

**File**: `public/index.html` (MODIFY)

**Add tab button** (insert BEFORE "Medicines" tab):
```html
<button id="dashboardTab" class="tab-btn px-6 py-3 font-semibold text-indigo-600 border-b-2 border-indigo-600">
    <i class="fas fa-chart-line mr-2"></i>Dashboard Overview
</button>
```

**Add dashboard section** (insert BEFORE medicines section):
```html
<div id="dashboardSection">
    <!-- Dashboard widgets here - see full implementation below -->
</div>
```

---

#### Step 2.2: Add Dashboard HTML Structure

**Insert in `<main>` before `medicinesSection`**:

```html
<!-- Dashboard Overview Section -->
<div id="dashboardSection">
    <!-- Metric Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <!-- Revenue Today Card -->
        <div class="bg-white rounded-xl shadow-lg p-6 fade-in border-l-4 border-green-500">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-gray-500 text-sm font-semibold uppercase mb-1">Revenue Today</p>
                    <p id="dashRevenue" class="text-4xl font-bold text-gray-800">$0.00</p>
                </div>
                <div class="bg-green-100 p-4 rounded-full">
                    <i class="fas fa-dollar-sign text-3xl text-green-600"></i>
                </div>
            </div>
        </div>

        <!-- Transactions Today Card -->
        <div class="bg-white rounded-xl shadow-lg p-6 fade-in border-l-4 border-blue-500">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-gray-500 text-sm font-semibold uppercase mb-1">Transactions Today</p>
                    <p id="dashTransactions" class="text-4xl font-bold text-gray-800">0</p>
                </div>
                <div class="bg-blue-100 p-4 rounded-full">
                    <i class="fas fa-receipt text-3xl text-blue-600"></i>
                </div>
            </div>
        </div>

        <!-- Near Expiry Card -->
        <div class="bg-white rounded-xl shadow-lg p-6 fade-in border-l-4 border-orange-500">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-gray-500 text-sm font-semibold uppercase mb-1">Near Expiry</p>
                    <p id="dashNearExpiry" class="text-4xl font-bold text-gray-800">0</p>
                </div>
                <div class="bg-orange-100 p-4 rounded-full">
                    <i class="fas fa-clock text-3xl text-orange-600"></i>
                </div>
            </div>
        </div>

        <!-- Low Stock Card -->
        <div class="bg-white rounded-xl shadow-lg p-6 fade-in border-l-4 border-yellow-500">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-gray-500 text-sm font-semibold uppercase mb-1">Low Stock</p>
                    <p id="dashLowStock" class="text-4xl font-bold text-gray-800">0</p>
                </div>
                <div class="bg-yellow-100 p-4 rounded-full">
                    <i class="fas fa-exclamation-triangle text-3xl text-yellow-600"></i>
                </div>
            </div>
        </div>
    </div>

    <!-- Top Sellers Section -->
    <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
            <i class="fas fa-fire text-red-500"></i>
            <span>Top Selling Medicines</span>
        </h2>
        <div id="topSellersList" class="space-y-3">
            <!-- Populated by JavaScript -->
        </div>
    </div>

    <!-- Low Stock Alerts -->
    <div class="bg-white rounded-xl shadow-lg p-6">
        <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
            <i class="fas fa-bell text-yellow-500"></i>
            <span>Low Stock Alerts</span>
        </h2>
        <div id="lowStockAlertsList" class="space-y-2">
            <!-- Populated by JavaScript -->
        </div>
    </div>
</div>
```

---

#### Step 2.3: Add Dashboard JavaScript Functions

**Insert in `<script>` section**:

```javascript
// Dashboard state
let dashboardMetrics = null;

// Fetch dashboard metrics
async function fetchDashboardMetrics() {
  try {
    const response = await fetch(`${API_BASE}/analytics/dashboard`);
    const result = await response.json();
    
    if (result.success) {
      dashboardMetrics = result.data;
      displayDashboardMetrics(dashboardMetrics);
    }
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
  }
}

// Display dashboard metrics
function displayDashboardMetrics(metrics) {
  document.getElementById('dashRevenue').textContent = `$${metrics.revenueToday.toFixed(2)}`;
  document.getElementById('dashTransactions').textContent = metrics.transactionsToday;
  document.getElementById('dashNearExpiry').textContent = metrics.nearExpiryCount;
  document.getElementById('dashLowStock').textContent = metrics.lowStockCount;
  
  // Display top sellers
  const topSellersList = document.getElementById('topSellersList');
  if (metrics.topSellers.length === 0) {
    topSellersList.innerHTML = '<p class="text-gray-500 text-center py-4">No sales data yet</p>';
  } else {
    topSellersList.innerHTML = metrics.topSellers.map((item, index) => `
      <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
        <div class="flex items-center space-x-3">
          <span class="text-2xl font-bold text-gray-400">${index + 1}</span>
          <div>
            <p class="font-semibold text-gray-800">${item.medicineName}</p>
            <p class="text-sm text-gray-600">${item.quantitySold} units sold</p>
          </div>
        </div>
        <div class="text-right">
          <p class="font-bold text-green-600">$${item.revenue.toFixed(2)}</p>
        </div>
      </div>
    `).join('');
  }
  
  // Display low stock alerts
  const lowStockAlertsList = document.getElementById('lowStockAlertsList');
  if (metrics.lowStockAlerts.length === 0) {
    lowStockAlertsList.innerHTML = '<p class="text-gray-500 text-center py-4">All stock levels healthy</p>';
  } else {
    lowStockAlertsList.innerHTML = metrics.lowStockAlerts.map(alert => `
      <div class="flex items-center justify-between p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
        <div>
          <p class="font-semibold text-gray-800">${alert.medicineName}</p>
          <p class="text-sm text-gray-600">Stock: ${alert.currentStock} | Threshold: ${alert.reorderThreshold}</p>
        </div>
        <i class="fas fa-exclamation-triangle text-yellow-600 text-xl"></i>
      </div>
    `).join('');
  }
}

// Update dashboard metrics after checkout
function updateDashboardMetrics() {
  if (currentView === 'dashboard') {
    fetchDashboardMetrics();
  }
}

// Modify existing processBillingCheckout function
// Add this line after successful checkout:
updateDashboardMetrics();
```

---

#### Step 2.4: Wire Up Dashboard Tab Switching

**Modify `switchTab` function** to include dashboard:

```javascript
function switchTab(view) {
  currentView = view;
  
  // Reset all tabs
  [dashboardTab, medicinesTab, patientsTab, billingTab, suppliersTab, alertsTab].forEach(tab => {
    tab.classList.remove('text-indigo-600', 'border-b-2', 'border-indigo-600');
    tab.classList.add('text-gray-500');
  });
  
  // Hide all sections
  dashboardSection.classList.add('hidden');
  medicinesSection.classList.add('hidden');
  patientsSection.classList.add('hidden');
  billingSection.classList.add('hidden');
  suppliersSection.classList.add('hidden');
  alertsSection.classList.add('hidden');
  
  if (view === 'dashboard') {
    dashboardTab.classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600');
    dashboardTab.classList.remove('text-gray-500');
    dashboardSection.classList.remove('hidden');
    fetchDashboardMetrics();
  }
  // ... rest of tab cases
}

// Set dashboard as default on load
document.addEventListener('DOMContentLoaded', () => {
  fetchMedicines();
  setupEventListeners();
  switchTab('dashboard'); // Make dashboard default
});
```

---

## Testing Guide

### Manual Testing Checklist

1. **Server Startup**
   - [ ] Server starts without errors
   - [ ] Console shows "Session metrics initialized at: [timestamp]"
   - [ ] `/health` endpoint returns 200

2. **Dashboard Load**
   - [ ] Navigate to `http://localhost:3000`
   - [ ] Dashboard Overview tab is active by default
   - [ ] All metric widgets display "0" or "$0.00" initially
   - [ ] Near Expiry and Low Stock counts show actual inventory data

3. **Checkout Flow**
   - [ ] Navigate to Billing Counter tab
   - [ ] Add items to cart
   - [ ] Complete checkout
   - [ ] Switch back to Dashboard Overview
   - [ ] Revenue Today increased by checkout amount
   - [ ] Transactions Today incremented by 1
   - [ ] Top Sellers list shows purchased medicines

4. **Top Sellers Ranking**
   - [ ] Complete multiple checkouts with different medicines
   - [ ] Top Sellers list ranks by quantity sold
   - [ ] Ties broken by revenue, then alphabetically

5. **Low Stock Alerts**
   - [ ] Complete checkout that reduces medicine below threshold
   - [ ] Medicine appears in Low Stock Alerts section
   - [ ] Low Stock Count widget increments

6. **Analytics & Ledger** (if implemented)
   - [ ] Navigate to Analytics & Ledger tab
   - [ ] Summary metrics display correctly
   - [ ] Recent invoices show in reverse chronological order
   - [ ] Sales velocity calculates correctly

### API Testing with cURL

```bash
# Test dashboard metrics endpoint
curl http://localhost:3000/api/analytics/dashboard

# Test analytics summary endpoint
curl http://localhost:3000/api/analytics/summary

# Test top sellers endpoint with limit
curl http://localhost:3000/api/analytics/top-sellers?limit=5

# Test health check
curl http://localhost:3000/health
```

### Expected Response Examples

**Dashboard Metrics** (after 2 checkouts):
```json
{
  "success": true,
  "data": {
    "revenueToday": 125.50,
    "transactionsToday": 2,
    "nearExpiryCount": 3,
    "lowStockCount": 5,
    "lowStockAlerts": [...],
    "topSellers": [...]
  }
}
```

---

## Troubleshooting

### Issue: Dashboard shows $0.00 after checkout

**Cause**: Session metrics not recording transaction  
**Fix**: Verify `sessionMetrics.recordTransaction(invoice)` is called in `routes/billing.js` after invoice creation

### Issue: Top Sellers list empty

**Cause**: Sales map not updating  
**Fix**: Check that `invoice.items` array is properly structured with `medicine_id`, `medicine_name`, `quantity`, and `subtotal`

### Issue: Dashboard metrics reset unexpectedly

**Cause**: Server restarted (expected behavior for in-memory storage)  
**Note**: This is by design. Session metrics are ephemeral and reset on restart.

### Issue: Low Stock Count doesn't match medicines below threshold

**Cause**: Inventory data not refreshed  
**Fix**: Ensure `fetchMedicines()` is called to refresh inventory data after checkout

---

## Performance Validation

Run these checks to ensure performance targets are met:

1. **Dashboard Load Time**: Open browser DevTools Network tab, measure time to load dashboard (<2 seconds)
2. **Metric Update Time**: Complete checkout, measure time for dashboard widgets to update (<1 second)
3. **Memory Usage**: Monitor Node.js process memory after 100 transactions (<50MB increase expected)

---

## Next Steps

After completing this implementation:
1. Create tasks with `/sp.tasks` command
2. Implement Analytics & Ledger view (P3 user story)
3. Add visual chart for Top Sellers (P4 user story)
4. Consider adding integration tests for checkout → dashboard flow
5. Document session-based metrics behavior for end users

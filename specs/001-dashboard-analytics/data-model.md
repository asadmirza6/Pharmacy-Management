# Data Model: Dashboard Analytics Integration

**Feature**: 001-dashboard-analytics  
**Date**: 2026-06-27  
**Phase**: 1 (Design & Contracts)

## Overview

This document defines the data structures for session-based analytics tracking. All entities are stored in-memory and reset on server restart.

---

## Entity: SessionMetrics

**Purpose**: Tracks aggregate business metrics for the current server session.

**Storage**: In-memory singleton object in `data/session-metrics.js`

**Lifecycle**: Initialized on server startup, persists until server restart

### Schema

```javascript
{
  sessionStartTime: Date,           // Timestamp when server started
  totalRevenue: Number,             // Sum of all invoice amounts (in USD)
  transactionCount: Number,         // Count of completed invoices
  salesByMedicine: Map<String, {   // Medicine sales tracking (medicineId as key)
    medicineId: String,
    medicineName: String,
    quantitySold: Number,           // Total units sold
    revenue: Number                 // Total revenue from this medicine
  }>
}
```

### Validation Rules

- `totalRevenue` >= 0 (cannot be negative)
- `transactionCount` >= 0 (non-negative integer)
- `quantitySold` >= 0 for each medicine entry
- `revenue` >= 0 for each medicine entry
- `sessionStartTime` is immutable after initialization

### Operations

**Initialize**:
```javascript
function initializeSessionMetrics() {
  return {
    sessionStartTime: new Date(),
    totalRevenue: 0,
    transactionCount: 0,
    salesByMedicine: new Map()
  };
}
```

**Update on Checkout**:
```javascript
function recordTransaction(invoice) {
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
```

**Query Top Sellers**:
```javascript
function getTopSellers(limit = 10) {
  const salesArray = Array.from(sessionMetrics.salesByMedicine.values());
  return salesArray
    .sort((a, b) => {
      if (b.quantitySold !== a.quantitySold) return b.quantitySold - a.quantitySold;
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      return a.medicineName.localeCompare(b.medicineName);
    })
    .slice(0, limit);
}
```

---

## Entity: DashboardWidgetData (Computed)

**Purpose**: Real-time metrics displayed on Dashboard Overview tab.

**Storage**: Computed on-demand from SessionMetrics and existing data stores

**Lifecycle**: Ephemeral (recomputed for each request/render)

### Schema

```javascript
{
  revenueToday: Number,              // sessionMetrics.totalRevenue
  transactionsToday: Number,         // sessionMetrics.transactionCount
  nearExpiryCount: Number,           // Computed from medicines.getNearExpiryMedicines().length
  lowStockCount: Number,             // Computed from medicines.getLowStockMedicines().length
  lowStockAlerts: Array<{            // Medicines below reorder threshold
    medicineId: String,
    medicineName: String,
    currentStock: Number,
    reorderThreshold: Number
  }>,
  topSellers: Array<{                // Top 10 medicines by quantity sold
    medicineId: String,
    medicineName: String,
    quantitySold: Number,
    revenue: Number
  }>
}
```

### Computation Logic

**Dashboard Metrics Endpoint** (`GET /api/analytics/dashboard`):
```javascript
function computeDashboardMetrics() {
  const nearExpiryMeds = medicineData.getNearExpiryMedicines(30);
  const lowStockMeds = medicineData.getLowStockMedicines();
  
  return {
    revenueToday: sessionMetrics.totalRevenue,
    transactionsToday: sessionMetrics.transactionCount,
    nearExpiryCount: nearExpiryMeds.length,
    lowStockCount: lowStockMeds.length,
    lowStockAlerts: lowStockMeds.slice(0, 10).map(med => ({
      medicineId: med.id,
      medicineName: med.brand_name,
      currentStock: med.stock_quantity,
      reorderThreshold: med.reorder_threshold
    })),
    topSellers: getTopSellers(10)
  };
}
```

---

## Entity: AnalyticsSummary (Computed)

**Purpose**: Detailed analytics for Analytics & Ledger view.

**Storage**: Computed on-demand from invoices and SessionMetrics

**Lifecycle**: Ephemeral (recomputed for each request)

### Schema

```javascript
{
  totalRevenue: Number,              // sessionMetrics.totalRevenue
  totalTransactions: Number,         // sessionMetrics.transactionCount
  averageTransactionValue: Number,   // totalRevenue / transactionCount (or 0 if count is 0)
  salesVelocity: {                   // Transactions per time unit
    transactionsPerHour: Number,
    hoursSinceStart: Number
  },
  recentInvoices: Array<{            // Last 50 invoices
    invoiceId: String,
    invoiceNumber: String,
    timestamp: String,
    customerName: String,
    itemCount: Number,
    totalAmount: Number,
    paymentMethod: String,
    paymentStatus: String
  }>
}
```

### Computation Logic

**Analytics Summary Endpoint** (`GET /api/analytics/summary`):
```javascript
function computeAnalyticsSummary() {
  const invoices = invoiceData.getAllInvoices();
  const sessionDurationMs = Date.now() - sessionMetrics.sessionStartTime;
  const sessionHours = sessionDurationMs / (1000 * 60 * 60);
  
  return {
    totalRevenue: sessionMetrics.totalRevenue,
    totalTransactions: sessionMetrics.transactionCount,
    averageTransactionValue: sessionMetrics.transactionCount > 0 
      ? sessionMetrics.totalRevenue / sessionMetrics.transactionCount 
      : 0,
    salesVelocity: {
      transactionsPerHour: sessionHours > 0 
        ? sessionMetrics.transactionCount / sessionHours 
        : 0,
      hoursSinceStart: sessionHours
    },
    recentInvoices: invoices
      .slice(-50)
      .reverse()
      .map(inv => ({
        invoiceId: inv.id,
        invoiceNumber: inv.invoice_number,
        timestamp: inv.timestamp,
        customerName: inv.customer_name || 'Walk-in Customer',
        itemCount: inv.items.length,
        totalAmount: inv.total_amount,
        paymentMethod: inv.payment_method,
        paymentStatus: inv.payment_status
      }))
  };
}
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  User Action: Complete Checkout at Billing Counter         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  POST /api/billing/checkout                                 │
│  - Validate items                                           │
│  - Deduct inventory (existing logic)                        │
│  - Create invoice (existing logic)                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  sessionMetrics.recordTransaction(invoice)   [NEW HOOK]     │
│  - Increment totalRevenue                                   │
│  - Increment transactionCount                               │
│  - Update salesByMedicine Map                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Return invoice to frontend                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend: updateDashboardMetrics()          [NEW FUNCTION] │
│  - Update revenue/transaction widgets                       │
│  - Refresh low stock/expiry counts                          │
│  - Update top sellers list                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  User Action: View Dashboard Overview Tab                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  GET /api/analytics/dashboard                                │
│  - Read sessionMetrics                                       │
│  - Compute near expiry count                                 │
│  - Compute low stock count                                   │
│  - Get top sellers (sorted)                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Render Dashboard Overview UI                                │
│  - Display metric widgets                                    │
│  - Display top sellers list                                  │
│  - Display alert counts                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Relationships to Existing Entities

### Reads From (No Modifications)

**Medicine** (from `data/medicines.js`):
- Dashboard reads `getNearExpiryMedicines()` for expiry count
- Dashboard reads `getLowStockMedicines()` for stock alerts
- No write operations to medicine data

**Invoice** (from `data/invoices.js`):
- Analytics reads `getAllInvoices()` for transaction history
- SessionMetrics tracks aggregates from invoices but doesn't modify invoice records
- Single source of truth: Invoice entity

### Writes To

**SessionMetrics** (new entity in `data/session-metrics.js`):
- Updated by billing checkout hook after invoice creation
- Read by dashboard and analytics endpoints
- Never written by frontend (write-only from backend)

---

## Performance Considerations

### Memory Footprint

**SessionMetrics**:
- Base object: ~100 bytes
- Per-medicine entry: ~150 bytes (string keys + object)
- Typical session (200 medicines sold): ~30KB
- Maximum expected (1000 medicines): ~150KB

**Total**: Well within acceptable limits (<1MB for typical day of operations)

### Query Performance

| Operation | Complexity | Expected Time |
|-----------|------------|---------------|
| Record transaction | O(k) where k = items in invoice | < 1ms |
| Get top sellers | O(n log n) where n = medicines sold | < 10ms (n<100) |
| Compute dashboard metrics | O(m) where m = total medicines | < 50ms (m<5000) |
| Get analytics summary | O(i) where i = invoice count | < 10ms (i<1000) |

All operations meet performance targets (< 1 second for user-facing operations).

---

## Migration & Initialization

### Server Startup

```javascript
// server.js
const sessionMetrics = require('./data/session-metrics');

// Initialize session metrics on startup
sessionMetrics.initialize();

console.log('Session metrics initialized at:', sessionMetrics.getStartTime());
```

### No Database Schema Changes

This feature requires **zero database migrations**. All data structures are in-memory only.

### Backward Compatibility

- Existing API endpoints unchanged
- Existing data stores (medicines, invoices) read-only from dashboard perspective
- Feature can be disabled by not mounting analytics routes (degrades gracefully)

---

## Testing Considerations

### Unit Tests (Recommended)

```javascript
// Test sessionMetrics.recordTransaction
test('records transaction and updates revenue', () => {
  const invoice = { total_amount: 100, items: [...] };
  sessionMetrics.recordTransaction(invoice);
  expect(sessionMetrics.getTotalRevenue()).toBe(100);
  expect(sessionMetrics.getTransactionCount()).toBe(1);
});

// Test top sellers ranking
test('ranks medicines by quantity, then revenue, then name', () => {
  // Add sales data
  const topSellers = sessionMetrics.getTopSellers(5);
  expect(topSellers[0].quantitySold).toBeGreaterThanOrEqual(topSellers[1].quantitySold);
});
```

### Integration Tests (Recommended)

```javascript
// Test end-to-end checkout → dashboard update flow
test('dashboard metrics update after checkout', async () => {
  const initialRevenue = await getDashboardMetrics().revenueToday;
  await postCheckout(sampleCheckoutData);
  const updatedRevenue = await getDashboardMetrics().revenueToday;
  expect(updatedRevenue).toBeGreaterThan(initialRevenue);
});
```

---

## Security Considerations

### Data Access

- SessionMetrics is read-only from frontend (no direct mutation endpoints exposed)
- All writes go through authenticated billing endpoints (future: add RBAC)
- No sensitive data in SessionMetrics (aggregates only, no customer PII)

### Input Validation

- Invoice data already validated by billing endpoint before reaching SessionMetrics
- No user input directly affects SessionMetrics (calculated from validated invoices)

---

## Future Enhancements (Out of Scope)

- Persist session metrics to database for historical trend analysis
- Add date range filtering for analytics queries
- Export analytics reports to CSV/PDF
- Real-time dashboard updates via WebSocket
- Multi-day/weekly/monthly aggregations

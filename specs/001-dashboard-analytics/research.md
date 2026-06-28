# Research: Dashboard Analytics Integration

**Feature**: 001-dashboard-analytics  
**Date**: 2026-06-27  
**Phase**: 0 (Research & Decision-Making)

## Overview

This document consolidates architectural research and decisions for the Dashboard Analytics Integration feature. All decisions prioritize simplicity, performance, and alignment with the existing codebase patterns.

## R1: In-Memory Session Metrics Architecture

### Question
What's the optimal data structure for tracking session-based sales metrics (revenue, transaction count, top sellers) with O(1) updates and minimal memory footprint?

### Decision
Use a singleton module pattern with three core structures:
1. **Scalar counters**: `totalRevenue`, `transactionCount` - simple number accumulation
2. **Map for per-medicine sales**: `{ medicineId: { quantity, revenue, name } }`
3. **Session start timestamp** for velocity calculations

### Rationale
- JavaScript Map provides O(1) insert/update for medicine sales tracking
- Singleton pattern ensures single source of truth across all requests
- Minimal memory footprint: ~1KB per 100 medicines with sales data
- No database I/O overhead (pure in-memory operations)
- Thread-safe for Node.js single-threaded event loop

### Alternatives Considered
- **Database-backed metrics**: Rejected due to performance overhead and requirement for in-memory operation
- **Array-based tracking**: Rejected due to O(n) search cost for medicine updates
- **Redis cache**: Rejected as over-engineered for single-server deployment

### Implementation Note
Initialize on server startup in server.js, reset only on server restart (matches session-based requirement).

---

## R2: Real-Time Dashboard Update Mechanism

### Question
How should the frontend dashboard receive updates when a checkout completes? Options: polling, WebSocket, direct function call, event emitter?

### Decision
**Direct JavaScript function call** from checkout success handler.

### Rationale
- Simplest implementation (no server infrastructure changes)
- Immediate update (no polling delay)
- Frontend already uses async/await pattern for API calls
- Single-page application structure supports direct function invocation
- Zero network overhead for updates (data already in response)

### Implementation Pattern
```javascript
async function processBillingCheckout() {
  const result = await fetch('/api/billing/checkout', {...});
  if (result.success) {
    updateDashboardMetrics(result.data); // Direct call
    refreshInventoryWidgets(); // Refresh low stock/expiry counts
  }
}
```

### Alternatives Considered
- **WebSocket**: Rejected as over-engineered for single-user session context
- **Server-Sent Events (SSE)**: Rejected as unnecessary for request-response workflow
- **Polling**: Rejected due to unnecessary network traffic and latency (1-5 second delay)
- **Event emitter**: Rejected as adds complexity without benefit in SPA context

---

## R3: Top Sellers Ranking Algorithm

### Question
What algorithm should rank medicines by sales performance? Primary metric: quantity or revenue? How to handle ties?

### Decision
Rank by:
1. **Primary**: Total quantity sold (descending)
2. **Secondary**: Total revenue (descending, tiebreaker)
3. **Tertiary**: Alphabetical by medicine name (deterministic ordering)

### Rationale
- Quantity reflects inventory velocity (more operationally relevant than revenue for restocking decisions)
- Revenue tiebreaker handles equal quantities (higher-value items ranked higher)
- Alphabetical ensures deterministic, reproducible ordering
- Complexity: O(n log n) where n = unique medicines sold (typically < 100 per session)

### Implementation
```javascript
function getTopSellers(limit = 10) {
  const salesArray = Array.from(salesMap.values());
  return salesArray
    .sort((a, b) => {
      if (b.quantity !== a.quantity) return b.quantity - a.quantity;
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}
```

### Alternatives Considered
- **Revenue-first ranking**: Rejected as less useful for inventory planning (a few high-value items would dominate)
- **Most recent sales**: Rejected as time-based metric wasn't specified in requirements
- **Frequency (transaction count)**: Rejected as less meaningful than total quantity

---

## R4: Analytics & Ledger Data Source

### Question
Should Analytics & Ledger read directly from data/invoices.js or maintain separate aggregated store?

### Decision
**Read directly from data/invoices.js** with on-demand aggregation.

### Rationale
- Single source of truth (invoices array in data/invoices.js)
- No data synchronization complexity or staleness risk
- Aggregations (avg transaction value, velocity) are cheap: O(n) over invoices array
- Invoice count typically < 1000 per session (computation < 10ms)
- Simpler debugging and maintenance

### Implementation
Analytics API endpoint computes metrics on-demand:
```javascript
router.get('/analytics/summary', (req, res) => {
  const invoices = invoiceData.getAllInvoices();
  const summary = {
    totalRevenue: invoices.reduce((sum, inv) => sum + inv.total_amount, 0),
    totalTransactions: invoices.length,
    avgTransactionValue: invoices.length ? totalRevenue / invoices.length : 0,
    salesVelocity: calculateVelocity(invoices, sessionStartTime)
  };
  res.json({ success: true, data: summary });
});
```

### Alternatives Considered
- **Pre-aggregated cache**: Rejected as premature optimization (invoice volume low, computation fast)
- **Separate ledger store**: Rejected due to synchronization complexity and potential data inconsistency

---

## R5: Dashboard as Default Landing Page

### Question
How to make Dashboard Overview the default active tab on page load?

### Decision
Modify tab initialization in `public/index.html` to:
1. Reorder tab buttons (Dashboard Overview first)
2. Call `switchTab('dashboard')` on DOMContentLoaded
3. Fetch dashboard metrics immediately

### Rationale
- Existing tab switching logic already implemented (switchTab function)
- Minimal code change: reorder HTML elements, update initialization
- Preserves existing tab state management and event handling
- No URL routing complexity

### Implementation
```javascript
document.addEventListener('DOMContentLoaded', () => {
  fetchMedicines(); // Keep existing data load for inventory widgets
  setupEventListeners();
  fetchDashboardMetrics(); // NEW: Load dashboard data
  switchTab('dashboard'); // NEW: Set default tab
});
```

### Alternatives Considered
- **CSS-only default**: Rejected as tab logic requires JavaScript initialization and data fetching
- **URL routing (hash-based)**: Rejected as overkill for single-page tab navigation
- **localStorage persistence**: Rejected as spec requires dashboard as default, not "last viewed tab"

---

## Technology Stack Summary

### No New Dependencies Required
All feature requirements satisfied with existing stack:
- **Backend**: Node.js, Express.js (existing)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3 (existing)
- **UI Framework**: Tailwind CSS (existing)
- **Icons**: Font Awesome (existing)
- **Storage**: In-memory JavaScript objects/Maps (native)

### Performance Characteristics
- **Dashboard load**: < 500ms (pure in-memory reads)
- **Metric updates**: < 50ms (Map insert + counter increment)
- **Top sellers computation**: < 10ms for 100 medicines (sort operation)
- **Analytics aggregation**: < 10ms for 1000 invoices (array reduce)

All performance targets well within constitution requirements (< 1 second updates, < 2 second page load).

---

## Architecture Principles Applied

### Simplicity First
- No external libraries or services added
- Direct function calls over event-driven complexity
- On-demand computation over caching layers
- Single source of truth (existing data stores)

### Performance by Design
- O(1) metric updates via Map data structure
- Minimal memory footprint (~1KB per 100 sales records)
- No blocking database queries
- Async/await for non-blocking API calls

### Maintainability
- Clear module boundaries (services/analytics-tracker.js, routes/analytics.js)
- No tight coupling (dashboard reads, doesn't write to other modules)
- Easy to test (pure functions for aggregations)
- Simple to extend (add new metrics by updating tracker)

---

## Risk Assessment

### Low Risk
- In-memory storage compatible with existing architecture
- No changes to critical billing/inventory logic
- Purely additive feature (no existing functionality modified beyond hooks)

### Mitigation Strategies
- **Memory leak risk**: Limit sales map to reasonable size (monitor in production, add cleanup if needed)
- **Performance degradation**: Cap top sellers list at 50 items max (prevent unbounded sorts)
- **Data loss on restart**: Document session-based nature clearly in UI ("Today" = current session)

---

## Next Steps (Phase 1)

With all research decisions finalized, proceed to Phase 1 design artifacts:
1. **data-model.md**: Define session metrics data structure
2. **contracts/analytics-api.yaml**: Document API endpoints for dashboard/analytics
3. **quickstart.md**: Developer setup and testing guide

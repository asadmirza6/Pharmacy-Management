# Research: Pharmacy Core Integration

**Feature**: 001-pharmacy-core-integration  
**Date**: 2026-06-23  
**Status**: Complete

## Overview

This document captures research findings for technical unknowns identified during planning. All decisions made support the integration of billing, supplier management, expiry tracking, and notification features into the existing mock pharmacy system.

## Research Topics

### 1. Expiry Date Calculation and Severity Classification

**Question**: How to calculate days until expiry and categorize severity for alerting?

**Research Findings**:
- JavaScript Date arithmetic provides sufficient precision for day-level calculations
- Pharmacy industry standard: 30-day threshold for near-expiry warnings
- Multi-tier severity aligns with actionable timeframes (critical=7 days, high=14, medium=30)

**Decision**: Implement pure JavaScript date calculations with three severity tiers

**Rationale**: 
- No external libraries needed for simple date math
- Severity tiers match pharmacy operational needs (7 days = urgent action required, 14 days = plan promotion/return, 30 days = monitoring)
- Aligns with constitution principle V (30-60 day configurable threshold)

**Alternatives Considered**:
- moment.js or date-fns libraries → Rejected: unnecessary dependency for simple calculations
- Single severity level → Rejected: doesn't provide actionable granularity

**Implementation Pattern**:
```javascript
function getDaysUntilExpiry(expiryDateString) {
  const expiry = new Date(expiryDateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}
```

---

### 2. Inventory Statistics Computation Strategy

**Question**: What statistics to compute and how to calculate efficiently at scale?

**Research Findings**:
- Mock system has <100 items; in-memory reduce operations complete in <1ms
- Real pharmacy systems: 1,000-10,000 SKUs typical
- Array.reduce() benchmarks: 10,000 items in ~5ms on modern hardware

**Decision**: On-demand calculation using array reduce operations, no caching

**Rationale**:
- In-memory operations meet performance goals (<200ms API response)
- Real-time accuracy more important than microsecond optimization for mock system
- Caching adds complexity without measurable benefit at this scale

**Alternatives Considered**:
- Pre-computed statistics with cache invalidation → Rejected: premature optimization
- Database aggregate queries → Rejected: no database in current architecture

**Statistics to Compute**:
1. Total inventory items (sum of stock_quantity)
2. Total inventory value (sum of stock_quantity × cost_price)
3. Near-expiry count (items expiring within threshold)
4. Low stock count (stock_quantity ≤ reorder_threshold)
5. Total product types (array length)

---

### 3. Invoice/Transaction Data Structure

**Question**: What fields must an invoice contain to satisfy audit and traceability requirements?

**Research Findings**:
- Constitution I requires: timestamp, user, quantity for all transactions
- Spec FR-008 requires: timestamp, items, quantities, unit prices, total amount
- Pharmacy regulatory standards: batch traceability for recalled products

**Decision**: Immutable invoice records with nested item array structure

**Invoice Structure**:
```javascript
{
  id: "uuid-v4",
  timestamp: "2026-06-23T10:30:45.123Z",
  items: [
    {
      medicine_id: "uuid",
      medicine_name: "Paracetamol 500mg",
      batch_number: "B2024-001",
      quantity: 2,
      unit_price: 8.50,
      subtotal: 17.00
    }
  ],
  total_amount: 34.50,
  payment_status: "completed",
  customer_name: "Walk-in Customer",
  served_by: "system"  // placeholder until auth implemented
}
```

**Rationale**:
- Nested items array keeps related data together
- Denormalized medicine details (name, batch) ensure audit trail even if medicine record changes
- Immutable records (no updates, only inserts) satisfy audit requirements

**Alternatives Considered**:
- Separate invoices and invoice_items tables → Rejected: unnecessary for in-memory mock
- Reference-only (store medicine_id without details) → Rejected: breaks audit trail if medicine deleted

---

### 4. Stock Validation and Atomic Deduction Pattern

**Question**: How to prevent overselling when multiple validation checks occur?

**Research Findings**:
- Race conditions possible if validation and deduction are separate operations
- In-memory single-threaded architecture: validation + deduction in same function is atomic
- Database equivalent: transaction with SELECT FOR UPDATE or optimistic locking

**Decision**: Two-phase commit pattern (validate-all, then deduct-all)

**Implementation Pattern**:
```javascript
function processSale(items) {
  // Phase 1: Validate ALL items (fail-fast)
  const validations = items.map(item => {
    const medicine = getMedicineById(item.medicine_id);
    if (!medicine) throw new Error(`Medicine ${item.medicine_id} not found`);
    if (medicine.stock_quantity < item.quantity) {
      throw new Error(`Insufficient stock: ${medicine.brand_name} (available: ${medicine.stock_quantity}, requested: ${item.quantity})`);
    }
    return { medicine, item };
  });

  // Phase 2: Deduct all items (only if all validations passed)
  validations.forEach(({ medicine, item }) => {
    updateMedicine(medicine.id, {
      stock_quantity: medicine.stock_quantity - item.quantity
    });
  });

  // Phase 3: Create invoice
  return createInvoice(items);
}
```

**Rationale**:
- Validates all items before any deductions (prevents partial sales on validation failure)
- Single-threaded in-memory execution guarantees atomicity
- Satisfies constitution I (data integrity) and spec FR-006 (stock validation)

**Alternatives Considered**:
- Validate-and-deduct per item → Rejected: creates partial sales if later item fails validation
- Rollback mechanism → Rejected: unnecessary complexity for single-threaded operation

---

### 5. Frontend Tab Navigation Architecture

**Question**: How to implement multi-view dashboard without SPA framework?

**Research Findings**:
- Existing codebase uses vanilla JavaScript + Tailwind CSS
- User requirement: "keep code clean, modular, and concise"
- React/Vue would add 100KB+ bundle size and build complexity

**Decision**: CSS visibility toggling with JavaScript show/hide functions

**Implementation Pattern**:
```javascript
function showTab(tabName) {
  // Hide all tab content
  document.querySelectorAll('.tab-content').forEach(el => {
    el.classList.add('hidden');
  });
  
  // Remove active state from all buttons
  document.querySelectorAll('.tab-btn').forEach(el => {
    el.classList.remove('active');
  });
  
  // Show selected tab
  document.getElementById(tabName + '-view').classList.remove('hidden');
  
  // Mark button as active
  event.target.classList.add('active');
  
  // Refresh data for active tab
  refreshTabData(tabName);
}

function refreshTabData(tabName) {
  switch(tabName) {
    case 'inventory': fetchInventory(); break;
    case 'billing': /* billing counter is input form, no fetch needed */; break;
    case 'suppliers': fetchSuppliers(); break;
    case 'alerts': fetchAlerts(); break;
  }
}
```

**Rationale**:
- Zero additional dependencies
- Maintains single-file simplicity
- Each tab can fetch fresh data when activated
- Familiar pattern for developers

**Alternatives Considered**:
- Separate HTML pages with navigation → Rejected: full page reloads, state loss
- React/Vue SPA → Rejected: adds complexity, build tooling, learning curve
- Web Components → Rejected: browser support concerns for older environments

---

### 6. Alert Aggregation Strategy

**Question**: How to collect alerts from multiple sources (expiry, low stock, billing errors)?

**Research Findings**:
- Alerts are computed, not persisted (per spec: computed entities)
- Three alert sources: near-expiry medicines, low stock items, recent transaction errors (future)
- UI displays by category with severity indicators

**Decision**: Compute alerts on-demand by aggregating from source data stores

**Implementation Pattern**:
```javascript
function getAllAlerts() {
  const alerts = [];
  
  // Expiry alerts
  getNearExpiryMedicines(30).forEach(med => {
    const days = getDaysUntilExpiry(med.expiry_date);
    alerts.push({
      id: `expiry-${med.id}`,
      type: 'expiry',
      severity: getSeverity(days),
      message: `${med.brand_name} expires in ${days} days`,
      timestamp: new Date().toISOString(),
      medicine_id: med.id
    });
  });
  
  // Low stock alerts
  getLowStockMedicines().forEach(med => {
    alerts.push({
      id: `stock-${med.id}`,
      type: 'low_stock',
      severity: 'medium',
      message: `${med.brand_name} below reorder threshold (${med.stock_quantity} left)`,
      timestamp: new Date().toISOString(),
      medicine_id: med.id
    });
  });
  
  return alerts.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}
```

**Rationale**:
- Single source of truth (medicine data) for alert generation
- Severity-sorted presentation helps prioritize actions
- No stale alert data (always reflects current state)

**Alternatives Considered**:
- Persistent alert records with acknowledgment → Rejected: adds complexity, out of MVP scope
- WebSocket push notifications → Rejected: overkill for mock system, requires infrastructure

---

## Summary of Decisions

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Expiry Calculation | JavaScript Date arithmetic with 3 severity tiers | Simple, no dependencies, actionable granularity |
| Statistics | On-demand array reduce, no caching | Meets performance goals, real-time accuracy |
| Invoice Structure | Immutable nested records with denormalized details | Audit trail integrity, constitution compliance |
| Stock Validation | Two-phase validate-all-then-commit | Prevents partial sales, data integrity |
| Tab Navigation | CSS visibility toggle with vanilla JS | Zero dependencies, maintains simplicity |
| Alert Aggregation | On-demand computation from source data | No stale data, single source of truth |

## Implementation Readiness

All technical unknowns resolved. No external dependencies required beyond existing package.json. Ready to proceed with Phase 1 design artifacts (data model, API contracts, quickstart guide).

**Next Steps**: Generate data-model.md and API contract specifications.

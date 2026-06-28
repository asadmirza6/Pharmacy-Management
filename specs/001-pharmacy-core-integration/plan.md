# Implementation Plan: Pharmacy Core Integration

**Branch**: `001-pharmacy-core-integration` | **Date**: 2026-06-23 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-pharmacy-core-integration/spec.md`

## Summary

Extend the existing pharmacy management system with core operational features: near-expiry tracking, supplier directory management, customer billing/checkout processing, and unified notification dashboard. This builds upon the existing Express.js REST API and HTML/Tailwind CSS frontend by adding three new backend routes and four new frontend dashboard views while maintaining in-memory mock data architecture.

## Technical Context

**Language/Version**: Node.js (v18+) / JavaScript ES6+  
**Primary Dependencies**: Express 5.2.1, UUID 14.0.1, Body-Parser 2.3.0, CORS 2.8.6  
**Storage**: In-memory mock data (medicines.js currently exists, will add suppliers/invoices)  
**Testing**: Jest 29.0.0 with Supertest 6.0.0 for API integration tests  
**Target Platform**: Web application (backend API + static frontend served by Express)  
**Project Type**: Web (backend + frontend split within same repository)  
**Performance Goals**: 
- Billing operations: < 1 second end-to-end (spec SC-001: 60 seconds total)
- API response time: < 200ms (constitution: < 1 second for billing)
- Dashboard load: < 2 seconds with all modules rendered
- Real-time inventory updates without manual refresh (spec SC-005)

**Constraints**: 
- In-memory data only (no persistent database yet - future work)
- Single-user operation (no concurrency controls in this phase)
- Mock/demo data sufficient for MVP demonstration
- All monetary values in local currency with 2 decimal precision

**Scale/Scope**: 
- 5-10 mock medicines in inventory
- 3-5 mock suppliers
- 10-20 mock transactions for demo purposes
- Single pharmacy location
- 3-5 concurrent API endpoints per module (medicines, suppliers, billing)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Data Integrity & Financial Accuracy ✅ COMPLIANT

- **Requirement**: Inventory transactions must maintain accuracy and traceability with timestamps, user, batch, quantity
- **Implementation**: Billing route will create immutable invoice records with full transaction details (timestamp, items, quantities, prices, totals). Inventory deduction uses atomic in-memory operations with immediate consistency checks (quantity validation before sale).
- **Status**: Compliant - invoice generation includes full audit trail; stock validation prevents overselling (FR-006, FR-009)

### II. Performance-First Architecture ✅ COMPLIANT

- **Requirement**: Response times < 1 second for billing; real-time dashboard updates without blocking
- **Implementation**: In-memory data operations guarantee sub-100ms response times. Dashboard uses async fetch API calls that don't block UI. Statistics computed on-demand from in-memory arrays (simple filter/reduce operations).
- **Status**: Compliant - in-memory architecture exceeds performance requirements; no database query latency

### III. Security & Role-Based Access Control ⚠️ ACKNOWLEDGED GAP

- **Requirement**: Authentication required, RBAC with audit logging for sensitive operations
- **Implementation**: Authentication/authorization explicitly out of scope for this feature (spec Assumptions). System assumes application-level auth exists. No user management or access control in this feature.
- **Status**: Gap acknowledged - spec explicitly states "Authentication and role-based access control exist at the application level (not part of this feature)". Future work required.
- **Mitigation**: All API endpoints are currently unprotected. Document this as known limitation in quickstart.md. Add TODO comments in code for future auth integration points.

### IV. Offline-First with Cloud Synchronization ⚠️ NOT APPLICABLE

- **Requirement**: Support offline operation with sync when connectivity restores
- **Implementation**: Not applicable - current architecture is single-instance web server with in-memory data. No offline/sync requirements in spec.
- **Status**: Not applicable to this phase - in-memory architecture doesn't support distributed sync

### V. Proactive Alerting & Expiry Management ✅ COMPLIANT

- **Requirement**: Auto-generate alerts for expiry (30-60 days), low stock, payments; block expired medicine sales
- **Implementation**: 
  - medicines.js will add `getNearExpiryMedicines(threshold)` function filtering by expiry_date
  - Statistics endpoint computes near-expiry count dynamically
  - Notifications dashboard aggregates alerts from multiple sources (expiry, low stock)
  - Frontend displays visual severity indicators (constitution mentions flagging; spec SC-003 requires automatic identification)
- **Status**: Compliant - implements required alerting (FR-001, FR-002, FR-011, FR-012)

### VI. Test-Driven Development (TDD) ✅ COMPLIANT

- **Requirement**: Test-first methodology with 100% coverage for billing, inventory, expiry calculations
- **Implementation**: 
  - Phase 2 (/sp.tasks) will generate test cases from acceptance scenarios before implementation
  - Jest + Supertest infrastructure already configured (package.json)
  - Critical areas to test: billing calculations, inventory deduction, stock validation, expiry date filtering
- **Status**: Compliant - TDD workflow will be followed in tasks phase per constitution VI

### VII. Modular Architecture with Clear Boundaries ✅ COMPLIANT

- **Requirement**: Four independent modules (Inventory, POS/Billing, Supplier, User/Auth) with clear APIs
- **Implementation**: 
  - Existing: `routes/medicines.js` (Inventory module) with clean REST API
  - New: `routes/billing.js` (POS module) - independent route with own data store (invoices array)
  - New: `routes/suppliers.js` (Supplier module) - independent route with own data store (suppliers array)
  - User/Auth: Out of scope (acknowledged gap in principle III)
  - Cross-module: Billing reads from medicines.js via module import; updates inventory via function calls
- **Status**: Compliant - maintains separation of concerns with clear module boundaries

**Constitution Compliance Summary**: 5/7 compliant, 2 acknowledged gaps (auth out of scope per spec, offline not applicable to architecture)

## Project Structure

### Documentation (this feature)

```text
specs/001-pharmacy-core-integration/
├── plan.md              # This file (/sp.plan command output)
├── research.md          # Phase 0 output (/sp.plan command)
├── data-model.md        # Phase 1 output (/sp.plan command)
├── quickstart.md        # Phase 1 output (/sp.plan command)
├── contracts/           # Phase 1 output (/sp.plan command)
│   ├── suppliers.openapi.yml
│   ├── billing.openapi.yml
│   └── statistics.openapi.yml
└── tasks.md             # Phase 2 output (/sp.tasks command - NOT created by /sp.plan)
```

### Source Code (repository root)

```text
# Web application structure (backend + frontend)

backend (root-level):
├── data/
│   ├── medicines.js      # EXISTING - will enhance with statistics functions
│   ├── suppliers.js      # NEW - supplier directory mock data
│   └── invoices.js       # NEW - billing transaction records
├── routes/
│   ├── medicines.js      # EXISTING - inventory management API
│   ├── patients.js       # EXISTING - patient records API
│   ├── suppliers.js      # NEW - supplier directory API
│   └── billing.js        # NEW - checkout/billing API
├── services/
│   └── db.js             # EXISTING - database connection (currently unused)
├── middleware/
│   └── errorHandler.js   # EXISTING - error handling middleware
├── server.js             # EXISTING - main Express server (will mount new routes)
└── package.json          # EXISTING - dependencies already configured

frontend (public/):
├── index.html            # EXISTING - will add tab navigation and new views
└── [future: separate CSS/JS if needed]

tests/ (root-level):
├── integration/
│   ├── medicines.test.js      # EXISTING (may exist)
│   ├── suppliers.test.js      # NEW - supplier API tests
│   └── billing.test.js        # NEW - billing API tests
└── unit/
    ├── medicines.data.test.js # NEW - medicine data functions
    └── statistics.test.js     # NEW - statistics calculation tests
```

**Structure Decision**: Maintaining existing flat structure with root-level backend code and `public/` for frontend. This matches the current single-repository web application pattern already established. Backend routes are modular (per constitution VII) but share the Express server instance. Frontend is currently a single HTML file; will add tab-based views inline rather than separate pages to maintain simplicity for mock system.

## Complexity Tracking

No constitution violations requiring justification. All acknowledged gaps (auth, offline) are explicitly out of scope per feature specification.

## Phase 0: Research & Unknowns Resolution

### Research Topics

#### 1. Expiry Date Calculation Logic

**Question**: How to calculate "days until expiry" and categorize severity levels?

**Decision**: Use ISO 8601 date strings (already in mock data) and JavaScript Date arithmetic.

**Implementation Approach**:
```javascript
function getDaysUntilExpiry(expiryDateString) {
  const expiry = new Date(expiryDateString);
  const today = new Date();
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function getNearExpiryMedicines(threshold = 30) {
  return medicines.filter(m => {
    const days = getDaysUntilExpiry(m.expiry_date);
    return days > 0 && days <= threshold;
  });
}

function getSeverity(daysUntilExpiry) {
  if (daysUntilExpiry <= 7) return 'critical';
  if (daysUntilExpiry <= 14) return 'high';
  if (daysUntilExpiry <= 30) return 'medium';
  return 'low';
}
```

**Rationale**: Standard date arithmetic in JavaScript; severity tiers align with pharmacy best practices (7-day critical threshold for urgent action).

#### 2. Inventory Statistics Computation

**Question**: What global statistics to compute and how to calculate efficiently?

**Decision**: Compute on-demand using array reduce operations:
- Total inventory value: `sum(stock_quantity * cost_price)` for all medicines
- Total item count: `sum(stock_quantity)` 
- Near-expiry count: `count(medicines where days_until_expiry <= 30)`
- Low stock count: `count(medicines where stock_quantity <= reorder_threshold)`

**Implementation Approach**:
```javascript
function getInventoryStatistics() {
  const all = medicines;
  return {
    totalItems: all.reduce((sum, m) => sum + m.stock_quantity, 0),
    totalValue: all.reduce((sum, m) => sum + (m.stock_quantity * m.cost_price), 0).toFixed(2),
    nearExpiryCount: getNearExpiryMedicines(30).length,
    lowStockCount: all.filter(m => m.stock_quantity <= m.reorder_threshold).length,
    totalProducts: all.length
  };
}
```

**Rationale**: In-memory operations are fast (<10ms for 1000 items). No caching needed for mock data scale.

#### 3. Billing Transaction Structure

**Question**: What fields must an invoice record contain to satisfy audit requirements?

**Decision**: Based on constitution I (traceability) and spec FR-008:
```javascript
{
  id: uuid(),
  timestamp: new Date().toISOString(),
  items: [
    {
      medicine_id: "uuid",
      medicine_name: "Paracetamol 500mg",
      quantity: 2,
      unit_price: 8.50,
      subtotal: 17.00
    }
  ],
  total_amount: 17.00,
  payment_status: "completed",
  customer_name: "Walk-in Customer", // optional
  served_by: "system" // placeholder for future auth
}
```

**Rationale**: Includes all fields from FR-008 (timestamp, items, quantities, prices, total). Immutable records support audit trail (constitution I).

#### 4. Stock Validation Strategy

**Question**: How to prevent race conditions when checking stock vs. deducting stock?

**Decision**: For single-user in-memory system, validate and deduct atomically in same function:
```javascript
function processSale(items) {
  // Step 1: Validate ALL items first (fail-fast)
  for (const item of items) {
    const medicine = getMedicineById(item.medicine_id);
    if (!medicine || medicine.stock_quantity < item.quantity) {
      throw new Error(`Insufficient stock for ${medicine?.brand_name || item.medicine_id}`);
    }
  }
  
  // Step 2: Deduct all items (only if validation passed)
  for (const item of items) {
    updateMedicine(item.medicine_id, {
      stock_quantity: medicines.find(m => m.id === item.medicine_id).stock_quantity - item.quantity
    });
  }
  
  // Step 3: Create invoice
  return createInvoice(items);
}
```

**Rationale**: Two-phase approach (validate-all-then-commit) prevents partial sales on validation failure. Constitution I requires transaction integrity; this pattern ensures atomicity for in-memory operations.

**Alternative Considered**: Database transactions with ACID guarantees. Rejected because current architecture uses in-memory data without persistence layer.

#### 5. Frontend Tab Navigation Pattern

**Question**: How to structure multi-tab dashboard without separate pages?

**Decision**: Single-page application (SPA) pattern with CSS visibility toggling:
- All tab content divs present in HTML
- JavaScript toggles `hidden` class based on active tab
- Tailwind CSS utility classes for styling
- Tab buttons trigger `showTab(tabName)` function

**Implementation Approach**:
```html
<div class="tabs">
  <button onclick="showTab('inventory')" class="tab-btn active">Inventory</button>
  <button onclick="showTab('billing')" class="tab-btn">Billing</button>
  <button onclick="showTab('suppliers')" class="tab-btn">Suppliers</button>
  <button onclick="showTab('alerts')" class="tab-btn">Notifications</button>
</div>

<div id="inventory-view" class="tab-content">...</div>
<div id="billing-view" class="tab-content hidden">...</div>
<div id="suppliers-view" class="tab-content hidden">...</div>
<div id="alerts-view" class="tab-content hidden">...</div>

<script>
function showTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(tabName + '-view').classList.remove('hidden');
  event.target.classList.add('active');
}
</script>
```

**Rationale**: Simple, no routing library needed, maintains single-file simplicity for mock system. Aligns with user's directive to "keep code clean, modular, and concise."

**Alternative Considered**: React/Vue for component-based tabs. Rejected due to project constraint (plain HTML/Tailwind CSS established pattern).

### Research Summary

All technical unknowns resolved through decisions above. No external research needed - leveraging existing JavaScript/Express patterns and pharmacy domain knowledge. Ready for Phase 1 design.

## Phase 1 Design Tasks

### Task 1.1: Data Model Design

**Deliverable**: `data-model.md` documenting all entities

**Entities to Define**:
1. Medicine (existing - document current structure)
2. Supplier (new)
3. Invoice (new)
4. InvoiceItem (new - nested in Invoice)
5. Alert (computed - not persisted)
6. Statistics (computed - not persisted)

**Key Relationships**:
- Medicine → Supplier (many-to-one via supplier_id)
- Invoice → InvoiceItem (one-to-many nested array)
- InvoiceItem → Medicine (references medicine_id)

**Validation Rules** (from spec requirements):
- Medicine.stock_quantity: integer >= 0
- Medicine.cost_price, selling_price: decimal >= 0.00, precision 2
- Invoice.items: array, min length 1
- InvoiceItem.quantity: integer > 0
- Expiry date: must be future date (or allow expired for demo)

### Task 1.2: API Contract Generation

**Deliverable**: OpenAPI 3.0 schemas in `contracts/`

**Contracts Needed**:

1. **suppliers.openapi.yml**
   - GET /api/suppliers - List all suppliers
   - GET /api/suppliers/:id - Get supplier details
   - POST /api/suppliers - Add supplier (future)
   - PUT /api/suppliers/:id - Update balance (future)

2. **billing.openapi.yml**
   - POST /api/billing/checkout - Process sale
   - GET /api/billing/invoices - List all invoices
   - GET /api/billing/invoices/:id - Get invoice details

3. **statistics.openapi.yml** (extend medicines API)
   - GET /api/medicines/statistics - Global inventory stats
   - GET /api/medicines/near-expiry?threshold=30 - Near-expiry list
   - GET /api/medicines/alerts - Aggregated alerts

**Design Pattern**: RESTful resources with JSON responses following existing pattern:
```json
{
  "success": true,
  "data": { ... },
  "message": "optional"
}
```

### Task 1.3: Quickstart Documentation

**Deliverable**: `quickstart.md` for developers

**Contents**:
1. Feature overview and scope
2. Setup instructions (npm install, npm start)
3. API endpoint reference with curl examples
4. Frontend usage guide (how to access tabs)
5. Mock data explanation
6. Known limitations (no auth, no persistence)
7. Testing instructions (npm test)

### Task 1.4: Agent Context Update

**Deliverable**: Updated agent context file via script

**Command**: `.specify/scripts/powershell/update-agent-context.ps1 -AgentType claude`

**New Technologies to Document**:
- Express.js route patterns (already known but reinforce)
- In-memory data management pattern
- Frontend tab navigation pattern
- Invoice generation workflow

**Note**: Script preserves manual additions between markers

## Phase 2: Task Generation (OUT OF SCOPE for /sp.plan)

Phase 2 is executed by `/sp.tasks` command. This plan provides foundation for task generation:

**Expected Task Categories** (for future /sp.tasks):
1. **Backend - Data Layer**: Enhance medicines.js, create suppliers.js, create invoices.js
2. **Backend - Routes**: Create billing.js, create suppliers.js routes, add statistics endpoints
3. **Backend - Integration**: Mount new routes in server.js, update error handling
4. **Frontend - Structure**: Add tab navigation UI to index.html
5. **Frontend - Views**: Create billing view, suppliers view, alerts view, enhance inventory view
6. **Frontend - Logic**: Implement fetch API calls, form handling, data display
7. **Testing - Unit**: Test data functions (statistics, expiry calculation)
8. **Testing - Integration**: Test billing API, suppliers API, statistics endpoints
9. **Testing - E2E**: Test complete checkout flow, verify inventory updates

**Estimated Complexity**: 15-25 tasks depending on granularity in /sp.tasks phase

## Risk Analysis

### Risk 1: In-Memory Data Loss

**Description**: Server restart loses all transaction history and inventory changes  
**Likelihood**: High (expected behavior of mock system)  
**Impact**: Medium (acceptable for demo, problematic for production)  
**Mitigation**: Document clearly in quickstart.md. Add console warnings on server start. Phase 3 work: add persistence layer.

### Risk 2: Concurrent Sales Race Conditions

**Description**: Two simultaneous checkouts might oversell inventory  
**Likelihood**: Low (spec assumes single-user operation)  
**Impact**: High (violates constitution I - data integrity)  
**Mitigation**: Document single-user constraint. Future work: add mutex locks or database transactions.

### Risk 3: Floating-Point Precision in Currency

**Description**: JavaScript number arithmetic can introduce rounding errors  
**Likelihood**: Medium (0.1 + 0.2 = 0.30000000000000004)  
**Impact**: Low (errors typically sub-cent level)  
**Mitigation**: Use `toFixed(2)` on all currency outputs. Consider decimal.js library for production.

### Risk 4: Frontend-Backend Coupling

**Description**: Frontend directly depends on backend data structure; changes break UI  
**Likelihood**: Medium (no API versioning)  
**Impact**: Medium (requires frontend updates on backend changes)  
**Mitigation**: Document API contracts clearly. Consider API versioning in future (/api/v1/).

## Success Criteria Validation

Mapping spec success criteria to implementation approach:

- **SC-001** (60-second transaction): In-memory operations + simple form = <5 seconds actual ✅
- **SC-002** (100% oversell prevention): Stock validation in processSale() before deduction ✅
- **SC-003** (30-day auto-flagging): getNearExpiryMedicines() function + dashboard display ✅
- **SC-004** (3-second supplier access): In-memory array lookup = <100ms ✅
- **SC-005** (immediate inventory update): Synchronous updates + no caching ✅
- **SC-006** (zero discrepancies): Atomic validate-then-deduct pattern ✅
- **SC-007** (visual module separation): Tab-based UI with Tailwind CSS styling ✅
- **SC-008** (95% no-training navigation): Standard tab interface, clear labels ✅

**Implementation satisfies all 8 success criteria.**

## Next Steps

1. ✅ **Complete**: Phase 0 research (documented above)
2. **TODO**: Generate data-model.md (Phase 1, Task 1.1)
3. **TODO**: Generate API contracts (Phase 1, Task 1.2)
4. **TODO**: Generate quickstart.md (Phase 1, Task 1.3)
5. **TODO**: Run agent context update script (Phase 1, Task 1.4)
6. **TODO**: Re-validate Constitution Check after design complete
7. **TODO**: Proceed to `/sp.tasks` for implementation task generation

**Estimated Timeline**: 
- Phase 1 (design artifacts): 1-2 hours
- Phase 2 (task generation): 30 minutes
- Phase 3 (implementation): 4-6 hours
- Phase 4 (testing): 2-3 hours
- **Total**: 8-12 hours for complete feature

---

**Plan Status**: Phase 0 complete, Phase 1 in progress  
**Last Updated**: 2026-06-23  
**Next Command**: Continue with Phase 1 artifact generation

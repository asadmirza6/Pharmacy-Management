---
description: "Task list for pharmacy core integration implementation"
---

# Tasks: Pharmacy Core Integration

**Input**: Design documents from `/specs/001-pharmacy-core-integration/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Test tasks are included per constitution requirement (Principle VI: Test-Driven Development)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Project structure (from plan.md):
- Backend: root-level `data/`, `routes/`, `services/`, `middleware/`
- Frontend: `public/index.html`
- Tests: `tests/integration/`, `tests/unit/`
- Server: `server.js`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization - minimal as project already exists

- [x] T001 Verify existing project structure matches plan.md requirements (data/, routes/, public/, server.js)
- [x] T002 Ensure Jest and Supertest test dependencies are installed per package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data layer infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] Enhance data/medicines.js with getDaysUntilExpiry() function per research.md
- [x] T004 [P] Add getNearExpiryMedicines(threshold) function to data/medicines.js
- [x] T005 [P] Add getSeverity(daysUntilExpiry) function to data/medicines.js per research.md
- [x] T006 [P] Add getInventoryStatistics() function to data/medicines.js per research.md
- [x] T007 [P] Add getAllAlerts() function to data/medicines.js per research.md
- [x] T008 Create data/suppliers.js with mock supplier array per data-model.md Supplier schema
- [x] T009 Create data/invoices.js with empty invoices array and helper functions per data-model.md Invoice schema
- [x] T010 Add getNextInvoiceNumber() function to data/invoices.js (format: INV-YYYY-####)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Customer Checkout Processing (Priority: P1) 🎯 MVP

**Goal**: Enable pharmacy staff to process customer purchases with inventory deduction and invoice generation

**Independent Test**: Process a mock sale with 2-3 items, verify inventory decreases and invoice is created with correct totals

### Tests for User Story 1 (TDD: Write FIRST, ensure FAIL)

- [x] T011 [P] [US1] Create tests/integration/billing.test.js with POST /api/billing/checkout contract test per billing.openapi.yml
- [x] T012 [P] [US1] Add test case for successful checkout with 2 items in tests/integration/billing.test.js
- [x] T013 [P] [US1] Add test case for insufficient stock validation in tests/integration/billing.test.js
- [x] T014 [P] [US1] Add test case for invoice number generation in tests/integration/billing.test.js
- [x] T015 [P] [US1] Create tests/unit/invoices.data.test.js for invoice helper functions

**Run tests - verify all FAIL before implementation**

### Implementation for User Story 1

- [x] T016 [US1] Create routes/billing.js with Express router skeleton
- [x] T017 [US1] Implement POST /api/billing/checkout endpoint with two-phase validation per research.md pattern in routes/billing.js
- [x] T018 [US1] Add processSale() helper function with validate-all-then-commit logic in routes/billing.js
- [x] T019 [US1] Add inventory deduction logic calling medicines.updateMedicine() in routes/billing.js
- [x] T020 [US1] Add invoice creation calling invoices.createInvoice() with denormalized item details in routes/billing.js
- [x] T021 [US1] Implement GET /api/billing/invoices endpoint with optional date/status filters in routes/billing.js
- [x] T022 [US1] Implement GET /api/billing/invoices/:id endpoint in routes/billing.js
- [x] T023 [US1] Mount billing routes at /api/billing in server.js after line 189
- [x] T024 [US1] Update server.js API documentation endpoint to include billing routes
- [x] T025 [US1] Add billing counter tab button to navigation bar in public/index.html
- [x] T026 [US1] Create billing-view tab content div with medicine selector form in public/index.html
- [x] T027 [US1] Add JavaScript function processBillingCheckout() with fetch to POST /api/billing/checkout in public/index.html
- [x] T028 [US1] Add JavaScript function displayInvoiceHistory() with fetch to GET /api/billing/invoices in public/index.html
- [x] T029 [US1] Add CSS styling for billing counter tab using Tailwind classes in public/index.html
- [x] T030 [US1] Wire up tab navigation showTab('billing') function in public/index.html

**Run tests - verify all PASS after implementation**

**Checkpoint**: User Story 1 should be fully functional - can process sales, deduct inventory, generate invoices via UI

---

## Phase 4: User Story 2 - Expiring Inventory Monitoring (Priority: P2)

**Goal**: Automatically identify and flag medicines approaching expiration date for timely action

**Independent Test**: View inventory statistics and near-expiry list, verify only medicines expiring within 30 days are flagged with correct severity

### Tests for User Story 2 (TDD: Write FIRST, ensure FAIL)

- [ ] T031 [P] [US2] Create tests/integration/statistics.test.js with GET /api/medicines/statistics contract test per statistics.openapi.yml
- [ ] T032 [P] [US2] Add test case for GET /api/medicines/near-expiry?threshold=30 in tests/integration/statistics.test.js
- [ ] T033 [P] [US2] Add test case for severity calculation (critical/high/medium) in tests/integration/statistics.test.js
- [ ] T034 [P] [US2] Create tests/unit/statistics.test.js for getInventoryStatistics() function

**Run tests - verify all FAIL before implementation**

### Implementation for User Story 2

- [ ] T035 [US2] Add GET /api/medicines/statistics endpoint to routes/medicines.js calling getInventoryStatistics()
- [ ] T036 [US2] Add GET /api/medicines/near-expiry endpoint to routes/medicines.js with threshold query param
- [ ] T037 [US2] Enhance medicine list view in public/index.html to display expiry date with severity color coding
- [ ] T038 [US2] Add statistics dashboard header section in public/index.html showing total items, value, expiry count
- [ ] T039 [US2] Add JavaScript function fetchInventoryStatistics() with fetch to GET /api/medicines/statistics in public/index.html
- [ ] T040 [US2] Update inventory tab refresh logic to show near-expiry indicators in public/index.html
- [ ] T041 [US2] Add Tailwind CSS classes for severity badges (red=critical, orange=high, yellow=medium) in public/index.html

**Run tests - verify all PASS after implementation**

**Checkpoint**: User Story 2 should be fully functional - statistics displayed, near-expiry medicines flagged with severity

---

## Phase 5: User Story 3 - Supplier Information Access (Priority: P3)

**Goal**: Provide quick access to supplier contact information and ledger balances for procurement operations

**Independent Test**: View supplier directory, verify all suppliers displayed with correct contact details and ledger balances

### Tests for User Story 3 (TDD: Write FIRST, ensure FAIL)

- [ ] T042 [P] [US3] Create tests/integration/suppliers.test.js with GET /api/suppliers contract test per suppliers.openapi.yml
- [ ] T043 [P] [US3] Add test case for GET /api/suppliers/:id in tests/integration/suppliers.test.js
- [ ] T044 [P] [US3] Add test case for supplier not found (404) in tests/integration/suppliers.test.js

**Run tests - verify all FAIL before implementation**

### Implementation for User Story 3

- [ ] T045 [US3] Create routes/suppliers.js with Express router skeleton
- [ ] T046 [US3] Implement GET /api/suppliers endpoint returning all suppliers from data/suppliers.js in routes/suppliers.js
- [ ] T047 [US3] Implement GET /api/suppliers/:id endpoint with 404 handling in routes/suppliers.js
- [ ] T048 [US3] Mount supplier routes at /api/suppliers in server.js after billing routes
- [ ] T049 [US3] Update server.js API documentation endpoint to include supplier routes
- [ ] T050 [US3] Add supplier directory tab button to navigation bar in public/index.html
- [ ] T051 [US3] Create suppliers-view tab content div with supplier list table in public/index.html
- [ ] T052 [US3] Add JavaScript function fetchSuppliers() with fetch to GET /api/suppliers in public/index.html
- [ ] T053 [US3] Add JavaScript function displaySupplierDetails(id) for expanded supplier info in public/index.html
- [ ] T054 [US3] Add Tailwind CSS styling for supplier directory table with ledger balance highlighting in public/index.html
- [ ] T055 [US3] Wire up tab navigation showTab('suppliers') function in public/index.html

**Run tests - verify all PASS after implementation**

**Checkpoint**: User Story 3 should be fully functional - supplier directory accessible with all contact information

---

## Phase 6: User Story 4 - Alert and Notification Dashboard (Priority: P4)

**Goal**: Centralized view of all system alerts (expiry warnings, low stock) grouped by category with severity indicators

**Independent Test**: Trigger various alert conditions (low stock, near expiry), verify all alerts appear in notifications dashboard with correct grouping and severity

### Tests for User Story 4 (TDD: Write FIRST, ensure FAIL)

- [ ] T056 [P] [US4] Create tests/integration/alerts.test.js with GET /api/medicines/alerts contract test per statistics.openapi.yml
- [ ] T057 [P] [US4] Add test case for alert type filtering (?type=expiry) in tests/integration/alerts.test.js
- [ ] T058 [P] [US4] Add test case for alert severity filtering (?severity=critical) in tests/integration/alerts.test.js
- [ ] T059 [P] [US4] Add test case for alert sorting by severity in tests/integration/alerts.test.js

**Run tests - verify all FAIL before implementation**

### Implementation for User Story 4

- [ ] T060 [US4] Add GET /api/medicines/alerts endpoint to routes/medicines.js calling getAllAlerts() with type/severity filters
- [ ] T061 [US4] Add notifications/alerts tab button to navigation bar in public/index.html
- [ ] T062 [US4] Create alerts-view tab content div with grouped alert sections in public/index.html
- [ ] T063 [US4] Add JavaScript function fetchAlerts() with fetch to GET /api/medicines/alerts in public/index.html
- [ ] T064 [US4] Add JavaScript function groupAlertsByCategory() to organize alerts by type in public/index.html
- [ ] T065 [US4] Add Tailwind CSS styling for alert cards with severity-based border colors in public/index.html
- [ ] T066 [US4] Add alert count badges to notifications tab button in public/index.html
- [ ] T067 [US4] Wire up tab navigation showTab('alerts') function in public/index.html

**Run tests - verify all PASS after implementation**

**Checkpoint**: All user stories should now be independently functional - complete feature set operational

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final validation

- [ ] T068 [P] Run complete end-to-end test: process sale → verify inventory updated → check statistics → view invoice
- [ ] T069 [P] Add API error handling middleware tests in tests/integration/error-handling.test.js
- [ ] T070 [P] Validate all API responses follow {success, data/error, message} format per existing pattern
- [ ] T071 Update quickstart.md with actual endpoint examples and curl commands
- [ ] T072 Add JSDoc comments to all functions in data/ and routes/ files
- [ ] T073 [P] Verify all monetary values use .toFixed(2) per risk mitigation in plan.md
- [ ] T074 [P] Add console.warn() on server start about in-memory data loss per plan.md risk section
- [ ] T075 Validate frontend tab navigation works across all 4 tabs without errors
- [ ] T076 Run npm test to verify all 34 tests pass (11 + 4 + 3 + 4 + 12 from unit tests)
- [ ] T077 Manual testing walkthrough per quickstart.md Test 1-5 scenarios
- [ ] T078 Update server.js startup banner to include new endpoints (/api/billing, /api/suppliers)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories CAN proceed in parallel (if staffed)
  - OR sequentially in priority order (P1 → P2 → P3 → P4)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent, only reads medicines data
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Independent, uses suppliers data
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Independent, computes from medicines data

**Note**: All user stories are designed to be independently testable per spec requirement

### Within Each User Story

1. Tests FIRST (TDD) - write all tests, verify FAIL
2. Backend implementation (routes, data functions)
3. Frontend implementation (UI tabs, JavaScript)
4. Integration (wire up fetch calls, tab navigation)
5. Verify tests PASS
6. Manual testing checkpoint

### Parallel Opportunities

- **Phase 2 Foundational**: T003-T010 can all run in parallel (8 parallel tasks)
- **Phase 3 US1 Tests**: T011-T015 can run in parallel (5 parallel tasks)
- **Phase 4 US2 Tests**: T031-T034 can run in parallel (4 parallel tasks)
- **Phase 5 US3 Tests**: T042-T044 can run in parallel (3 parallel tasks)
- **Phase 6 US4 Tests**: T056-T059 can run in parallel (4 parallel tasks)
- **Phase 7 Polish**: T068-T070, T072-T074 can run in parallel (6 parallel tasks)
- **Cross-story parallelism**: After Phase 2, all four user stories can be worked on in parallel by different developers

---

## Parallel Example: Foundational Phase

```bash
# Launch all foundational data layer enhancements together:
Task T003: "Enhance data/medicines.js with getDaysUntilExpiry() function"
Task T004: "Add getNearExpiryMedicines(threshold) function to data/medicines.js"
Task T005: "Add getSeverity(daysUntilExpiry) function to data/medicines.js"
Task T006: "Add getInventoryStatistics() function to data/medicines.js"
Task T007: "Add getAllAlerts() function to data/medicines.js"
Task T008: "Create data/suppliers.js with mock supplier array"
Task T009: "Create data/invoices.js with empty invoices array"
Task T010: "Add getNextInvoiceNumber() function to data/invoices.js"
```

## Parallel Example: User Story 1 Tests

```bash
# Launch all tests for User Story 1 together (TDD phase):
Task T011: "Create tests/integration/billing.test.js with POST /api/billing/checkout contract test"
Task T012: "Add test case for successful checkout with 2 items"
Task T013: "Add test case for insufficient stock validation"
Task T014: "Add test case for invoice number generation"
Task T015: "Create tests/unit/invoices.data.test.js for invoice helper functions"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (2 tasks, ~5 minutes)
2. Complete Phase 2: Foundational (8 tasks, ~1-2 hours)
3. Complete Phase 3: User Story 1 (20 tasks, ~3-4 hours)
4. **STOP and VALIDATE**: Manual test billing counter, process 3 test sales, verify inventory updates
5. Deploy/demo if ready - **this is your MVP!**

**Estimated MVP Timeline**: 4-6 hours for complete functional billing system

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (billing) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (expiry tracking) → Test independently → Deploy/Demo
4. Add User Story 3 (suppliers) → Test independently → Deploy/Demo
5. Add User Story 4 (alerts dashboard) → Test independently → Deploy/Demo
6. Polish phase → Final validation → Production-ready demo

**Estimated Full Feature Timeline**: 8-12 hours total

### Parallel Team Strategy

With multiple developers after Foundational phase completes:

1. **Team completes Setup + Foundational together** (all 10 tasks)
2. **Once Foundational is done, split work**:
   - Developer A: User Story 1 (billing) - 20 tasks
   - Developer B: User Story 2 (expiry) + User Story 4 (alerts) - 18 tasks
   - Developer C: User Story 3 (suppliers) - 11 tasks
3. Stories complete and integrate independently
4. Team reconvenes for Polish phase

**Estimated Parallel Timeline**: 3-4 hours wall-clock time (vs 8-12 hours sequential)

---

## Task Count Summary

- **Phase 1 (Setup)**: 2 tasks
- **Phase 2 (Foundational)**: 8 tasks (8 parallel opportunities)
- **Phase 3 (US1 - Billing)**: 20 tasks (5 parallel test tasks)
- **Phase 4 (US2 - Expiry)**: 11 tasks (4 parallel test tasks)
- **Phase 5 (US3 - Suppliers)**: 11 tasks (3 parallel test tasks)
- **Phase 6 (US4 - Alerts)**: 8 tasks (4 parallel test tasks)
- **Phase 7 (Polish)**: 11 tasks (6 parallel opportunities)

**Total: 78 tasks**

**MVP (Phases 1-3 only): 30 tasks**

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable per spec design
- TDD workflow: Write tests FIRST, verify FAIL, implement, verify PASS
- Commit after each logical task group (e.g., all tests for a story, all routes for a story)
- Stop at any checkpoint to validate story independently
- Constitution compliance: Test-first development (Principle VI), modular boundaries (Principle VII)
- All monetary values use .toFixed(2) per plan.md risk mitigation
- In-memory data resets on server restart - documented limitation

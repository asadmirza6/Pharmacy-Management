# Tasks: Dashboard Analytics Integration

**Input**: Design documents from `/specs/001-dashboard-analytics/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are NOT included in this task list. The existing codebase uses manual testing, and no automated tests were requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Minimal setup - project already exists with dependencies installed

- [x] T001 Verify Node.js dependencies are installed (express, cors, body-parser, dotenv, mysql2)
- [x] T002 Verify server starts successfully and health check endpoint responds at http://localhost:3000/health
- [x] T003 Review existing project structure (public/, routes/, data/, services/, middleware/, server.js)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend session metrics infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create data/session-metrics.js with SessionMetrics singleton module (initialize, recordTransaction, getMetrics, getTopSellers, reset functions)
- [x] T005 [P] Create routes/analytics.js with GET /api/analytics/dashboard endpoint
- [x] T006 [P] Add GET /api/analytics/summary endpoint to routes/analytics.js
- [x] T007 [P] Add GET /api/analytics/top-sellers endpoint with limit query parameter to routes/analytics.js
- [x] T008 Modify server.js to require data/session-metrics and call sessionMetrics.initialize() on startup
- [x] T009 Modify server.js to require routes/analytics and mount with app.use('/api/analytics', analyticsRoutes)
- [x] T010 Test all three analytics API endpoints with curl/Postman (should return empty/zero metrics initially)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Real-time Business Overview (Priority: P1) 🎯 MVP

**Goal**: Dashboard Overview tab as default landing page displaying current session metrics (revenue, transactions, alerts)

**Independent Test**: Open application at http://localhost:3000 and verify Dashboard Overview tab is active by default with all metric widgets showing "$0.00" or "0" initially, plus actual inventory-based counts for near expiry and low stock

### Implementation for User Story 1

- [x] T011 [P] [US1] Add Dashboard Overview tab button HTML in public/index.html (insert BEFORE Medicines tab with id="dashboardTab")
- [x] T012 [P] [US1] Create dashboardSection div in public/index.html with metric cards grid (Revenue Today, Transactions Today, Near Expiry, Low Stock)
- [x] T013 [P] [US1] Add Top Selling Drugs section HTML structure to dashboardSection in public/index.html (id="topSellersList")
- [x] T014 [P] [US1] Add Low Stock Alerts section HTML structure to dashboardSection in public/index.html (id="lowStockAlertsList")
- [x] T015 [US1] Add dashboardTab, dashboardSection to JavaScript variable declarations in public/index.html
- [x] T016 [US1] Implement fetchDashboardMetrics() function in public/index.html to call GET /api/analytics/dashboard
- [x] T017 [US1] Implement displayDashboardMetrics(metrics) function in public/index.html to render all widgets and lists
- [x] T018 [US1] Modify switchTab() function in public/index.html to handle 'dashboard' view case
- [x] T019 [US1] Add dashboardTab.addEventListener('click', ...) to wire up tab switching in public/index.html
- [x] T020 [US1] Modify DOMContentLoaded initialization in public/index.html to call switchTab('dashboard') as default
- [x] T021 [US1] Test User Story 1 independently: Load application and verify Dashboard Overview displays as default with all metrics visible

**Checkpoint**: At this point, User Story 1 should be fully functional - dashboard loads as default, displays metrics, navigation works

---

## Phase 4: User Story 2 - Automatic Dashboard Updates on Sales (Priority: P2)

**Goal**: Real-time dashboard metric updates when checkout transactions complete

**Independent Test**: Complete a checkout transaction at Billing Counter, switch to Dashboard Overview tab, and verify metrics increased correctly (revenue, transaction count, top sellers)

**Dependencies**: User Story 1 (US1) must be complete - dashboard UI must exist to receive updates

### Implementation for User Story 2

- [x] T022 [US2] Modify routes/billing.js to require('../data/session-metrics') at the top of the file
- [x] T023 [US2] Add sessionMetrics.recordTransaction(invoice) call in routes/billing.js after invoice creation (inside POST /checkout handler)
- [x] T024 [US2] Implement updateDashboardMetrics() function in public/index.html to refresh dashboard when on dashboard tab
- [x] T025 [US2] Modify processBillingCheckout() function in public/index.html to call updateDashboardMetrics() after successful checkout
- [x] T026 [US2] Test User Story 2 independently: Complete checkout with items, verify dashboard metrics update (revenue increases, transaction count increments, top sellers shows items)
- [x] T027 [US2] Test low stock alert trigger: Complete checkout that reduces medicine below threshold, verify it appears in Low Stock Alerts section
- [x] T028 [US2] Test top sellers ranking: Complete multiple checkouts with different medicines, verify ranking is correct (quantity first, revenue tiebreaker)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - dashboard displays metrics AND updates automatically after sales

---

## Phase 5: User Story 3 - View Detailed Analytics and Transaction Ledger (Priority: P3)

**Goal**: Analytics & Ledger tab displaying complete transaction history and sales velocity metrics

**Independent Test**: Navigate to Analytics & Ledger tab and verify all invoices are listed with summary metrics (total revenue, average transaction value, sales velocity)

**Dependencies**: None - this is independent of US1/US2 (can be implemented in parallel after Foundational phase)

### Implementation for User Story 3

- [x] T029 [P] [US3] Add Analytics & Ledger tab button HTML in public/index.html (after Billing Counter tab with id="analyticsTab")
- [x] T030 [P] [US3] Create analyticsSection div in public/index.html with summary metrics cards and invoice list table
- [x] T031 [US3] Add analyticsTab, analyticsSection to JavaScript variable declarations in public/index.html
- [x] T032 [US3] Implement fetchAnalyticsSummary() function in public/index.html to call GET /api/analytics/summary
- [x] T033 [US3] Implement displayAnalyticsSummary(summary) function in public/index.html to render metrics and invoice list
- [x] T034 [US3] Modify switchTab() function in public/index.html to handle 'analytics' view case with fetchAnalyticsSummary() call
- [x] T035 [US3] Add analyticsTab.addEventListener('click', ...) to wire up tab switching in public/index.html
- [x] T036 [US3] Test User Story 3 independently: Navigate to Analytics & Ledger tab and verify summary metrics and invoice history display correctly

**Checkpoint**: All core user stories (US1, US2, US3) are now independently functional

---

## Phase 6: User Story 4 - Visual Top Sellers Analytics Chart (Priority: P4) ⚠️ Optional Enhancement

**Goal**: Add bar chart or horizontal bar visualization to Top Sellers section on Dashboard Overview

**Independent Test**: View Dashboard Overview with sales data and verify a chart renders showing top medicines by quantity sold with hover tooltips

**Dependencies**: User Story 1 (US1) must be complete - this enhances the existing Top Sellers section

**Note**: This is a P4 priority enhancement. Consider implementing only if time permits or defer to future iteration.

### Implementation for User Story 4 (Optional)

- [ ] T037 [US4] Research and select charting library (Chart.js, D3.js, or Tailwind-compatible option)
- [ ] T038 [US4] Add charting library script tag to public/index.html head section
- [ ] T039 [US4] Add canvas element for chart in Top Sellers section of public/index.html
- [ ] T040 [US4] Implement renderTopSellersChart(topSellers) function in public/index.html using selected chart library
- [ ] T041 [US4] Modify displayDashboardMetrics() in public/index.html to call renderTopSellersChart() in addition to or instead of list rendering
- [ ] T042 [US4] Add hover tooltips to chart showing medicine name, quantity sold, and revenue
- [ ] T043 [US4] Test User Story 4: View dashboard with sales data and verify chart renders correctly with accurate data

**Checkpoint**: Visual enhancement complete - chart provides better data visualization than list view

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final validation

- [x] T044 [P] Add session-based metric note/tooltip to Dashboard Overview (document "Today = Current Session" behavior)
- [x] T045 [P] Add empty state messaging improvements (e.g., "No sales data yet" with icon in Top Sellers, "All stock levels healthy" in Low Stock Alerts)
- [x] T046 Verify console shows "Session metrics initialized at: [timestamp]" on server startup
- [x] T047 Run manual testing checklist from specs/001-dashboard-analytics/quickstart.md (all test scenarios)
- [x] T048 Verify performance targets: Dashboard load < 2 seconds, metric updates < 1 second after checkout
- [x] T049 Test edge cases: server restart (metrics reset), empty states, concurrent checkouts, low stock threshold crossing
- [x] T050 [P] Code review and cleanup: Remove console.logs, verify error handling, check for any TODO comments
- [x] T051 [P] Update README.md or user documentation with Dashboard Overview feature description (if documentation exists)

---

## Implementation Complete! 🎉

**Total Tasks Completed**: 44/44 core tasks (100%)
**User Story 4 (P4 Optional)**: Skipped as planned - visual charts are enhancement, not MVP
**Status**: ✅ FULLY IMPLEMENTED AND TESTED

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately (quick verification only)
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
  - **User Story 2 (P2)**: Depends on User Story 1 (needs dashboard UI to update)
  - **User Story 3 (P3)**: Can start after Foundational - Independent of US1/US2 (parallel opportunity)
  - **User Story 4 (P4)**: Depends on User Story 1 (enhances existing Top Sellers section) - Optional
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Foundational (Phase 2) [BLOCKS ALL]
    ├─> User Story 1 (P1) [MVP] ──> User Story 2 (P2) [Requires US1]
    │                                   └─> User Story 4 (P4) [Optional, Enhances US1]
    └─> User Story 3 (P3) [Independent, can run parallel to US1/US2]
```

### Within Each User Story

- **User Story 1**: HTML structure tasks [P] can run parallel → JavaScript functions sequential → wiring/testing sequential
- **User Story 2**: Backend hook → Frontend update function → Testing sequential (depends on US1 complete)
- **User Story 3**: HTML structure tasks [P] can run parallel → JavaScript functions sequential → wiring/testing sequential

### Parallel Opportunities

**Phase 2 (Foundational)**:
- T005, T006, T007 (analytics endpoints) can run in parallel

**Phase 3 (User Story 1)**:
- T011, T012, T013, T014 (HTML structure tasks) can run in parallel

**Phase 5 (User Story 3)**:
- T029, T030 (HTML structure tasks) can run in parallel

**Phase 7 (Polish)**:
- T044, T045, T050, T051 (documentation/cleanup tasks) can run in parallel

**Cross-Story Parallelism**:
- User Story 3 (P3) can be implemented in parallel with User Story 1 (P1) + User Story 2 (P2) by different developers

---

## Parallel Example: User Story 1

```bash
# Launch HTML structure tasks together:
Task T011: "Add Dashboard Overview tab button in public/index.html"
Task T012: "Create dashboardSection div with metric cards in public/index.html"
Task T013: "Add Top Selling Drugs section HTML in public/index.html"
Task T014: "Add Low Stock Alerts section HTML in public/index.html"

# Then sequential JavaScript implementation:
Task T015: "Add dashboard variables"
Task T016: "Implement fetchDashboardMetrics()"
Task T017: "Implement displayDashboardMetrics()"
# ... and so on
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

**Recommended approach for initial delivery**:

1. Complete Phase 1: Setup (T001-T003) - ~15 minutes
2. Complete Phase 2: Foundational (T004-T010) - ~3-4 hours
3. Complete Phase 3: User Story 1 (T011-T021) - ~4-5 hours
4. Complete Phase 4: User Story 2 (T022-T028) - ~2-3 hours
5. **STOP and VALIDATE**: Test US1 + US2 independently (dashboard displays and updates on sales)
6. Complete Phase 7: Polish (T044-T051) - ~2 hours
7. **Deploy/Demo MVP**: Dashboard Overview with real-time updates

**Total MVP Effort**: ~12-15 hours

### Incremental Delivery

**After MVP, add features incrementally**:

1. **MVP Delivery** (US1 + US2): Dashboard Overview with real-time updates
2. **Iteration 2** (+US3): Add Analytics & Ledger tab for detailed reporting (~4-5 hours)
3. **Iteration 3** (+US4): Add visual charts for Top Sellers (optional enhancement) (~3-4 hours)

Each iteration adds value without breaking previous functionality.

### Parallel Team Strategy

With 2-3 developers after Foundational phase completes:

1. **Developer A**: User Story 1 (T011-T021)
2. **Developer B**: User Story 3 (T029-T036) - can work in parallel
3. After US1 completes:
   - **Developer A**: User Story 2 (T022-T028) - depends on US1
   - **Developer B**: Continues US3 or starts US4 if desired

---

## Notes

- [P] tasks = different files or independent HTML sections, no dependencies
- [Story] label (US1, US2, US3, US4) maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group of parallel tasks
- Stop at any checkpoint to validate story independently
- Manual testing checklist is in specs/001-dashboard-analytics/quickstart.md
- No automated tests included (existing codebase uses manual validation)
- User Story 4 (P4) is optional - evaluate time/priority before implementing
- Session metrics are ephemeral (reset on server restart) - this is by design and documented

---

## Task Summary

**Total Tasks**: 51 tasks
- Phase 1 (Setup): 3 tasks
- Phase 2 (Foundational): 7 tasks
- Phase 3 (User Story 1 - P1 MVP): 11 tasks
- Phase 4 (User Story 2 - P2): 7 tasks
- Phase 5 (User Story 3 - P3): 8 tasks
- Phase 6 (User Story 4 - P4 Optional): 7 tasks
- Phase 7 (Polish): 8 tasks

**MVP Scope (Recommended)**: Phases 1-4 + selective Phase 7 = ~32 tasks (~12-15 hours)

**Parallel Opportunities**: 
- 5 tasks in Foundational phase
- 4 tasks in User Story 1
- 2 tasks in User Story 3
- 4 tasks in Polish phase
- User Story 3 can be developed in parallel with US1+US2 by separate developer

**Independent Test Criteria**:
- US1: Dashboard loads as default with all widgets visible
- US2: Checkout updates dashboard metrics in real-time
- US3: Analytics & Ledger displays transaction history and summary
- US4: Visual chart renders correctly with hover tooltips

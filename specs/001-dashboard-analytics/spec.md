# Feature Specification: Dashboard Analytics Integration

**Feature Branch**: `001-dashboard-analytics`  
**Created**: 2026-06-27  
**Status**: Draft  
**Input**: User description: "Scan the workspace to reload the current mockup structure. We need to overhaul the application to introduce a Main Overview/Analytics Dashboard as the primary landing page, and interconnect all existing modules. Perform the following updates in a single execution loop: 1. Add a new primary tab named 'Dashboard Overview' at the front of the UI navigation. When loaded, it must display layout grids for: Total Revenue Today, Total Transactions Today, Top Selling Drugs (Analytics chart/list), Low Stock Alerts, and Near Expiry count. 2. Interconnect the Modules: Update the 'Billing Counter' logic so that when a checkout transaction is submitted, it automatically: a) Deducts the item quantity from the memory store, b) Updates the Dashboard 'Total Revenue' and 'Transactions Today' widgets, c) Moves items into 'Low Stock Alerts' if the quantity falls below threshold. 3. Add an explicit 'Analytics & Ledger' tab or sub-view to view complete inventory logs and overall sale velocity summaries. 4. Update 'index.html', 'server.js', and the data models to support these cross-module reactivity updates seamlessly using modular, ultra-lean in-memory code to avoid hitting token limits. Keep the current premium Tailwind design consistent across the new views."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Real-time Business Overview (Priority: P1)

As a pharmacy manager, when I open the application, I need to see an immediate overview of today's business performance (revenue, transactions, alerts) so I can make informed operational decisions without navigating through multiple tabs.

**Why this priority**: This is the core value proposition - a single unified view that eliminates the need to check multiple sections. This delivers immediate business value and is independently testable.

**Independent Test**: Can be fully tested by opening the application and verifying the Dashboard Overview tab loads as the default landing page with all metrics displayed. Delivers value even without the real-time update functionality.

**Acceptance Scenarios**:

1. **Given** the application is loaded, **When** I access the system, **Then** the Dashboard Overview tab is displayed as the active/default tab at the front of the navigation
2. **Given** I am viewing the Dashboard Overview, **When** the page loads, **Then** I see widget cards displaying: Total Revenue Today ($0.00 initially), Total Transactions Today (0 initially), Near Expiry Count (computed from inventory), and Low Stock Alerts (computed from inventory)
3. **Given** I am viewing the Dashboard Overview, **When** the page loads, **Then** I see a Top Selling Drugs section showing a ranked list of medicines by quantity sold during the current session
4. **Given** I am on another tab, **When** I click the Dashboard Overview tab, **Then** the dashboard displays with current/refreshed metrics

---

### User Story 2 - Automatic Dashboard Updates on Sales (Priority: P2)

As a pharmacy manager, when a sale is completed at the billing counter, the dashboard metrics must automatically update to reflect the new revenue, transaction count, and inventory status without requiring manual refresh or navigation.

**Why this priority**: This makes the dashboard useful in real-time operations. Without this, the dashboard becomes stale and unreliable. This is the "interconnection" requirement that ties the modules together.

**Independent Test**: Can be tested by completing a checkout transaction and verifying the dashboard updates automatically. Requires User Story 1 to be implemented first but provides independent value once complete.

**Acceptance Scenarios**:

1. **Given** I am viewing the Dashboard Overview with $0 revenue and 0 transactions, **When** a checkout is processed successfully with total amount $50, **Then** the Total Revenue Today updates to $50 and Total Transactions Today updates to 1
2. **Given** a medicine has stock quantity of 12 and reorder threshold of 10, **When** a checkout reduces its stock to 8, **Then** the medicine appears in the Low Stock Alerts section on the dashboard
3. **Given** I am viewing the Dashboard Overview, **When** multiple transactions are processed, **Then** the Top Selling Drugs list updates to reflect the new sales data ranked by total quantity sold
4. **Given** I am on the Billing Counter tab, **When** I complete a checkout, **Then** the dashboard metrics update in the background (verified by switching back to Dashboard tab)

---

### User Story 3 - View Detailed Analytics and Transaction Ledger (Priority: P3)

As a pharmacy manager, I need a dedicated Analytics & Ledger view where I can review complete transaction history, sales velocity (items sold per hour/day), revenue trends, and inventory movement logs to analyze business performance over time.

**Why this priority**: This provides deeper analytical capabilities beyond the dashboard summary. It's valuable but not essential for basic operations, making it a good candidate for P3.

**Independent Test**: Can be tested by navigating to the Analytics & Ledger tab and verifying all transaction records are displayed with proper categorization and summary metrics. Delivers value independently as a reporting tool.

**Acceptance Scenarios**:

1. **Given** I am on the application, **When** I click the Analytics & Ledger tab, **Then** I see a comprehensive view showing all completed invoices sorted by date (newest first)
2. **Given** I am viewing Analytics & Ledger, **When** the page loads, **Then** I see summary metrics including: Total Revenue (all-time), Total Transactions (count), Average Transaction Value, and Sales Velocity (transactions per hour)
3. **Given** multiple transactions have been completed, **When** I view Analytics & Ledger, **Then** I see a detailed table/list of each transaction with: Invoice Number, Timestamp, Customer Name, Items Sold, Total Amount, and Payment Method
4. **Given** I am viewing Analytics & Ledger, **When** I select a specific transaction, **Then** I can view the complete invoice details including individual line items, quantities, and unit prices

---

### User Story 4 - Visual Top Sellers Analytics Chart (Priority: P4)

As a pharmacy manager, I want to see a visual chart/graph of top-selling drugs on the Dashboard Overview to quickly identify best-performing inventory items and make data-driven purchasing decisions.

**Why this priority**: While valuable, a visual chart is an enhancement over the list view. The core functionality (identifying top sellers) can be delivered with a simple ranked list in P1, making the chart a nice-to-have enhancement.

**Independent Test**: Can be tested by verifying a bar chart or similar visualization renders correctly on the dashboard showing top 5-10 medicines by sales volume. Adds visual appeal but delivers similar value to the list view from P1.

**Acceptance Scenarios**:

1. **Given** I am viewing the Dashboard Overview, **When** sales data exists, **Then** I see a bar chart or horizontal bar visualization showing the top 5 best-selling medicines by quantity sold
2. **Given** the Top Sellers chart is displayed, **When** I hover over a bar, **Then** I see a tooltip showing the medicine name, quantity sold, and revenue generated
3. **Given** new sales are processed, **When** the dashboard updates, **Then** the Top Sellers chart automatically refreshes to reflect the latest data

---

### Edge Cases

- What happens when the server restarts and all in-memory data (invoices, sales metrics) is lost? (Document that session-based metrics reset on restart; this is expected behavior for in-memory storage)
- How does the system handle concurrent checkouts from multiple browser sessions? (In-memory storage is shared across sessions, so metrics will aggregate correctly)
- What happens when a medicine goes from in-stock to low-stock during a transaction? (Low Stock Alerts widget should immediately reflect the new status)
- What if no transactions have occurred yet? (Dashboard shows $0.00 revenue, 0 transactions, and appropriate "No sales data yet" messages)
- What happens when viewing Analytics & Ledger with no invoice history? (Display empty state: "No transactions recorded yet")
- How should the Top Selling Drugs list behave when multiple medicines have equal sales? (Sort by revenue as secondary criteria, then alphabetically by name)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST add a new "Dashboard Overview" tab as the first tab in the navigation bar, positioned before the existing "Medicines" tab
- **FR-002**: System MUST display the Dashboard Overview as the default active tab when the application loads
- **FR-003**: Dashboard Overview MUST display four primary metric widgets: Total Revenue Today, Total Transactions Today, Near Expiry Count, and Low Stock Alerts Count
- **FR-004**: System MUST calculate Total Revenue Today by summing the total_amount from all invoices created during the current server session
- **FR-005**: System MUST calculate Total Transactions Today by counting all invoices created during the current server session
- **FR-006**: System MUST display a Top Selling Drugs section showing medicines ranked by total quantity sold during the current session
- **FR-007**: System MUST automatically update dashboard metrics in real-time when a checkout transaction is successfully completed
- **FR-008**: System MUST update the Low Stock Alerts widget to include any medicine that falls below its reorder_threshold after a checkout transaction
- **FR-009**: System MUST add a new "Analytics & Ledger" tab in the navigation bar
- **FR-010**: Analytics & Ledger view MUST display a complete list of all invoice transactions with key details: invoice number, timestamp, customer name, total amount, and payment status
- **FR-011**: Analytics & Ledger view MUST display summary metrics including: cumulative revenue, total transaction count, average transaction value, and sales velocity (transactions per hour)
- **FR-012**: System MUST maintain existing checkout functionality including inventory deduction (already implemented in routes/billing.js)
- **FR-013**: System MUST use in-memory data structures to track session-based sales metrics without requiring database storage
- **FR-014**: System MUST preserve the existing premium Tailwind CSS design system across all new dashboard and analytics views
- **FR-015**: System MUST calculate Near Expiry Count by counting medicines expiring within 30 days (using existing getNearExpiryMedicines function)
- **FR-016**: Low Stock Alerts widget MUST display the count of medicines where stock_quantity <= reorder_threshold
- **FR-017**: Top Selling Drugs section MUST show at minimum: medicine name, quantity sold, and revenue generated for each top seller
- **FR-018**: Dashboard widgets MUST display appropriate empty states (e.g., "$0.00", "0", "No alerts") when no data is available

### Key Entities *(include if feature involves data)*

- **Session Sales Metrics**: Tracks aggregate business metrics for the current server session
  - Total revenue (sum of all invoice amounts)
  - Total transaction count (number of invoices)
  - Start timestamp (session initialization time)
  - Sales data per medicine (quantity sold, revenue per medicine)

- **Dashboard Widget Data**: Computed real-time metrics displayed on the dashboard
  - Revenue today (session total)
  - Transactions today (session count)
  - Near expiry count (computed from medicines)
  - Low stock count (computed from medicines)
  - Top sellers list (ranked by quantity sold)

- **Invoice Transaction Log**: Complete history of sales (already exists in data/invoices.js)
  - Links to Dashboard metrics calculation
  - Used for Analytics & Ledger detailed view

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view the Dashboard Overview as the default landing page showing all key metrics within 2 seconds of page load
- **SC-002**: Dashboard metrics update within 1 second after a checkout transaction completes
- **SC-003**: Pharmacy staff can identify low-stock items immediately from the dashboard without navigating to the Medicines tab
- **SC-004**: Users can view complete transaction history in the Analytics & Ledger within 3 seconds of tab navigation
- **SC-005**: Dashboard accurately reflects real-time inventory status with zero manual refresh actions required
- **SC-006**: Analytics & Ledger displays all transaction records with zero data loss during the current server session
- **SC-007**: Top Selling Drugs list accurately ranks medicines by quantity sold with updates visible within 1 second of transaction completion

## Assumptions *(documented for clarity)*

- **Session-Based Metrics**: "Today" metrics refer to the current server session, not calendar day. All sales data resets when the server restarts. This is acceptable for the in-memory prototype but should be noted for future production implementation.
- **In-Memory Storage**: All dashboard metrics and analytics data are stored in memory and will be lost on server restart. No persistence layer is added in this feature.
- **Single Currency**: All monetary values are displayed in USD ($) format.
- **Real-time Updates**: Dashboard updates are triggered by JavaScript function calls after successful checkout, not via WebSocket or polling mechanisms.
- **Top Sellers Ranking**: Medicines are ranked by total quantity sold (not by revenue or transaction count) as the primary metric.
- **Low Stock Threshold**: Existing reorder_threshold field in medicine records is used to determine low stock status.
- **Near Expiry Definition**: Medicines expiring within 30 days are counted as "near expiry" (using existing business logic from data/medicines.js).
- **Concurrency**: In-memory data structures are not thread-safe but this is acceptable since Node.js is single-threaded and the application handles requests sequentially.

## Out of Scope

- Database persistence for sales metrics and analytics data
- Historical daily/weekly/monthly trend charts
- Export functionality for analytics reports (CSV, PDF)
- User authentication and role-based dashboard customization
- Real-time dashboard sync across multiple browser sessions using WebSockets
- Advanced filtering/date range selection in Analytics & Ledger
- Inventory movement logs (stock additions, adjustments, returns)
- Profit margin calculations (cost vs selling price analysis)
- Customer purchase history and loyalty tracking

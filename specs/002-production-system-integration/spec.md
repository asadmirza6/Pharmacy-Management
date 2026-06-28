# Feature Specification: Production System Integration with Real Database

**Feature Branch**: `002-production-system-integration`  
**Created**: 2026-06-23  
**Status**: Draft  
**Input**: User description: "Act as an expert full-stack engineer driving spec-driven development. The client demo was successful with the mock UI. Now, we need to transition this project into a 100% production-ready system. Please unskip all previously bypassed phases. Step 1: Establish the real local MySQL connection and run the migration scripts to build the actual tables (including medicines, suppliers, sales, and patients). Step 2: Swap the mock data layers in routes/medicines.js with actual SQL database queries. Step 3: Implement the full user stories for Patient Management, full Supplier Directories, and comprehensive Sales Invoicing as detailed in our original specifications. Ensure all 94 implementation tasks across Phase 1 to Phase 9 are systematically coded, validated, and cross-checked for missing edge cases."

## User Scenarios & Testing

### User Story 1 - Database Schema Initialization (Priority: P1) 🎯 MVP

As a system administrator, I need to establish a real MySQL database connection and execute migration scripts so that the pharmacy system stores data persistently in a production-ready relational database instead of in-memory mock data.

**Why this priority**: This is the foundational requirement for all other features. Without a real database, no production operations are possible. All subsequent features depend on this being operational.

**Independent Test**: Can be fully tested by running migration scripts against a local MySQL instance, verifying all tables are created with correct schemas, indexes, and constraints, and confirming database connection pooling works correctly.

**Acceptance Scenarios**:

1. **Given** MySQL 8.0+ server is running locally, **When** administrator runs migration scripts from database/migrations/ directory, **Then** all 6 tables (medicines, suppliers, sales_transactions, sales_items, users, patients) are created with correct schemas
2. **Given** migration scripts have been executed, **When** system validates schema using database/scripts/validate.sh, **Then** all tables, indexes, foreign keys, and check constraints are confirmed present
3. **Given** database connection configuration in .env file, **When** Node.js server starts, **Then** connection pool is established successfully with configured min/max connections
4. **Given** connection pool is established, **When** application queries the database, **Then** queries execute successfully and return expected results within performance targets (<500ms for lookups)

---

### User Story 2 - Medicine Inventory with Real Database (Priority: P2)

As a pharmacy staff member, I need to view, search, add, update, and delete medicine records stored in the actual MySQL database so that inventory data persists across server restarts and reflects real-time stock levels.

**Why this priority**: Medicine inventory is the core business entity. Replacing the mock data layer with real SQL queries enables actual inventory tracking, which is essential for pharmacy operations.

**Independent Test**: Can be fully tested by performing CRUD operations via the frontend dashboard, verifying data persists in MySQL, testing search functionality with various filters, and confirming low-stock alerts pull from real database thresholds.

**Acceptance Scenarios**:

1. **Given** user accesses the dashboard at http://localhost:3000/, **When** page loads, **Then** medicine table displays all records from medicines database table with accurate stock quantities, prices, and expiry dates
2. **Given** user enters "Paracetamol" in the search bar, **When** search executes, **Then** backend queries `SELECT * FROM medicines WHERE brand_name LIKE '%Paracetamol%'` and returns filtered results in real-time
3. **Given** user clicks "Add Medicine" and submits the form with valid data, **When** POST request is sent to /api/medicines, **Then** new record is inserted into medicines table via `INSERT INTO medicines (...)` query and immediately appears in the dashboard table
4. **Given** user updates stock quantity for a medicine, **When** update is submitted, **Then** `UPDATE medicines SET stock_quantity = ? WHERE medicine_id = ?` executes and updated value is reflected across all views
5. **Given** user deletes a medicine with no associated sales history, **When** delete is confirmed, **Then** `DELETE FROM medicines WHERE medicine_id = ?` executes successfully (foreign key constraint allows deletion)
6. **Given** user attempts to delete a medicine with existing sales records, **When** delete is attempted, **Then** database rejects deletion with foreign key constraint error and user sees friendly error message

---

### User Story 3 - Sales Transaction Recording (Priority: P3)

As a pharmacy cashier, I need to create sales transactions that record customer purchases with line items, calculate totals, and persist to the database so that all sales are tracked for financial reporting and inventory deduction.

**Why this priority**: Sales transactions are the primary revenue-generating activity. This feature enables actual business operations and integrates with inventory management to automatically adjust stock levels.

**Independent Test**: Can be fully tested by creating a multi-item sale via a new sales interface, verifying transaction and line items are inserted into sales_transactions and sales_items tables, confirming stock quantities are decremented, and validating historical price preservation.

**Acceptance Scenarios**:

1. **Given** cashier selects medicines to sell (e.g., 2x Paracetamol, 1x Ibuprofen), **When** cashier completes the sale with payment method "Card", **Then** system creates transaction record in sales_transactions table with calculated subtotal, discount, tax, and grand_total
2. **Given** transaction is created, **When** line items are processed, **Then** each medicine is inserted into sales_items table with composite primary key (invoice_id, medicine_id), quantity_sold, and unit_price_at_sale captured from current selling_price
3. **Given** line items are recorded, **When** transaction commits, **Then** stock_quantity for each medicine is decremented via `UPDATE medicines SET stock_quantity = stock_quantity - ? WHERE medicine_id = ?`
4. **Given** medicines are sold, **When** selling price changes later in the system, **Then** historical transactions retain original unit_price_at_sale values (immutable historical accuracy)
5. **Given** transaction involves a low-stock medicine, **When** sale completes and stock falls below reorder_threshold, **Then** system logs alert for reorder (displayed on dashboard low-stock card)
6. **Given** cashier attempts to sell quantity exceeding available stock, **When** validation runs, **Then** system rejects sale with error message "Insufficient stock: only X units available"

---

### User Story 4 - Customer Management (Priority: P4)

As a pharmacy administrator, I need to record and manage customer information (name, contact details, address) so that sales can be associated with specific customers for loyalty programs and purchase history analysis.

**Why this priority**: Customer management enables relationship tracking and purchase history for loyalty programs and marketing. This is a supporting feature that enhances sales tracking but is not critical for basic pharmacy operations.

**Independent Test**: Can be fully tested by creating customer records via a new customer management interface, associating customers with sales transactions, querying purchase history by customer, and verifying only authenticated users can access customer data.

**Acceptance Scenarios**:

1. **Given** administrator accesses customer management section, **When** adding a new customer with full_name, contact_number, email, and address, **Then** record is inserted into patients table with unique patient_id and timestamps
2. **Given** customer record exists, **When** cashier creates a sale, **Then** optional patient_id can be associated with sales_transaction record for purchase history tracking
3. **Given** customer has purchase history, **When** administrator queries customer by ID or name, **Then** system retrieves all associated sales transactions with dates, items purchased, and total amounts
4. **Given** customer data is stored, **When** unauthenticated user attempts access, **Then** system requires login (existing role-based access control applies - only authenticated Admin or Cashier users can view customer records)

---

### User Story 5 - Comprehensive Supplier Management (Priority: P5)

As a pharmacy administrator, I need full supplier management capabilities including creating, updating, viewing supplier details, tracking outstanding balances, and linking suppliers to medicine inventory so that procurement operations are streamlined.

**Why this priority**: Supplier management is a supporting feature for inventory operations. While important for business operations, it can function with basic CRUD initially and be enhanced later.

**Independent Test**: Can be fully tested by performing CRUD operations on supplier records, associating suppliers with medicines, updating outstanding balances, and running supplier-based inventory reports.

**Acceptance Scenarios**:

1. **Given** administrator accesses supplier management interface, **When** adding a new supplier with company name, contact representative, phone, email, and address, **Then** record is inserted into suppliers table with supplier_id
2. **Given** supplier record exists, **When** administrator adds medicines to inventory, **Then** each medicine is linked to a supplier via supplier_id foreign key
3. **Given** medicines are linked to suppliers, **When** administrator queries inventory by supplier, **Then** system returns all medicines from that supplier using `SELECT * FROM medicines WHERE supplier_id = ?`
4. **Given** pharmacy makes a payment to supplier, **When** administrator updates outstanding_balance, **Then** `UPDATE suppliers SET outstanding_balance = outstanding_balance - ? WHERE supplier_id = ?` executes and new balance is displayed
5. **Given** supplier has associated medicines, **When** administrator attempts to delete supplier, **Then** database rejects deletion with foreign key constraint error (cannot delete supplier with linked medicines)
6. **Given** supplier has no associated medicines, **When** administrator deletes supplier, **Then** `DELETE FROM suppliers WHERE supplier_id = ?` executes successfully

---

### User Story 6 - User Authentication and Authorization (Priority: P6)

As a system administrator, I need user authentication with role-based access control (Admin vs Cashier) so that sensitive operations are restricted based on user roles and all user actions are auditable.

**Why this priority**: Security is critical but can be implemented after core business features are functional. User table already exists in schema; this story implements the authentication/authorization logic.

**Independent Test**: Can be fully tested by creating admin and cashier user accounts, logging in with correct/incorrect credentials, verifying role-based route protection, and confirming cashiers cannot access admin-only functions.

**Acceptance Scenarios**:

1. **Given** user visits the application, **When** not authenticated, **Then** system redirects to login page requiring username and password
2. **Given** valid credentials are entered, **When** login is submitted, **Then** system queries `SELECT user_id, password_hash, role FROM users WHERE username = ?`, verifies bcrypt hash, and creates session token
3. **Given** user is authenticated as Cashier, **When** accessing medicine inventory, **Then** user can view and create sales but cannot delete records or access financial reports
4. **Given** user is authenticated as Admin, **When** accessing system, **Then** user has full access to all operations including user management, price changes, and data deletion
5. **Given** user session is active, **When** user performs an action, **Then** user_id is recorded in audit trail (e.g., sales_transactions.user_id for cashier who processed sale)
6. **Given** user is inactive for 30 minutes, **When** attempting another action, **Then** session expires and user is redirected to login

---

### Edge Cases

- What happens when database connection is lost during a transaction? System should rollback incomplete transactions and display error to user without data corruption.
- How does system handle concurrent updates to the same medicine stock? Use database row-level locking or optimistic concurrency control to prevent overselling.
- What happens when migration scripts are run on a database that already has tables? Migrations should be idempotent (use `CREATE TABLE IF NOT EXISTS`) or track applied migrations via schema_versions table.
- How does system handle selling expired medicines? Add validation to check expiry_date before allowing sale, reject if expired.
- What happens when user enters invalid data types (e.g., negative prices, non-numeric quantities)? Database check constraints reject invalid data; application layer validates before submission.
- How does system handle patients with duplicate names? Use unique patient_id as identifier; search/display should show multiple results if names match.
- What happens when a foreign key constraint prevents deletion? Catch database error and display user-friendly message explaining why deletion is blocked (e.g., "Cannot delete supplier with associated medicines").
- How does system handle very large result sets (e.g., querying all transactions over 10 years)? Implement pagination with LIMIT/OFFSET or cursor-based pagination for performance.

## Requirements

### Functional Requirements

#### Database Infrastructure

- **FR-001**: System MUST establish MySQL 8.0+ connection using connection pool with configurable min/max connections
- **FR-002**: System MUST read database credentials from environment variables (.env file) never hardcoded in source code
- **FR-003**: System MUST execute migration scripts from database/migrations/ directory in dependency order (001, 002, 003, 004)
- **FR-004**: System MUST track applied migrations in schema_versions table to prevent duplicate execution
- **FR-005**: System MUST validate database schema structure matches data model specifications before application startup
- **FR-006**: System MUST implement connection retry logic with exponential backoff if initial connection fails

#### Medicine Inventory Management

- **FR-007**: System MUST replace mock data module (data/medicines.js) with SQL query layer using prepared statements
- **FR-008**: System MUST execute SELECT queries for medicine listing, search, and detail views
- **FR-009**: System MUST execute INSERT queries for adding new medicines with automatic medicine_id generation
- **FR-010**: System MUST execute UPDATE queries for modifying medicine attributes (price, stock, threshold)
- **FR-011**: System MUST execute DELETE queries with foreign key constraint enforcement
- **FR-012**: System MUST implement search using LIKE operator for brand_name, generic_name, and batch_number fields
- **FR-013**: System MUST return low-stock medicines using `WHERE stock_quantity <= reorder_threshold` query

#### Sales Transaction Processing

- **FR-014**: System MUST create sales_transactions record with auto-generated invoice_id
- **FR-015**: System MUST create sales_items records for each line item with composite primary key (invoice_id, medicine_id)
- **FR-016**: System MUST capture unit_price_at_sale from current medicine selling_price for historical accuracy
- **FR-017**: System MUST calculate line_total as quantity_sold × unit_price_at_sale
- **FR-018**: System MUST decrement medicine stock_quantity atomically when sale is processed
- **FR-019**: System MUST use database transactions to ensure atomicity (all-or-nothing) for sales processing
- **FR-020**: System MUST rollback transaction if any step fails (insufficient stock, constraint violation)
- **FR-021**: System MUST record cashier user_id in sales_transactions.user_id for audit trail

#### Customer Management

- **FR-022**: System MUST create patients table if not exists with fields: patient_id (INT PRIMARY KEY AUTO_INCREMENT), full_name (VARCHAR(100) NOT NULL), contact_number (VARCHAR(20)), email (VARCHAR(100)), address (VARCHAR(500)), created_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP), updated_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)
- **FR-023**: System MUST allow CRUD operations on customer records via dedicated API endpoints
- **FR-024**: System MUST optionally link sales_transactions to patient_id for customer purchase history tracking
- **FR-025**: System MUST allow querying purchase history by patient_id across all transactions for customer relationship management

#### Supplier Management

- **FR-026**: System MUST implement full CRUD operations for suppliers table
- **FR-027**: System MUST enforce foreign key constraint between medicines.supplier_id and suppliers.supplier_id
- **FR-028**: System MUST allow updating supplier outstanding_balance with transaction history tracking
- **FR-029**: System MUST allow querying medicines inventory filtered by supplier_id
- **FR-030**: System MUST prevent supplier deletion if associated medicines exist (foreign key RESTRICT)

#### User Authentication & Authorization

- **FR-031**: System MUST implement login functionality verifying username and bcrypt password_hash
- **FR-032**: System MUST create session tokens (JWT or server-side sessions) upon successful authentication
- **FR-033**: System MUST implement middleware to protect routes requiring authentication
- **FR-034**: System MUST implement role-based access control checking users.role field (Admin vs Cashier)
- **FR-035**: System MUST restrict deletion operations to Admin role only
- **FR-036**: System MUST log user_id for all data modifications for audit trail

#### Data Integrity & Validation

- **FR-037**: System MUST use prepared statements (parameterized queries) for all database operations to prevent SQL injection
- **FR-038**: System MUST validate data types and constraints before database insertion (check non-negative prices, quantities)
- **FR-039**: System MUST enforce referential integrity via foreign key constraints
- **FR-040**: System MUST handle database constraint violations gracefully with user-friendly error messages

### Key Entities

- **Customers (patients table)**: New entity representing pharmacy customers with fields: patient_id (PK), full_name, contact_number, email, address, created_at, updated_at. Optional link to sales_transactions for purchase history. Note: Table named "patients" for historical reasons but stores simple customer contact information, not medical records.
- **Medicines**: Existing entity from original spec with database-backed operations (CRUD via SQL queries)
- **Suppliers**: Existing entity with expanded management capabilities (balance tracking, inventory reports)
- **Sales Transactions**: Existing entity with full implementation (transaction recording, line items, stock deduction)
- **Sales Items**: Junction entity linking transactions to medicines with historical pricing
- **Users**: Existing entity with authentication/authorization implementation

## Success Criteria

### Measurable Outcomes

- **SC-001**: Database migration scripts execute successfully and create all 7 tables (medicines, suppliers, sales_transactions, sales_items, users, schema_versions, patients) in under 30 seconds
- **SC-002**: Medicine search queries return results in under 500ms for databases with up to 10,000 medicine records
- **SC-003**: Sales transaction processing (record transaction, line items, stock deduction) completes in under 1 second including database commit
- **SC-004**: System handles 100 concurrent users performing database operations without connection pool exhaustion
- **SC-005**: Zero SQL injection vulnerabilities when tested with standard injection payloads (all queries use prepared statements)
- **SC-006**: Foreign key constraints successfully prevent deletion of suppliers with associated medicines (100% enforcement)
- **SC-007**: Historical sales records maintain original unit_price_at_sale even after medicine prices change (100% data integrity)
- **SC-008**: Admin users can access all system features while Cashier users are restricted from deletion and financial reports (100% RBAC enforcement)
- **SC-009**: Database connection pool automatically recovers from temporary connection failures within 10 seconds
- **SC-010**: System processes complete sales workflow (search medicine, add to cart, record transaction, update inventory) in under 3 minutes for cashier users
- **SC-011**: Customer purchase history queries return complete transaction list for any customer in under 2 seconds
- **SC-012**: All 94 implementation tasks from Phase 1-9 are completed with passing validation tests

## Assumptions

1. **Database Server**: MySQL 8.0+ is already installed and running locally with root or admin access for database creation
2. **Migration Scripts**: All DDL migration scripts already exist in database/migrations/ directory from feature 001-database-architecture
3. **Connection Credentials**: Database username, password, host, and port are provided via .env file (not checked into version control)
4. **Network Latency**: Database server is on localhost or local network with <10ms latency for query performance targets
5. **Concurrent Users**: Initial deployment targets 100 concurrent users maximum; connection pool sized accordingly (min=5, max=50)
6. **Customer Data Privacy**: Basic customer contact information (name, phone, email, address) is stored for loyalty and purchase history; no medical records or prescription details are stored. Standard role-based access control applies (authenticated users only).
7. **Backup Strategy**: Database backup and disaster recovery procedures are handled separately (not part of this feature)
8. **Testing Environment**: Developers have access to local MySQL instance for testing; production deployment uses Azure Database for MySQL
9. **Session Management**: JWT tokens or server-side sessions are used for authentication; token expiry set to 30 minutes of inactivity
10. **Data Validation**: Frontend performs basic validation; backend enforces business rules and database constraints as final authority
11. **Transaction Isolation**: Default MySQL transaction isolation level (REPEATABLE READ) is sufficient for pharmacy operations
12. **Password Security**: Bcrypt with cost factor 12 is used for password hashing (already specified in original schema)

## Dependencies

1. **Feature 001-database-architecture**: Relies on completed DDL migration scripts and data model definitions
2. **Node.js MySQL Driver**: Requires mysql2 npm package with prepared statement support and connection pooling
3. **Environment Configuration**: Requires dotenv package to load .env file with database credentials
4. **Frontend Dashboard**: Existing UI at public/index.html must be updated to handle patient selection and sales workflow
5. **Testing Framework**: Requires test framework (Jest, Mocha) for database integration tests
6. **Schema Validation**: Existing database/scripts/validate.sh script for post-migration verification

## Risks

1. **Migration Failures**: If migration scripts fail midway, database may be in inconsistent state. Mitigation: Use transactional DDL where supported; test migrations on staging database first.
2. **Connection Pool Exhaustion**: If concurrent users exceed connection pool size, requests will block. Mitigation: Monitor connection pool metrics; adjust max_connections based on load testing.
3. **SQL Injection**: If queries are not properly parameterized, system is vulnerable to SQL injection attacks. Mitigation: Enforce prepared statements for all queries; conduct security code review.
4. **Foreign Key Constraint Deadlocks**: Concurrent transactions modifying related records may deadlock. Mitigation: Implement retry logic for deadlock errors; order operations consistently.
5. **Data Loss During Transition**: Migrating from mock data to real database risks losing test data. Mitigation: Seed database with production-like test data from 004_seed_data.sql; export mock data if needed for reference.
6. **Performance Degradation**: Complex queries or missing indexes may cause slow response times. Mitigation: Use EXPLAIN to verify index usage; load test with realistic data volumes.
7. **Transaction Rollback Failures**: If atomicity is not enforced, inventory may become inconsistent with sales. Mitigation: Use database transactions for all multi-step operations; test rollback scenarios thoroughly.

## Out of Scope

- Advanced reporting and analytics dashboards (to be addressed in future feature)
- Barcode scanning integration for medicine lookup (to be addressed in future feature)
- Automated reordering from suppliers when stock is low (to be addressed in future feature)
- Multi-location/pharmacy branch support (single location only)
- Prescription management and controlled substance tracking (simple customer contact management only)
- Integration with external pharmacy management systems or insurance providers
- Mobile application for medicine inventory management
- Advanced inventory features (batch tracking across multiple batches, first-expiry-first-out (FEFO) logic)
- Financial reporting and profit/loss calculations (basic sales recording only)
- Supplier purchase order management (outstanding balance tracking only)

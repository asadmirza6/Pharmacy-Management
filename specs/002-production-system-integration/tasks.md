# Tasks: Production System Integration with Real Database

**Input**: Design documents from `/specs/002-production-system-integration/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each feature increment.

**Note**: Tests are integrated throughout based on Constitution Principle VI (TDD). Integration tests use real MySQL database, not mocks.

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US6)
- All file paths are absolute from repository root

## Path Conventions

**Repository root structure** (from plan.md):
- `services/` - Database service layer (NEW)
- `routes/` - Express route handlers (UPDATE existing)
- `middleware/` - Authentication and error handling (NEW)
- `tests/integration/` - Integration tests with real MySQL (NEW)
- `tests/unit/` - Service layer unit tests (NEW)
- `database/migrations/` - DDL scripts (from feature 001)
- `config/` - Configuration files
- `public/` - Frontend dashboard (existing)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and initialize project structure

**Deliverable**: Project ready with all dependencies installed

- [x] T001 Update package.json with new dependencies (mysql2@^3.0.0, jest@^29.0.0, supertest@^6.0.0, bcryptjs@^2.4.3, jsonwebtoken@^9.0.0)
- [x] T002 Install all npm dependencies via `npm install`
- [x] T003 [P] Create services/ directory for database service layer
- [x] T004 [P] Create middleware/ directory for auth and error handling
- [x] T005 [P] Create tests/integration/ directory for database integration tests
- [x] T006 [P] Create tests/unit/ directory for service layer unit tests
- [x] T007 Create .env.example file with all database connection variables and JWT secret template
- [x] T008 [P] Update .gitignore to exclude .env, node_modules/, *.log files

**Checkpoint**: Project structure initialized, dependencies installed

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database infrastructure that MUST be complete before ANY user story implementation

**⚠️ CRITICAL**: This phase BLOCKS all user story work

**Deliverable**: MySQL connection pool, base service layer, error handling middleware operational

- [ ] T009 Create services/db.js with MySQL connection pool using mysql2/promise (min=5, max=50, keepAlive=true)
- [ ] T010 [P] Create middleware/errorHandler.js to translate database errors (FK violations, constraint errors) to user-friendly messages
- [ ] T011 [P] Create middleware/auth.js with JWT token verification and role-based access control (Admin vs Cashier)
- [ ] T012 Update server.js to import database connection pool and verify connection on startup
- [ ] T013 Add errorHandler middleware to Express app in server.js
- [ ] T014 Create database/migrations/005_add_customers.sql for patients table and sales_transactions.patient_id FK
- [ ] T015 [P] Create .env.test file for test database configuration
- [ ] T016 [P] Create Jest configuration file (jest.config.js) with test environment setup
- [ ] T017 Test database connection by running simple SELECT query on startup (log success/failure)

**Checkpoint**: Database connection pool established, middleware configured, ready for service layer implementation

---

## Phase 3: User Story 1 - Database Schema Initialization (Priority: P1) 🎯 MVP

**Goal**: Establish real MySQL database connection and execute migration scripts so pharmacy system stores data persistently

**Independent Test**: Run migration scripts against local MySQL, verify all 7 tables created with correct schemas, confirm connection pool works, test query execution within performance targets

**Deliverable**: MySQL database with complete schema, connection pool operational, migration scripts executed

### Implementation for User Story 1

- [ ] T018 [US1] Verify MySQL 8.0+ server is installed and running locally
- [ ] T019 [US1] Create pharmacy_db database using mysql CLI with utf8mb4 charset
- [ ] T020 [US1] Create pharmacy_admin user with all privileges on pharmacy_db
- [ ] T021 [US1] Create .env file from .env.example with local database credentials
- [ ] T022 [US1] Execute database/migrations/001_create_tables.sql to create 6 base tables (medicines, suppliers, sales_transactions, sales_items, users, schema_versions)
- [ ] T023 [US1] Execute database/migrations/002_create_indexes.sql to create performance indexes
- [ ] T024 [US1] Execute database/migrations/003_create_constraints.sql to add foreign keys and check constraints
- [ ] T025 [US1] Execute database/migrations/004_seed_data.sql to insert default users and sample data
- [ ] T026 [US1] Execute database/migrations/005_add_customers.sql to create patients table and add patient_id FK to sales_transactions
- [ ] T027 [US1] Run database/scripts/validate.sh to verify all tables, indexes, and constraints exist
- [ ] T028 [US1] Test connection pool by starting server and verifying "Database connected" message in console
- [ ] T029 [US1] Write integration test tests/integration/db.connection.test.js to verify connection pool, test query execution, verify connection release

**Checkpoint**: Database fully initialized with schema, connection pool operational, migration scripts verified

---

## Phase 4: User Story 2 - Medicine Inventory with Real Database (Priority: P2)

**Goal**: Replace mock data layer with real SQL queries so medicine inventory persists and reflects real-time stock levels

**Independent Test**: Perform CRUD operations via dashboard, verify data persists in MySQL, test search, confirm low-stock alerts pull from database

**Deliverable**: Medicine service layer with SQL queries, routes updated to use service, integration tests passing

### Implementation for User Story 2

- [ ] T030 [P] [US2] Create services/medicines.js with getAllMedicines() using SELECT query
- [ ] T031 [P] [US2] Implement getMedicineById(id) in services/medicines.js using prepared statement
- [ ] T032 [P] [US2] Implement searchMedicines(query) in services/medicines.js using LIKE with prepared statements
- [ ] T033 [P] [US2] Implement getLowStockMedicines() in services/medicines.js using WHERE stock_quantity <= reorder_threshold
- [ ] T034 [US2] Implement addMedicine(medicineData) in services/medicines.js using INSERT with auto-increment medicine_id
- [ ] T035 [US2] Implement updateMedicine(id, updates) in services/medicines.js using UPDATE with prepared statement
- [ ] T036 [US2] Implement deleteMedicine(id) in services/medicines.js using DELETE (respects FK constraints)
- [ ] T037 [US2] Update routes/medicines.js to import services/medicines and replace all mock data calls with service calls
- [ ] T038 [US2] Remove data/medicines.js mock data file (no longer needed)
- [ ] T039 [US2] Write integration test tests/integration/medicines.test.js for GET /api/medicines endpoint
- [ ] T040 [US2] Write integration test tests/integration/medicines.test.js for POST /api/medicines with validation
- [ ] T041 [US2] Write integration test tests/integration/medicines.test.js for PUT /api/medicines/:id
- [ ] T042 [US2] Write integration test tests/integration/medicines.test.js for DELETE with FK constraint test
- [ ] T043 [US2] Write integration test tests/integration/medicines.test.js for search functionality
- [ ] T044 [US2] Test medicine CRUD via frontend dashboard, verify persistence across server restarts

**Checkpoint**: Medicine inventory fully operational with database persistence, all CRUD operations working, tests passing

---

## Phase 5: User Story 3 - Sales Transaction Recording (Priority: P3)

**Goal**: Create sales transactions that record purchases with line items, calculate totals, persist to database with automatic inventory deduction

**Independent Test**: Create multi-item sale, verify transaction and line items inserted, confirm stock decremented, validate historical price preservation

**Deliverable**: Sales service with transaction management, sales routes, integration tests, stock deduction working atomically

### Implementation for User Story 3

- [ ] T045 [P] [US3] Create services/sales.js with createSaleTransaction(saleData, lineItems) using MySQL transactions
- [ ] T046 [US3] Implement BEGIN/COMMIT/ROLLBACK transaction logic in createSaleTransaction for atomicity
- [ ] T047 [US3] Add INSERT into sales_transactions with calculated totals (subtotal, discount, tax, grand_total)
- [ ] T048 [US3] Add INSERT into sales_items for each line item with unit_price_at_sale from medicine.selling_price
- [ ] T049 [US3] Add UPDATE medicines SET stock_quantity = stock_quantity - ? WHERE medicine_id = ? for each item
- [ ] T050 [US3] Add stock validation check: if affectedRows = 0, throw "Insufficient stock" error and rollback
- [ ] T051 [US3] Implement getSaleTransactionById(invoiceId) to retrieve transaction with line items (JOIN query)
- [ ] T052 [US3] Implement getSaleTransactions(filters) to list transactions with date range and patient_id filters
- [ ] T053 [US3] Create routes/sales.js with POST /api/sales endpoint for creating transactions
- [ ] T054 [US3] Add GET /api/sales endpoint for listing transactions with query parameters
- [ ] T055 [US3] Add GET /api/sales/:invoice_id endpoint for transaction details
- [ ] T056 [US3] Update server.js to mount sales routes at /api/sales
- [ ] T057 [US3] Write integration test tests/integration/sales.test.js for POST /api/sales with successful transaction
- [ ] T058 [US3] Write integration test tests/integration/sales.test.js for insufficient stock error handling
- [ ] T059 [US3] Write integration test tests/integration/sales.test.js for transaction rollback on failure
- [ ] T060 [US3] Write integration test tests/integration/sales.test.js for historical price preservation (change price, verify old transaction unchanged)
- [ ] T061 [US3] Test sales workflow: create sale via API, verify stock decremented in database, check transaction record

**Checkpoint**: Sales transaction recording fully operational with atomic inventory deduction, rollback on errors, historical pricing working

---

## Phase 6: User Story 4 - Customer Management (Priority: P4)

**Goal**: Record and manage customer contact information so sales can be associated with customers for loyalty and purchase history

**Independent Test**: Create customer records, associate with sales, query purchase history, verify authentication required

**Deliverable**: Customer service layer, customer routes, purchase history queries, integration tests

### Implementation for User Story 4

- [ ] T062 [P] [US4] Create services/customers.js with createCustomer(customerData) using INSERT into patients table
- [ ] T063 [P] [US4] Implement getCustomerById(patient_id) in services/customers.js
- [ ] T064 [P] [US4] Implement getAllCustomers() in services/customers.js with optional search by name or phone
- [ ] T065 [P] [US4] Implement searchCustomers(query) using LIKE on full_name and contact_number
- [ ] T066 [US4] Implement updateCustomer(patient_id, updates) in services/customers.js
- [ ] T067 [US4] Implement deleteCustomer(patient_id) in services/customers.js (sets patient_id to NULL in sales_transactions)
- [ ] T068 [US4] Implement getCustomerPurchaseHistory(patient_id) using JOIN between sales_transactions and users
- [ ] T069 [US4] Create routes/customers.js with POST /api/customers endpoint
- [ ] T070 [US4] Add GET /api/customers and GET /api/customers/:id endpoints
- [ ] T071 [US4] Add PUT /api/customers/:id and DELETE /api/customers/:id endpoints
- [ ] T072 [US4] Add GET /api/customers/:id/purchases endpoint for purchase history
- [ ] T073 [US4] Update server.js to mount customer routes at /api/customers
- [ ] T074 [US4] Update services/sales.js to accept optional patient_id parameter in createSaleTransaction
- [ ] T075 [US4] Write integration test tests/integration/customers.test.js for customer CRUD operations
- [ ] T076 [US4] Write integration test tests/integration/customers.test.js for purchase history query
- [ ] T077 [US4] Write integration test tests/integration/customers.test.js for customer deletion (verify sales preserved)
- [ ] T078 [US4] Test customer management: create customer, associate with sale, query purchase history via API

**Checkpoint**: Customer management fully operational, purchase history tracking working, sales can be linked to customers

---

## Phase 7: User Story 5 - Comprehensive Supplier Management (Priority: P5)

**Goal**: Full supplier CRUD with balance tracking and linking to medicine inventory for procurement operations

**Independent Test**: Perform supplier CRUD, update balances, query medicines by supplier, test FK protection on delete

**Deliverable**: Supplier service layer, supplier routes, balance management, integration tests

### Implementation for User Story 5

- [ ] T079 [P] [US5] Create services/suppliers.js with createSupplier(supplierData) using INSERT
- [ ] T080 [P] [US5] Implement getSupplierById(supplier_id) in services/suppliers.js
- [ ] T081 [P] [US5] Implement getAllSuppliers() in services/suppliers.js with optional search by company_name
- [ ] T082 [P] [US5] Implement searchSuppliers(query) using LIKE on company_name
- [ ] T083 [US5] Implement updateSupplier(supplier_id, updates) in services/suppliers.js
- [ ] T084 [US5] Implement deleteSupplier(supplier_id) in services/suppliers.js (FK constraint prevents deletion if medicines exist)
- [ ] T085 [US5] Implement updateSupplierBalance(supplier_id, amount, operation) with operations: add, subtract, set
- [ ] T086 [US5] Implement getMedicinesBySupplier(supplier_id) using WHERE supplier_id = ?
- [ ] T087 [US5] Create routes/suppliers.js with POST /api/suppliers endpoint
- [ ] T088 [US5] Add GET /api/suppliers and GET /api/suppliers/:id endpoints
- [ ] T089 [US5] Add PUT /api/suppliers/:id and DELETE /api/suppliers/:id endpoints
- [ ] T090 [US5] Add PUT /api/suppliers/:id/balance endpoint for balance updates
- [ ] T091 [US5] Add GET /api/suppliers/:id/medicines endpoint for supplier inventory query
- [ ] T092 [US5] Update server.js to mount supplier routes at /api/suppliers
- [ ] T093 [US5] Write integration test tests/integration/suppliers.test.js for supplier CRUD operations
- [ ] T094 [US5] Write integration test tests/integration/suppliers.test.js for balance update operations
- [ ] T095 [US5] Write integration test tests/integration/suppliers.test.js for FK constraint protection (cannot delete with medicines)
- [ ] T096 [US5] Write integration test tests/integration/suppliers.test.js for medicines by supplier query
- [ ] T097 [US5] Test supplier management: create supplier, link medicines, update balance, attempt delete with medicines

**Checkpoint**: Supplier management fully operational, balance tracking working, FK constraints enforced, medicines linkage verified

---

## Phase 8: User Story 6 - User Authentication and Authorization (Priority: P6)

**Goal**: Implement login with role-based access control so sensitive operations restricted by user role with audit trail

**Independent Test**: Create admin and cashier users, login with credentials, verify role-based route protection, confirm audit logging

**Deliverable**: Authentication service, auth routes, JWT middleware, role checks, integration tests

### Implementation for User Story 6

- [ ] T098 [P] [US6] Create services/auth.js with login(username, password) that queries users table and verifies bcrypt hash
- [ ] T099 [P] [US6] Implement generateToken(user) in services/auth.js using jsonwebtoken with user_id, username, role in payload
- [ ] T100 [P] [US6] Implement verifyToken(token) in services/auth.js to decode JWT and return user payload
- [ ] T101 [US6] Implement createUser(userData) in services/auth.js with bcrypt hashing (cost factor 12)
- [ ] T102 [US6] Implement updateUser(user_id, updates) in services/auth.js
- [ ] T103 [US6] Implement deactivateUser(user_id) in services/auth.js (sets is_active = FALSE, not DELETE)
- [ ] T104 [US6] Implement getAllUsers() in services/auth.js (Admin only)
- [ ] T105 [US6] Update middleware/auth.js to extract JWT from Authorization header and attach user to req.user
- [ ] T106 [US6] Add requireAuth middleware to reject requests without valid token
- [ ] T107 [US6] Add requireRole(['Admin']) middleware to restrict endpoints to Admin role only
- [ ] T108 [US6] Create routes/auth.js with POST /api/auth/login endpoint
- [ ] T109 [US6] Add POST /api/auth/logout endpoint (client-side token removal)
- [ ] T110 [US6] Add GET /api/auth/me endpoint to return current user info
- [ ] T111 [US6] Add POST /api/auth/users endpoint for creating users (Admin only)
- [ ] T112 [US6] Add GET /api/auth/users endpoint for listing users (Admin only)
- [ ] T113 [US6] Add PUT /api/auth/users/:id endpoint for updating users (Admin only)
- [ ] T114 [US6] Add DELETE /api/auth/users/:id endpoint for deactivating users (Admin only)
- [ ] T115 [US6] Update server.js to mount auth routes at /api/auth
- [ ] T116 [US6] Apply requireAuth middleware to protected routes (medicines DELETE, suppliers, customers, sales)
- [ ] T117 [US6] Apply requireRole(['Admin']) to sensitive endpoints (user management, price changes, deletions)
- [ ] T118 [US6] Update services/sales.js to record user_id from req.user in sales_transactions for audit trail
- [ ] T119 [US6] Write integration test tests/integration/auth.test.js for login with valid credentials
- [ ] T120 [US6] Write integration test tests/integration/auth.test.js for login with invalid credentials (401 error)
- [ ] T121 [US6] Write integration test tests/integration/auth.test.js for accessing protected route without token (401 error)
- [ ] T122 [US6] Write integration test tests/integration/auth.test.js for Cashier attempting Admin-only operation (403 error)
- [ ] T123 [US6] Write integration test tests/integration/auth.test.js for user creation with password hashing verification
- [ ] T124 [US6] Test authentication flow: login as admin, get token, access protected endpoint, verify role enforcement

**Checkpoint**: Authentication and authorization fully operational, JWT working, role-based access enforced, audit logging in place

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, optimization, validation, and final testing across all user stories

**Deliverable**: Production-ready system with complete documentation, optimized performance, comprehensive tests passing

- [ ] T125 [P] Update README.md with setup instructions referencing quickstart.md
- [ ] T126 [P] Document all API endpoints in docs/API.md (or reference OpenAPI specs in contracts/)
- [ ] T127 [P] Create environment setup guide docs/SETUP.md with .env configuration details
- [ ] T128 [P] Add JSDoc comments to all service layer functions (services/*.js)
- [ ] T129 Test all API endpoints using Postman or similar tool, create collection for reference
- [ ] T130 Run all integration tests with npm test and verify 100% pass rate
- [ ] T131 [P] Optimize database queries: add EXPLAIN to slow queries, verify index usage
- [ ] T132 [P] Add connection pool monitoring: log active connections, queue length on /health endpoint
- [ ] T133 Perform load testing with 100 concurrent requests to verify performance targets (<500ms medicine lookups, <1s sales)
- [ ] T134 [P] Security audit: verify all passwords hashed, no SQL injection vulnerabilities (use prepared statements only), JWT secrets not hardcoded
- [ ] T135 [P] Run ESLint on all JavaScript files and fix linting errors
- [ ] T136 Update frontend dashboard (public/index.html) to include customer selection dropdown in sales workflow
- [ ] T137 Update frontend to display purchase history when customer is selected
- [ ] T138 [P] Add login page UI for authentication (public/login.html)
- [ ] T139 Update frontend to store JWT token and include in Authorization header for API requests
- [ ] T140 Run complete end-to-end test: login, create customer, add medicine, record sale, verify purchase history, check stock deduction
- [ ] T141 Verify all 94 tasks from original specification scope are covered in this task list
- [ ] T142 Create migration rollback scripts if needed (database/rollback/v005_rollback.sql)
- [ ] T143 [P] Set up automated database backup script (database/scripts/backup.sh) if not exists
- [ ] T144 Update CLAUDE.md with production database integration notes and architecture decisions

**Checkpoint**: System fully production-ready, all tests passing, documentation complete, performance validated

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - **BLOCKS all user stories**
- **User Stories (Phases 3-8)**: All depend on Foundational phase completion
  - User stories CAN run in parallel (different developers/teams)
  - Or sequentially in priority order: US1 → US2 → US3 → US4 → US5 → US6
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Independent - only depends on Foundational
- **US2 (P2)**: Independent - only depends on Foundational (medicines table exists from US1 migrations)
- **US3 (P3)**: Depends on US2 (needs medicines service for stock deduction)
- **US4 (P4)**: Depends on US3 (links customers to sales transactions)
- **US5 (P5)**: Independent - only depends on Foundational (suppliers table exists from US1 migrations)
- **US6 (P6)**: Independent - only depends on Foundational (users table exists from US1 migrations)

### Recommended Completion Order

1. Setup (Phase 1) → Foundational (Phase 2) → **STOP** (validate connection)
2. US1 (P1) - Database initialization → **STOP** (validate schema)
3. US2 (P2) - Medicine inventory → **STOP** (test CRUD) **← MVP COMPLETE**
4. US3 (P3) - Sales transactions → **STOP** (test sales workflow)
5. US6 (P6) - Authentication → **STOP** (test login and RBAC)
6. US4 (P4) - Customer management → **STOP** (test purchase history)
7. US5 (P5) - Supplier management → **STOP** (test balance tracking)
8. Polish (Phase 9) → Final validation

### Parallel Opportunities

**Within Setup Phase**:
- T003, T004, T005, T006, T008 can all run in parallel (different directories)

**Within Foundational Phase**:
- T010, T011, T015, T016 can run in parallel (different files)

**Within Each User Story Phase**:
- Service function implementations marked [P] can run in parallel (different functions)
- Integration test files can be written in parallel
- Models/entities (if applicable) can be created in parallel

**Across User Stories** (if team capacity allows):
- US2, US5, US6 can all start in parallel after Foundational completes (independent)
- US3 starts after US2 completes
- US4 starts after US3 completes

**Within Polish Phase**:
- T125-T128, T131-T135, T143-T144 can run in parallel (different files/concerns)

---

## Parallel Example: User Story 2

```
# After Foundational Phase completes, launch US2 service functions together:
Task T030: "Create services/medicines.js with getAllMedicines()"
Task T031: "Implement getMedicineById(id)"
Task T032: "Implement searchMedicines(query)"
Task T033: "Implement getLowStockMedicines()"

# Once services complete, integration tests can run in parallel:
Task T039: "Write integration test for GET /api/medicines"
Task T040: "Write integration test for POST /api/medicines"
Task T041: "Write integration test for PUT /api/medicines/:id"
Task T042: "Write integration test for DELETE with FK constraint"
Task T043: "Write integration test for search functionality"
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

**Goal**: Minimum viable product with database and medicine inventory

1. Complete Phase 1: Setup (T001-T008)
2. Complete Phase 2: Foundational (T009-T017)
3. Complete Phase 3: US1 Database Initialization (T018-T029)
4. Complete Phase 4: US2 Medicine Inventory (T030-T044)
5. **STOP and VALIDATE**: Test medicine CRUD operations, verify persistence
6. **MVP READY**: Database-backed medicine inventory operational

**Total MVP Tasks**: 44 tasks

### Incremental Delivery

Each user story adds independent value:

1. **MVP (US1 + US2)**: Database + Medicine inventory → Can track inventory in production
2. **+US3**: Sales transactions → Can record sales and auto-deduct stock
3. **+US6**: Authentication → Can enforce role-based access control
4. **+US4**: Customer management → Can track purchase history for loyalty
5. **+US5**: Supplier management → Can manage procurement and balances
6. **+Polish**: Production-ready with docs and optimization

### Parallel Team Strategy

With 3 developers after Foundational phase completes:

- **Developer A**: US1 (migrations) → US2 (medicines) → US3 (sales)
- **Developer B**: US6 (auth) → US4 (customers)
- **Developer C**: US5 (suppliers) → Polish tasks

Stories merge independently without conflicts (different service files).

---

## Task Summary

**Total Tasks**: 144 tasks

**Tasks by Phase**:
- Phase 1 (Setup): 8 tasks
- Phase 2 (Foundational): 9 tasks
- Phase 3 (US1 - Database): 12 tasks
- Phase 4 (US2 - Medicine Inventory): 15 tasks
- Phase 5 (US3 - Sales Transactions): 17 tasks
- Phase 6 (US4 - Customer Management): 17 tasks
- Phase 7 (US5 - Supplier Management): 19 tasks
- Phase 8 (US6 - Authentication): 27 tasks
- Phase 9 (Polish): 20 tasks

**Parallelizable Tasks**: 38 tasks marked with [P]

**MVP Scope**: 44 tasks (Phases 1-4: Setup + Foundational + US1 + US2)

**Constitution Compliance**: All tasks support constitution principles (Data Integrity via transactions, Performance via connection pooling, Security via prepared statements and RBAC, TDD via integration tests)

**Format Validation**: ✅ All tasks follow `- [ ] T### [P?] [Story?] Description with file path` format

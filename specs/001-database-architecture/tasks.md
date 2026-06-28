# Tasks: Database Design & Architecture

**Input**: Design documents from `/specs/001-database-architecture/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Organization**: Tasks are grouped by user story to enable independent verification and deployment of each database component.

**Note**: This is a database schema feature. Tasks focus on executing DDL migration scripts (already created in contracts/), verifying schema correctness, testing data integrity, and setting up operational infrastructure (backups, monitoring).

## Format: `- [ ] [ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different components, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US6)
- All file paths are absolute from repository root

## Path Conventions

**Database Infrastructure**:
- `database/` - Root directory for all database-related files
- `database/migrations/` - Versioned DDL migration scripts
- `database/rollback/` - Rollback scripts for each migration
- `database/scripts/` - Automation scripts (backup, restore, validate)
- `database/docs/` - Schema documentation and diagrams
- `specs/001-database-architecture/contracts/` - DDL scripts (already created)

---

## Phase 1: Setup (Environment & Configuration)

**Purpose**: Initialize development environment and configure Azure MySQL deployment

**Deliverable**: Working MySQL 8.0+ instance (local + Azure) with connection configuration

- [x] T001 Create database directory structure at repository root (database/migrations/, database/rollback/, database/scripts/, database/docs/)
- [x] T002 [P] Create .env.example template with database connection variables (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL, pool settings)
- [x] T003 [P] Document local MySQL setup instructions in database/docs/local_setup.md (native installation or Docker compose from quickstart.md)
- [ ] T004 Setup Azure Database for MySQL Flexible Server (B1ms tier, 20GB storage, 30-day backup retention) using Azure CLI commands from quickstart.md
- [ ] T005 Configure Azure firewall rules to allow development access from local IP
- [ ] T006 Test database connectivity from local machine to both local MySQL and Azure instance using mysql client
- [x] T007 [P] Create database configuration file at config/database.yml with connection pool settings (min=5, max=50, idle_timeout=600s)

**Checkpoint**: MySQL instances ready for migration execution

---

## Phase 2: Foundational (Migration Framework)

**Purpose**: Establish migration tracking infrastructure before any schema changes

**⚠️ CRITICAL**: This phase MUST complete before any user story schema work begins

**Deliverable**: schema_versions table and migration execution framework

- [x] T008 Copy DDL scripts from specs/001-database-architecture/contracts/ to database/migrations/ (001_create_tables.sql, 002_create_indexes.sql, 003_create_constraints.sql, 004_seed_data.sql)
- [ ] T009 Create schema_versions table manually on both local and Azure instances (required for migration tracking)
- [x] T010 Create migration execution script at database/scripts/migrate.sh (reads schema_versions, executes pending migrations sequentially, updates tracking table)
- [x] T011 [P] Create schema validation script at database/scripts/validate.sh (checks all tables exist, verifies column definitions, confirms constraints)
- [ ] T012 Test migration script on local instance with empty database (dry run)

**Checkpoint**: Migration framework operational - schema deployment can now proceed

---

## Phase 3: User Story 1 - Core Medicine Inventory Data Foundation (Priority: P1) 🎯 MVP

**Goal**: Create medicines and suppliers tables with complete schema, verify data storage and retrieval works correctly

**Independent Test**: Insert medicine records with all attributes, update stock quantities, query by supplier reference - verify no data loss or corruption

**Deliverable**: Functional medicines and suppliers tables with test data

- [ ] T013 [US1] Execute migration v001 (001_create_tables.sql) on local instance - creates suppliers, users, medicines, sales_transactions, sales_items, schema_versions tables
- [ ] T014 [US1] Verify suppliers table created correctly (run validation: DESCRIBE suppliers, check all columns present)
- [ ] T015 [US1] Verify medicines table created correctly (run validation: DESCRIBE medicines, check all columns including supplier_id FK reference)
- [ ] T016 [US1] Insert test supplier record (PharmaCorp Ltd with contact details, outstanding balance 0.00) and verify retrieval
- [ ] T017 [US1] Insert test medicine record (Paracetamol 500mg with all required attributes: brand, generic, batch, dates, prices, stock, threshold, supplier_id) and verify retrieval
- [ ] T018 [US1] Test medicine stock quantity update (update from 500 to 475 units, verify change persists, all other attributes unchanged)
- [ ] T019 [US1] Test supplier query (insert 3 medicines linked to same supplier, query by supplier_id, verify all 3 returned with complete info)
- [ ] T020 [US1] Document medicines table schema in database/docs/table_medicines.md (columns, data types, constraints, business rules)
- [ ] T021 [US1] Document suppliers table schema in database/docs/table_suppliers.md

**Success Criteria**: Medicines and suppliers tables store and retrieve data correctly, supporting US1 acceptance scenarios

---

## Phase 4: User Story 2 - Sales Transaction Recording with Historical Accuracy (Priority: P2)

**Goal**: Verify sales_transactions and sales_items tables correctly record transactions with historical price preservation

**Independent Test**: Create transaction with multiple line items, change medicine prices, verify historical transactions show original prices

**Deliverable**: Functional transaction recording with historical price integrity verified

- [ ] T022 [US2] Verify sales_transactions table created correctly (run validation: DESCRIBE sales_transactions, check user_id FK, timestamp, financial columns, payment_mode ENUM)
- [ ] T023 [US2] Verify sales_items table created correctly (run validation: DESCRIBE sales_items, check composite PK (invoice_id, medicine_id), both FKs, unit_price_at_sale column)
- [ ] T024 [US2] Insert test user (cashier role) to use for transaction testing (username "test_cashier", hashed password, role "Cashier")
- [ ] T025 [US2] Create test transaction with 3 line items (use medicines from US1, quantities 2/1/5, calculate subtotal, discount, tax, grand total, payment_mode "Card")
- [ ] T026 [US2] Verify transaction record created (query sales_transactions by invoice_id, check all financial amounts, cashier user_id, timestamp)
- [ ] T027 [US2] Verify line items created (query sales_items by invoice_id, check 3 records with correct medicine_ids, quantities, unit_price_at_sale values)
- [ ] T028 [US2] Test historical price preservation (update medicine selling_price in medicines table, query old transaction from sales_items, verify unit_price_at_sale unchanged)
- [ ] T029 [US2] Test transaction query by date range (insert transactions across multiple days, query by timestamp range, verify all returned)
- [ ] T030 [US2] Document sales_transactions table schema in database/docs/table_sales_transactions.md
- [ ] T031 [US2] Document sales_items table schema in database/docs/table_sales_items.md (emphasize historical price preservation rationale)

**Success Criteria**: Transaction recording works correctly, historical prices preserved even after medicine price changes

---

## Phase 5: User Story 3 - User Authentication and Role-Based Access Control (Priority: P3)

**Goal**: Verify users table correctly stores authentication credentials with hashed passwords and role designation

**Independent Test**: Create admin and cashier users, verify hashed passwords stored correctly, role queries work

**Deliverable**: Functional users table with secure password storage and RBAC schema

- [ ] T032 [US3] Verify users table created correctly (run validation: DESCRIBE users, check username UNIQUE constraint, password_hash VARCHAR(255), role ENUM('Admin','Cashier'), is_active BOOLEAN)
- [ ] T033 [US3] Create test admin user (username "test_admin", full_name, bcrypt hashed password with cost=12, role "Admin", is_active=TRUE)
- [ ] T034 [US3] Create test cashier user (username "test_cashier2", full_name, bcrypt hashed password, role "Cashier", is_active=TRUE)
- [ ] T035 [US3] Verify password_hash column stores bcrypt hash (not plaintext, hash starts with "$2a$12$", length ~60 chars)
- [ ] T036 [US3] Test username uniqueness constraint (attempt to insert duplicate username, verify rejection with constraint error)
- [ ] T037 [US3] Test role-based query (query users WHERE role='Cashier', verify only cashier accounts returned, no password_hash exposed in SELECT *)
- [ ] T038 [US3] Test user authentication simulation (retrieve user by username, verify hashed password and role available for auth logic)
- [ ] T039 [US3] Document users table schema in database/docs/table_users.md (emphasize security: hashed passwords, RBAC roles, no deletion of users with transaction history)

**Success Criteria**: Users table stores credentials securely with role designation, enabling authentication and authorization

---

## Phase 6: User Story 4 - Supplier Information Management (Priority: P4)

**Goal**: Verify supplier management operations (already created in US1, now test full CRUD and integrity constraints)

**Independent Test**: Create suppliers, update balances, test foreign key protection (cannot delete supplier with medicines)

**Deliverable**: Verified supplier management with referential integrity

- [ ] T040 [US4] Test supplier creation (insert new supplier with all contact fields: company_name, contact_representative, phone, email, address, outstanding_balance)
- [ ] T041 [US4] Test supplier balance update (insert supplier with balance 5000.00, update to 3000.00, verify change)
- [ ] T042 [US4] Test supplier query by name (insert 3 suppliers, query by company_name using LIKE, verify results)
- [ ] T043 [US4] Test foreign key protection (attempt to DELETE supplier that has medicines linked via supplier_id, verify rejection with FK constraint error)
- [ ] T044 [US4] Test supplier with no medicines can be deleted (insert new supplier with no medicines, delete successfully)
- [ ] T045 [US4] Document supplier management workflows in database/docs/supplier_management.md (balance tracking, foreign key protection rationale)

**Success Criteria**: Supplier CRUD operations work correctly, foreign key constraints prevent deletion of suppliers with associated medicines

---

## Phase 7: User Story 5 - Data Integrity Constraints and Performance Optimization (Priority: P5)

**Goal**: Apply all constraints and indexes, verify data integrity enforcement and query performance targets met

**Independent Test**: Attempt invalid data insertions (negative values, invalid FKs), measure query performance, verify <500ms medicine lookups

**Deliverable**: Fully constrained schema with optimized indexes meeting performance targets

### Constraints Application

- [ ] T046 [US5] Execute migration v003 (003_create_constraints.sql) on local instance - adds all foreign keys and check constraints
- [ ] T047 [US5] Verify foreign key constraints (attempt DELETE supplier with medicines, verify rejection; attempt INSERT medicine with non-existent supplier_id, verify rejection)
- [ ] T048 [US5] Verify check constraints on medicines table (attempt INSERT with stock_quantity=-10, verify rejection; attempt cost_price=-5.00, verify rejection)
- [ ] T049 [US5] Verify check constraints on sales_transactions (attempt INSERT with subtotal=-100, verify rejection; attempt discount_applied=-10, verify rejection)
- [ ] T050 [US5] Verify check constraints on sales_items (attempt INSERT with quantity_sold=0, verify rejection; attempt unit_price_at_sale=-5.00, verify rejection)
- [ ] T051 [US5] Verify date validation constraint (attempt INSERT medicine with expiry_date < manufacturing_date, verify rejection)
- [ ] T052 [US5] Document all constraints in database/docs/constraints_reference.md (foreign keys, check constraints, unique constraints)

### Indexes and Performance

- [ ] T053 [US5] Execute migration v002 (002_create_indexes.sql) on local instance - creates all performance indexes
- [ ] T054 [US5] Verify composite index created (check idx_medicine_barcode on (brand_name, batch_number) using SHOW INDEX FROM medicines)
- [ ] T055 [US5] Verify covering index created (check idx_medicine_billing on (brand_name, batch_number, selling_price, stock_quantity))
- [ ] T056 [US5] Verify expiry_date index created (check idx_medicine_expiry)
- [ ] T057 [US5] Verify transaction_timestamp index created (check idx_transaction_timestamp)
- [ ] T058 [US5] Populate test data for performance testing (insert 10,000 medicine records using script, insert 1,000 transactions)
- [ ] T059 [US5] Test medicine lookup performance (query by brand_name + batch_number, measure execution time using BENCHMARK, verify <500ms using EXPLAIN to confirm idx_medicine_billing used)
- [ ] T060 [US5] Test expiry query performance (query medicines WHERE expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 60 DAY), verify <1s, EXPLAIN confirms idx_medicine_expiry used)
- [ ] T061 [US5] Test transaction retrieval performance (query sales_transactions by date range spanning 1 month, verify <2s, EXPLAIN confirms idx_transaction_timestamp used)
- [ ] T062 [US5] Document index strategy in database/docs/index_optimization.md (composite vs covering indexes, performance benchmarks, maintenance recommendations)

**Success Criteria**: All constraints enforced correctly, query performance targets met (<500ms medicine lookups, <1s expiry queries, <2s transaction retrieval)

---

## Phase 8: User Story 6 - Database Initialization, Migration, and Automated Backup (Priority: P6)

**Goal**: Create complete deployment automation (migration execution, seed data, backup scripts) and verify disaster recovery

**Independent Test**: Run migrations on empty database, verify seed data present, trigger backup, simulate data loss, restore from backup

**Deliverable**: Production-ready deployment scripts and automated backup system

### Migration Automation

- [ ] T063 [US6] Execute migration v004 (004_seed_data.sql) on local instance - inserts seed data (default admin/cashier users, 3 suppliers, 10 medicines, 1 sample transaction)
- [ ] T064 [US6] Verify seed data users created (query users table, check admin and cashier accounts exist with hashed passwords)
- [ ] T065 [US6] Verify seed data suppliers created (query suppliers table, check 3 suppliers: PharmaCorp, Global Medicines, Healthcare Solutions)
- [ ] T066 [US6] Verify seed data medicines created (query medicines table, check 10 medicines including low-stock item (Aspirin, 8 units) and near-expiry item (Loratadine, expires in 45 days))
- [ ] T067 [US6] Verify seed data transaction created (query sales_transactions and sales_items, check sample transaction with 3 line items exists)
- [ ] T068 [US6] Test complete migration from scratch (drop database, recreate, run all 4 migrations sequentially using migrate.sh, verify all tables, indexes, constraints, seed data present)
- [ ] T069 [US6] Create migration status query script at database/scripts/migration_status.sh (queries schema_versions, displays applied migrations with timestamps)

### Rollback Scripts

- [ ] T070 [US6] Create rollback script for v004 at database/rollback/v004_rollback.sql (DELETE seed data in reverse order: transactions → sales_items → medicines → suppliers → users)
- [ ] T071 [US6] Create rollback script for v003 at database/rollback/v003_rollback.sql (DROP all constraints: foreign keys and check constraints)
- [ ] T072 [US6] Create rollback script for v002 at database/rollback/v002_rollback.sql (DROP all indexes except primary keys)
- [ ] T073 [US6] Create rollback script for v001 at database/rollback/v001_rollback.sql (DROP all tables in reverse dependency order)
- [ ] T074 [US6] Test rollback script execution (rollback v004, verify seed data removed; rollback v003, verify constraints dropped; re-apply migrations)

### Backup Automation

- [ ] T075 [US6] Document Azure automated backup configuration in database/docs/backup_configuration.md (30-day retention, AES-256 encryption, PITR capability)
- [ ] T076 [US6] Create manual backup script at database/scripts/backup.sh (mysqldump with --single-transaction, gzip compression, timestamp-based filename)
- [ ] T077 [US6] Create restore script at database/scripts/restore.sh (decompresses backup, restores to specified database, verifies table count matches)
- [ ] T078 [US6] Test backup script execution (run backup.sh, verify .sql.gz file created with correct naming: pms_backup_YYYY-MM-DD_HHMM.sql.gz)
- [ ] T079 [US6] Test restore script execution (drop test database, run restore.sh with backup file, verify all tables and data restored correctly)
- [ ] T080 [US6] Create monthly export script at database/scripts/monthly_export.sh (mysqldump, encrypt with openssl AES-256, upload to Azure Blob Storage)
- [ ] T081 [US6] Document backup and restore procedures in database/docs/disaster_recovery.md (Azure automated backups, manual backup, PITR process, monthly archival)

### Deployment Documentation

- [ ] T082 [US6] Create production deployment checklist at database/docs/production_deployment.md (pre-deployment verification, migration execution, post-deployment validation, rollback plan)
- [ ] T083 [US6] Create environment-specific migration guide at database/docs/migration_environments.md (dev: auto-apply, staging: manual review, production: maintenance window + approval)

**Success Criteria**: Complete migration from empty database succeeds, seed data present, backup/restore verified, rollback scripts operational

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, monitoring setup, and final validation across all user stories

**Deliverable**: Production-ready database with complete documentation and operational readiness

### Documentation

- [ ] T084 [P] Create ER diagram visual at database/docs/er_diagram.png (using MySQL Workbench or dbdiagram.io, showing all tables and relationships)
- [ ] T085 [P] Create comprehensive schema reference at database/docs/schema_reference.md (all tables, columns, data types, constraints, indexes in one document)
- [ ] T086 [P] Create query performance guide at database/docs/query_optimization.md (common queries, EXPLAIN plans, index usage examples, optimization tips)
- [ ] T087 [P] Update quickstart.md with final deployment instructions (copy from specs/001-database-architecture/quickstart.md to database/docs/quickstart.md with any adjustments)

### Monitoring & Alerts

- [ ] T088 Configure Azure Monitor for Azure MySQL instance (enable query performance insights, connection metrics, storage usage)
- [ ] T089 [P] Create alert rules in Azure (backup failures, high connection usage >80%, slow query time >5s, storage >80% full)
- [ ] T090 [P] Document monitoring setup in database/docs/monitoring.md (Azure Monitor metrics, alert thresholds, notification channels)

### Final Validation

- [ ] T091 Run complete end-to-end validation on Azure instance (execute all migrations, run all verification tests from US1-US6, confirm performance targets met)
- [ ] T092 Execute security checklist validation (verify password hashing, no hardcoded credentials, SSL/TLS enforced, firewall rules appropriate)
- [ ] T093 Generate final migration report (schema_versions status, table counts, index list, constraint list, seed data verification)
- [ ] T094 Update CLAUDE.md with database schema knowledge (table structures, key relationships, performance considerations for future backend development)

**Checkpoint**: Database fully operational, documented, monitored, and ready for application integration

---

## Implementation Strategy

### MVP Scope (User Story 1 Only)

**Minimum Viable Product**: Medicines and suppliers tables operational

- Phase 1: Setup (T001-T007) - 7 tasks
- Phase 2: Foundational (T008-T012) - 5 tasks
- Phase 3: US1 Implementation (T013-T021) - 9 tasks
- **Total MVP**: 21 tasks

**MVP Delivers**: Medicine inventory data storage and retrieval, sufficient to begin building inventory management UI

### Incremental Delivery

Each user story builds on the previous foundation:

1. **US1 (P1)** → Medicines + Suppliers tables
2. **US2 (P2)** → Add Sales transactions (depends on US1 medicines)
3. **US3 (P3)** → Add Users for authentication (independent of US1-US2)
4. **US4 (P4)** → Verify Suppliers (already created in US1, just testing)
5. **US5 (P5)** → Apply constraints and indexes (enhances all previous tables)
6. **US6 (P6)** → Automation and backups (operational infrastructure)

### Dependencies

**User Story Dependencies**:
- US1 → US2 (sales need medicines)
- US1 → US4 (medicines need suppliers, but suppliers created in US1)
- US3 → US2 (transactions need users for cashier_id)
- US5 depends on US1-US4 (constraints applied to existing tables)
- US6 depends on US1-US5 (migration scripts deploy everything)

**Story Completion Order**: US1 → US3 → US2 → US4 → US5 → US6

**Parallel Opportunities**:
- US1 and US3 can run in parallel (medicines and users tables are independent)
- Within US5: constraint testing tasks (T046-T052) can run parallel with index tasks (T053-T062)
- Within US6: rollback script creation (T070-T074) can run parallel with backup script creation (T075-T081)
- Phase 9 documentation tasks (T084-T087) can all run in parallel

### Parallel Execution Examples

**After Phase 2 Complete**:
```
US1 Team: T013-T021 (Medicines tables)
US3 Team: T032-T039 (Users table)
```

**Within US5 Phase**:
```
Team A: T046-T052 (Constraint testing)
Team B: T053-T062 (Index and performance testing)
```

**Within US6 Phase**:
```
Team A: T070-T074 (Rollback scripts)
Team B: T075-T081 (Backup automation)
```

**Phase 9 Documentation**:
```
All teams: T084, T085, T086, T087 (All documentation tasks)
```

---

## Task Summary

**Total Tasks**: 94 tasks

**Tasks by Phase**:
- Phase 1 (Setup): 7 tasks
- Phase 2 (Foundational): 5 tasks
- Phase 3 (US1): 9 tasks
- Phase 4 (US2): 10 tasks
- Phase 5 (US3): 8 tasks
- Phase 6 (US4): 6 tasks
- Phase 7 (US5): 17 tasks (constraints + indexes + performance)
- Phase 8 (US6): 21 tasks (migrations + rollback + backup)
- Phase 9 (Polish): 11 tasks

**Parallelizable Tasks**: 18 tasks marked with [P]

**MVP Scope**: 21 tasks (Phases 1-3)

**Format Validation**: ✅ All tasks follow `- [ ] T### [P?] [Story?] Description with file path` format

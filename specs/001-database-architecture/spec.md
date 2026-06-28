# Feature Specification: Database Design & Architecture

**Feature Branch**: `001-database-architecture`  
**Created**: 2026-06-22  
**Status**: Draft  
**Input**: User description: "PHASE 1 SPECIFICATION: DATABASE DESIGN & ARCHITECTURE — OBJECTIVE & ARCHITECTURAL PATTERN: The primary goal of Phase 1 is to establish a secure, scalable, and highly performant relational database schema alongside a robust backend boilerplate architecture tailored for the Pharmacy Management System. The backend will follow a clean, spec-driven architectural pattern utilizing a modular Model-View-Controller (MVC) or microservices-ready structure on Microsoft Azure, strictly decoupling business logic from data access layers to ensure asynchronous operations can handle rapid database queries in under one second. DATABASE SCHEDULING & CORE REPOSITORIES: The relational database schema will be normalized up to the Third Normal Form (3NF) to eliminate data redundancy and will feature four core data repositories, starting with the Inventory and Medicine Table Collection containing attributes for Medicine ID (Primary Key), Brand Name, Generic Formulation Name, Batch Number, Manufacturing Date, Expiry Date (indexed for rapid query alerts), Cost Price, Selling Price, Total Stock Quantity, Reorder Threshold Level, and Supplier ID (Foreign Key), followed by the Sales and Transactions Table Collection comprising Invoice ID (Primary Key), Cashier User ID (Foreign Key), Transaction Timestamp, Subtotal, Discount Applied, Tax Amount, Grand Total, Payment Mode (Cash, Card, Wallet), and an associated Sales Items Junction Table capturing the specific Medicine ID, Quantity Sold, and Unit Price at the time of purchase to maintain absolute historical financial accuracy despite future price modifications. SUPPLIER AND USER RBAC TABLES: The schema continues with the Supplier Management Table Collection storing Supplier ID (Primary Key), Company Name, Contact Representative, Phone Number, Email Address, Physical Address, and Outstanding Ledger Balance, concluding with the User Authentication and RBAC Table Collection holding User ID (Primary Key), Full Name, Username, Hashed Password (utilizing bcrypt or Argon2id), Contact Details, and a specialized Role Designation (Admin or Cashier) which will be mapped to specific API middleware to strictly enforce row-level and column-level database access permissions. DATA INTEGRITY CONSTRAINTS & INDEXES: To guarantee rock-solid data reliability, the database engine will strictly enforce foreign key cascading restrictions preventing the deletion of any supplier or medicine that possesses an active transaction history, utilize composite database indexes on the combination of Medicine Name and Batch Number to optimize lookup speeds during high-volume barcode scanning, and establish field-level check constraints to ensure stock levels and pricing attributes can never store negative values. INITIALIZATION & BACKUP MIGRATION SCRIPTS: Phase 1 will conclude with the engineering of executable SQL Data Definition Language (DDL) migration scripts that programmatically construct the entire database infrastructure, populate the user tables with initial seed data, and script a cron-job database procedure on the server to execute daily automated schema backups, outputting encrypted backup files to secure storage buckets for comprehensive disaster recovery readiness."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Core Medicine Inventory Data Foundation (Priority: P1)

As a pharmacy owner, I need a reliable system to store and retrieve complete medicine inventory information including brand names, generic formulations, batch numbers, expiry dates, pricing, and stock levels so that all pharmacy operations have access to accurate, up-to-date medicine data.

**Why this priority**: This is the foundational data structure upon which all other pharmacy operations depend. Without accurate medicine inventory data, billing, expiry alerts, and reorder management cannot function. This delivers immediate value by establishing the single source of truth for all medicine information.

**Independent Test**: Can be fully tested by inserting medicine records with all required attributes (brand name, generic name, batch number, dates, prices, quantities, supplier reference) and verifying data retrieval returns accurate, complete information without data loss or corruption. Delivers value by enabling manual data entry and retrieval even before automated features are built.

**Acceptance Scenarios**:

1. **Given** no existing medicine records, **When** a new medicine is added with all required attributes (brand name "Paracetamol 500mg", generic name "Acetaminophen", batch "B2024-001", manufacturing date "2024-01-15", expiry date "2027-01-14", cost price 5.00, selling price 8.50, stock quantity 500, reorder threshold 50, supplier reference), **Then** the system stores the record with a unique identifier and all attributes are retrievable without modification.

2. **Given** an existing medicine record, **When** stock quantity is updated from 500 to 475 units, **Then** the system reflects the new quantity accurately and maintains all other attributes unchanged.

3. **Given** multiple medicines from the same supplier, **When** querying by supplier reference, **Then** the system returns all associated medicines with complete information.

---

### User Story 2 - Sales Transaction Recording with Historical Accuracy (Priority: P2)

As a pharmacy owner, I need every sale transaction recorded with complete details including which cashier processed it, what items were sold, quantities, prices at time of sale, discounts, taxes, and payment method so that I have a complete, auditable financial history even if product prices change later.

**Why this priority**: Accurate sales recording is critical for financial accountability, regulatory compliance, and business analytics. The junction table design preserving prices at time of sale ensures historical financial accuracy is never compromised by future price changes. This is the second-highest priority because billing operations depend on this structure.

**Independent Test**: Can be fully tested by creating sample sales transactions with multiple line items, applying discounts and taxes, and verifying that all transaction details are stored correctly. After changing medicine prices, verify that historical transactions still show the original prices. Delivers value by enabling accurate financial record-keeping from day one.

**Acceptance Scenarios**:

1. **Given** a cashier is processing a sale, **When** a transaction is created with 3 different medicines (quantities 2, 1, 5), subtotal 150.00, discount 10.00, tax 14.00, grand total 154.00, payment mode "Card", **Then** the system creates an invoice record with unique ID, cashier reference, timestamp, all financial amounts, and a sales items record for each medicine preserving the exact unit price charged.

2. **Given** a completed transaction from yesterday selling Medicine A at 10.00 per unit, **When** Medicine A's price is updated to 12.00 today, **Then** the historical transaction record still shows 10.00 as the unit price for that sale.

3. **Given** multiple transactions by different cashiers, **When** querying transactions by date range, **Then** the system returns all transactions with complete details including cashier identification, items sold, and financial totals.

---

### User Story 3 - User Authentication and Role-Based Access Control (Priority: P3)

As a pharmacy owner, I need user accounts with secure password storage and role-based permissions (Admin vs Cashier) so that I can control who has access to sensitive operations like price modifications, financial reports, and data deletion while allowing cashiers to perform billing operations.

**Why this priority**: Security and access control are essential for multi-user environments to prevent unauthorized access to financial data and accidental data loss. This priority is third because the system must have data structures (P1) and transaction recording (P2) before access control becomes critical.

**Independent Test**: Can be fully tested by creating admin and cashier user accounts with hashed passwords, verifying authentication succeeds with correct credentials and fails with incorrect ones, and confirming role designation is stored correctly for authorization checks. Delivers value by enabling secure multi-user access from initial deployment.

**Acceptance Scenarios**:

1. **Given** no existing users, **When** an admin account is created with username "admin", full name "John Doe", password "SecurePass123!", contact details, and role "Admin", **Then** the system stores the user with hashed password (not plaintext), unique user ID, and role designation.

2. **Given** an existing user account, **When** retrieving user information for authentication, **Then** the system provides user ID, username, hashed password, and role designation to enable password verification and permission checks.

3. **Given** multiple user accounts with different roles, **When** querying users by role "Cashier", **Then** the system returns all cashier accounts without exposing plaintext passwords.

---

### User Story 4 - Supplier Information Management (Priority: P4)

As a pharmacy owner, I need to store complete supplier information including company details, contact information, and outstanding payment balances so that I can manage purchase orders and track financial obligations to suppliers.

**Why this priority**: Supplier management is important for procurement operations but can be managed manually in early stages. This is prioritized fourth because inventory (P1) and sales (P2) are more time-critical, though supplier references in medicine records create a dependency.

**Independent Test**: Can be fully tested by creating supplier records with all contact details and outstanding balances, updating balance amounts as payments are made or purchases recorded, and verifying data integrity. Delivers value by centralizing supplier information and enabling basic supplier relationship management.

**Acceptance Scenarios**:

1. **Given** no existing supplier records, **When** a new supplier is added with company name "PharmaCorp Ltd", contact representative "Jane Smith", phone "+1-555-0123", email "orders@pharmacorp.com", address "123 Medical Plaza", outstanding balance 0.00, **Then** the system stores the supplier with unique ID and all attributes retrievable.

2. **Given** an existing supplier with outstanding balance 5000.00, **When** a payment of 2000.00 is recorded, **Then** the balance is updated to 3000.00.

3. **Given** medicines are linked to suppliers via supplier ID, **When** attempting to delete a supplier with associated medicines, **Then** the system prevents deletion to maintain data integrity.

---

### User Story 5 - Data Integrity Constraints and Performance Optimization (Priority: P5)

As a pharmacy owner and system administrator, I need the database to enforce strict data integrity rules (no negative quantities or prices, required foreign key relationships, no orphaned records) and optimize query performance with appropriate indexes so that data remains consistent and the system responds quickly during high-volume operations.

**Why this priority**: Data integrity and performance are critical for production operations but are infrastructure-level concerns that should be built into the foundation. This is prioritized fifth because it enhances the structures defined in P1-P4 rather than creating new user-facing capabilities.

**Independent Test**: Can be fully tested by attempting to insert invalid data (negative quantities, negative prices, invalid foreign keys) and verifying the system rejects it, then measuring query performance for common operations (medicine lookup by name and batch, transaction retrieval by date range) and confirming sub-second response times. Delivers value by preventing data corruption and ensuring system performance meets operational requirements.

**Acceptance Scenarios**:

1. **Given** a medicine record being created, **When** attempting to set stock quantity to -10 or cost price to -5.00, **Then** the system rejects the operation with a constraint violation error.

2. **Given** a sales transaction referencing Medicine ID and Cashier User ID, **When** attempting to create a transaction with non-existent Medicine ID or User ID, **Then** the system rejects the operation due to foreign key constraint violation.

3. **Given** 10,000 medicine records in the database, **When** searching for a medicine by brand name and batch number, **Then** the system returns results in under 500 milliseconds using composite index optimization.

4. **Given** an existing supplier with associated medicine records, **When** attempting to delete the supplier, **Then** the system prevents deletion to maintain referential integrity.

---

### User Story 6 - Database Initialization, Migration, and Automated Backup (Priority: P6)

As a system administrator and pharmacy owner, I need automated scripts to create the entire database structure from scratch, populate initial seed data (default admin user), and perform daily encrypted backups to secure storage so that the system can be deployed reliably and data can be recovered in case of hardware failure or data corruption.

**Why this priority**: This is the operational infrastructure that enables deployment and disaster recovery. While critical for production readiness, it's prioritized last because it supports the deployment of the data structures defined in P1-P5 rather than defining those structures.

**Independent Test**: Can be fully tested by running migration scripts on an empty database and verifying all tables, indexes, and constraints are created correctly with initial seed data present. Backup automation can be tested by triggering a backup, simulating data loss, and verifying complete restoration from backup. Delivers value by enabling repeatable deployments and providing disaster recovery capability.

**Acceptance Scenarios**:

1. **Given** an empty database instance, **When** DDL migration scripts are executed, **Then** all tables (medicines, sales_transactions, sales_items, suppliers, users) are created with correct schemas, primary keys, foreign keys, indexes, and check constraints.

2. **Given** successful migration script execution, **When** querying the users table, **Then** an initial admin user account exists with secure hashed password and Admin role.

3. **Given** the database is operational, **When** the automated backup procedure runs at scheduled time (2:00 AM daily), **Then** an encrypted backup file is created in secure storage with timestamp in filename (e.g., "pms_backup_2026-06-22_0200.enc") and verification that backup is restorable.

4. **Given** 30 days have passed since deployment, **When** reviewing backup storage, **Then** all 30 daily backups are present and older backups beyond 30-day retention policy are automatically purged.

---

### Edge Cases

- What happens when attempting to create a medicine record with an expiry date earlier than manufacturing date? System must validate and reject with clear error message.
- How does the system handle duplicate medicine entries (same brand name and batch number)? System should prevent duplicates using unique constraint on composite key or warn user of potential duplicate.
- What happens when a medicine's stock quantity reaches exactly the reorder threshold? System should trigger low-stock alert at threshold (not below it).
- How does the system handle concurrent updates to the same medicine's stock quantity (e.g., two cashiers selling the last units simultaneously)? Database must use transaction isolation to prevent race conditions and overselling.
- What happens when attempting to delete a medicine that has sales history? System must prevent deletion due to foreign key constraints in sales_items junction table.
- How does the system handle very large transaction histories (millions of records)? Indexes on transaction timestamp and invoice ID must ensure query performance remains acceptable; consider data archival strategy for old transactions.
- What happens if backup storage becomes full or unreachable? Backup procedure must log failure, alert administrators, and retain local backup until transfer succeeds.
- How does the system handle password reset for users when password hashing is one-way? System needs password reset mechanism (not part of database schema, but authentication flow consideration).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Database schema MUST be normalized to Third Normal Form (3NF) to eliminate data redundancy and maintain data integrity.

- **FR-002**: System MUST store complete medicine inventory information including Medicine ID (primary key, auto-increment), Brand Name (text, not null), Generic Formulation Name (text, not null), Batch Number (text, not null), Manufacturing Date (date, not null), Expiry Date (date, not null), Cost Price (decimal, not null), Selling Price (decimal, not null), Total Stock Quantity (integer, not null), Reorder Threshold Level (integer, not null), and Supplier ID (foreign key referencing suppliers table).

- **FR-003**: System MUST store complete sales transaction information including Invoice ID (primary key, auto-increment), Cashier User ID (foreign key referencing users table, not null), Transaction Timestamp (datetime, not null), Subtotal (decimal, not null), Discount Applied (decimal, not null, default 0), Tax Amount (decimal, not null), Grand Total (decimal, not null), and Payment Mode (enum: Cash, Card, Wallet, not null).

- **FR-004**: System MUST store sales line items in a junction table with Medicine ID (foreign key), Invoice ID (foreign key), Quantity Sold (integer, not null), and Unit Price at Time of Sale (decimal, not null) to maintain historical pricing accuracy even when medicine prices are updated.

- **FR-005**: System MUST store supplier information including Supplier ID (primary key, auto-increment), Company Name (text, not null), Contact Representative (text), Phone Number (text), Email Address (text), Physical Address (text), and Outstanding Ledger Balance (decimal, not null, default 0).

- **FR-006**: System MUST store user authentication and authorization information including User ID (primary key, auto-increment), Full Name (text, not null), Username (text, unique, not null), Hashed Password (text, not null, using bcrypt with cost factor ≥12 or Argon2id), Contact Details (text), and Role Designation (enum: Admin, Cashier, not null).

- **FR-007**: System MUST enforce check constraints ensuring Stock Quantity ≥ 0, Cost Price ≥ 0, Selling Price ≥ 0, Reorder Threshold ≥ 0, all transaction amounts ≥ 0, and Outstanding Balance can be negative (representing credit) but must be validated in application logic.

- **FR-008**: System MUST enforce foreign key constraints with CASCADE restrictions preventing deletion of suppliers or medicines that have associated records (medicines linked to suppliers, sales items linked to medicines and transactions).

- **FR-009**: System MUST create composite index on (Brand Name, Batch Number) for medicine table to optimize barcode scanning lookups and inventory queries.

- **FR-010**: System MUST create index on Expiry Date field in medicine table to enable fast queries for expiry alert generation (medicines expiring within 30-60 days).

- **FR-011**: System MUST create index on Transaction Timestamp field in sales_transactions table to optimize date-range queries for financial reporting.

- **FR-012**: System MUST validate that Expiry Date is after Manufacturing Date for all medicine records.

- **FR-013**: System MUST provide DDL migration scripts that create all tables, indexes, constraints, and relationships in correct dependency order (suppliers table before medicines table, users table before transactions table, etc.).

- **FR-014**: Migration scripts MUST populate initial seed data including at least one default admin user account with secure hashed password.

- **FR-015**: System MUST provide automated daily backup procedure scheduled for configurable time (default 2:00 AM) that creates encrypted backup files and stores them in secure storage with timestamp-based naming convention.

- **FR-016**: Backup procedure MUST retain backups for minimum 30 days with automatic purging of older backups to manage storage.

- **FR-017**: Backup files MUST be encrypted using industry-standard encryption (AES-256 or equivalent) before storage.

- **FR-018**: System MUST support database transactions with ACID compliance for all critical operations (inventory updates, sales recording, financial calculations).

- **FR-019**: System MUST use appropriate data types: DECIMAL for all monetary amounts (to avoid floating-point precision errors), INTEGER for quantities and counts, VARCHAR for text fields with reasonable length limits, DATETIME for timestamps.

- **FR-020**: Database connection configuration MUST be externalized (environment variables or configuration files, never hardcoded) and support connection pooling for performance.

### Key Entities

- **Medicine/Inventory**: Represents individual medicine products tracked in the pharmacy system. Each record uniquely identifies a specific medicine brand and batch combination with complete lifecycle information (manufacturing and expiry dates), pricing (cost and selling price), current stock levels, reorder thresholds for automated alerts, and supplier relationship. Supports inventory tracking, expiry monitoring, pricing management, and stock replenishment workflows.

- **Sales Transaction**: Represents a complete billing transaction at the point of sale. Captures who processed the transaction (cashier), when it occurred, all financial components (subtotal before discounts, discount amount, tax amount, final grand total), and payment method. Acts as the parent record for line items. Supports financial reporting, audit trails, cashier performance tracking, and daily sales reconciliation.

- **Sales Line Item**: Represents individual products sold within a transaction (junction entity between Transaction and Medicine). Critically preserves the unit price charged at time of sale to maintain historical financial accuracy even when product prices change later. Includes quantity sold and references both the transaction and the specific medicine. Supports detailed sales analysis, inventory deduction calculations, and accurate financial history.

- **Supplier**: Represents external suppliers who provide medicine inventory to the pharmacy. Stores complete company identification, contact information for ordering and communication, and outstanding financial balance to track payment obligations. Referenced by medicine records to establish supplier relationships. Supports purchase order management, supplier relationship tracking, and accounts payable workflows.

- **User**: Represents system users (pharmacy staff) with authentication credentials and role-based access control. Stores personal identification, unique username, securely hashed password (never plaintext), contact information, and role designation (Admin or Cashier) for permission enforcement. Referenced by transactions to track who processed each sale. Supports multi-user access, accountability, audit trails, and security through role-based permissions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Database schema creation scripts execute successfully on a fresh database instance in under 30 seconds, creating all tables, indexes, and constraints without errors.

- **SC-002**: All medicine inventory lookups by brand name and batch number complete in under 500 milliseconds even with 10,000+ medicine records, demonstrating effective composite index optimization.

- **SC-003**: Expiry date queries (finding medicines expiring within next 30-60 days) complete in under 1 second even with 10,000+ medicine records, demonstrating effective date index optimization.

- **SC-004**: Sales transaction retrieval by date range completes in under 2 seconds for queries spanning up to 1 year of transaction history, demonstrating effective timestamp indexing.

- **SC-005**: All data integrity constraints (non-negative values, foreign key relationships, required fields) successfully prevent invalid data entry with 100% enforcement rate during testing.

- **SC-006**: Historical sales records maintain accurate pricing information after medicine prices are updated, with 100% of line items preserving the original unit price charged.

- **SC-007**: Automated backup procedure successfully creates encrypted backup files daily without manual intervention, with 100% success rate over 30-day test period.

- **SC-008**: Backup restoration test successfully restores complete database from encrypted backup file with 100% data integrity (zero records lost, all relationships intact).

- **SC-009**: Database supports minimum 50 concurrent connections without performance degradation, enabling multi-user access during peak pharmacy hours.

- **SC-010**: All database queries required for billing operations (medicine lookup, stock check, transaction insertion) complete in under 1 second, meeting the overall system performance requirement from Constitution Principle II.

- **SC-011**: Password hashing for user authentication uses bcrypt with cost factor ≥12 or Argon2id with appropriate parameters, meeting Constitution Principle III security requirements.

- **SC-012**: Migration scripts are idempotent and can be safely re-run without corrupting existing data (using CREATE IF NOT EXISTS or equivalent patterns).

### Assumptions

- Database engine will be MySQL (per Constitution Option A: web-based architecture using React.js, Node.js/Express, and MySQL), compatible with Microsoft Azure Database for MySQL or Azure SQL.
- Hosting environment will be Microsoft Azure cloud platform as specified in user input, providing managed database services with automated scaling and high availability.
- Database will be configured with appropriate connection pooling (minimum 20 connections, maximum 100 connections) to support concurrent user access.
- Backup storage will use Azure Blob Storage or equivalent secure cloud storage with encryption at rest.
- Initial deployment will handle up to 100,000 medicine records and 1,000,000 transaction records; if growth exceeds this, schema review and potential partitioning strategies may be needed.
- Daily backup window (2:00 AM default) is during low-activity hours; this can be reconfigured based on pharmacy operating hours.
- Database character encoding will be UTF-8 to support international medicine names and special characters.
- Monetary amounts will use DECIMAL(10,2) data type providing up to 8 digits before decimal point (max value 99,999,999.99) which is sufficient for pharmacy pricing; adjust if currency requires different precision.
- Batch numbers are alphanumeric strings of reasonable length (<50 characters); if longer batch identifiers are needed, field length can be adjusted.
- Initial seed data will include one default admin user with username "admin" and a secure randomly-generated password documented in deployment notes (must be changed on first login).
- Database timezone will be configured to match pharmacy's local timezone for accurate timestamp recording.
- Foreign key cascading uses RESTRICT (prevent deletion) rather than CASCADE (automatic deletion) to preserve data integrity and prevent accidental data loss, aligning with Constitution Principle I (Data Integrity & Financial Accuracy).

## Dependencies

- **Technology Stack Decision**: While user input specified Microsoft Azure and the constitution presented two options, this spec assumes Option A (web-based: React.js/Node.js/MySQL) based on the Azure cloud platform mention and microservices-ready architecture requirement. If Option B (desktop-based) is chosen instead, database may shift to SQLite for local operation with periodic sync to cloud MySQL, requiring schema adjustments for offline-first architecture.

- **Azure Account and Resources**: Requires active Microsoft Azure subscription with sufficient quota for database instance creation (Azure Database for MySQL or equivalent), storage accounts for backups, and network configuration.

- **Database Service Selection**: Requires decision on specific Azure database service (Azure Database for MySQL, Azure SQL Database, or other) which affects connection strings, authentication methods, and some SQL syntax variations.

- **Environment Configuration Management**: Requires infrastructure for managing environment variables and configuration files (e.g., Azure Key Vault for sensitive credentials, App Configuration service, or .env files for development).

- **Backup Storage Configuration**: Requires Azure Blob Storage account or equivalent with appropriate access policies, encryption configuration, and retention policies.

- **Development and Testing Environments**: Requires separate database instances for development, staging, and production to safely test migration scripts and backup procedures before production deployment.

## Risks and Mitigations

- **Risk**: Migration script errors during initial deployment could create incomplete or corrupted schema, blocking all subsequent development.  
  **Mitigation**: Thoroughly test migration scripts in development environment with multiple clean-slate runs. Include rollback scripts for each migration. Use database transaction wrappers where possible to enable atomic schema creation.

- **Risk**: Inadequate indexing could cause performance degradation as data volume grows, violating <1 second query requirement.  
  **Mitigation**: Implement all specified indexes from the start. Include query performance tests in acceptance criteria. Plan for quarterly performance review and index optimization based on actual query patterns.

- **Risk**: Backup automation failure could go unnoticed until data loss occurs, making recovery impossible.  
  **Mitigation**: Implement backup monitoring and alerting. Test backup restoration monthly. Include backup success/failure logging with notifications to administrators. Store backups in geographically redundant storage.

- **Risk**: Incorrect foreign key cascade settings could allow data deletion that violates audit requirements or accidentally cascade deletes across related records.  
  **Mitigation**: Use RESTRICT cascade option for all foreign keys to prevent accidental deletion. Require explicit handling of related records before deletion. Include integration tests verifying cascade behavior.

- **Risk**: Database credentials hardcoded in migration scripts or configuration files could be exposed in version control.  
  **Mitigation**: Use environment variables or Azure Key Vault for all credentials. Never commit database passwords to version control. Include .env files in .gitignore. Use separate credentials for development, staging, and production.

- **Risk**: Insufficient database sizing or connection pool limits could cause performance bottlenecks or connection exhaustion during peak usage.  
  **Mitigation**: Size database instance based on projected load with 50% headroom. Configure connection pooling with appropriate limits (minimum 20, maximum 100 initial). Monitor connection usage and query performance metrics. Plan for vertical or horizontal scaling as needed.

- **Risk**: Database timezone misconfiguration could cause transaction timestamp discrepancies or incorrect expiry date calculations.  
  **Mitigation**: Explicitly configure database timezone to match pharmacy location. Store all timestamps in UTC and convert to local time in application layer. Include timezone validation in initial deployment checklist.

- **Risk**: Lack of database version control could make it difficult to track schema changes over time or coordinate database updates across multiple environments.  
  **Mitigation**: Use migration versioning system (e.g., numbered migration files: 001_initial_schema.sql, 002_add_indexes.sql). Maintain schema change log. Use migration tools that track which migrations have been applied to each environment.

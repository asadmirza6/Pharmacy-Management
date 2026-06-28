# Data Model: Database Architecture

**Feature**: 001-database-architecture  
**Date**: 2026-06-22  
**Phase**: 1 - Data Model & Schema Design

This document defines the complete database schema for the Pharmacy Management System, including entity-relationship model, table structures, constraints, and indexes.

---

## Entity-Relationship Overview

### Module Ownership Map

| Module | Tables Owned | Responsibilities |
|--------|--------------|------------------|
| **Inventory & Stock Management** | `medicines` | Medicine master data, batch tracking, stock levels, pricing |
| **POS & Billing** | `sales_transactions`, `sales_items` | Transaction recording, line items with historical prices |
| **Supplier & Purchase Management** | `suppliers` | Supplier directory, contact info, outstanding balances |
| **User Roles & Access Control** | `users` | Authentication credentials, role designation (Admin/Cashier) |
| **Infrastructure** | `schema_versions` | Database migration tracking |

### Entity Relationships

```
┌─────────────┐
│  suppliers  │
│ (supplier_id)│
└──────┬──────┘
       │ 1
       │
       │ N
┌──────▼──────────┐
│   medicines     │
│  (medicine_id)  │
└──────┬──────────┘
       │ 1
       │
       │ N
┌──────▼──────────┐         ┌─────────────────┐
│  sales_items    │ N     1 │sales_transactions│
│(invoice_id,     ├─────────┤   (invoice_id)   │
│ medicine_id)    │         └────────┬─────────┘
└─────────────────┘                  │ N
                                     │
                                     │ 1
                              ┌──────▼──────┐
                              │    users    │
                              │  (user_id)  │
                              └─────────────┘

Legend:
───── = Foreign Key Relationship
1, N  = Cardinality (1:Many)
```

### Relationship Details

1. **suppliers → medicines** (1:N)
   - One supplier provides many medicines
   - Foreign Key: `medicines.supplier_id` → `suppliers.supplier_id`
   - Cascade: RESTRICT (cannot delete supplier with associated medicines)

2. **medicines → sales_items** (1:N)
   - One medicine can appear in many sales line items
   - Foreign Key: `sales_items.medicine_id` → `medicines.medicine_id`
   - Cascade: RESTRICT (cannot delete medicine with sales history)

3. **sales_transactions → sales_items** (1:N)
   - One transaction contains many line items
   - Foreign Key: `sales_items.invoice_id` → `sales_transactions.invoice_id`
   - Cascade: RESTRICT (line items cannot exist without parent transaction)

4. **users → sales_transactions** (1:N)
   - One user (cashier) processes many transactions
   - Foreign Key: `sales_transactions.user_id` → `users.user_id`
   - Cascade: RESTRICT (cannot delete user with transaction history)

---

## Third Normal Form (3NF) Verification

### 1NF (First Normal Form) - Atomic Values ✅
- All columns contain atomic values (no arrays or nested structures)
- Each column contains values of a single type
- Each column has a unique name
- Order of rows and columns doesn't matter

### 2NF (Second Normal Form) - No Partial Dependencies ✅
- All tables have single-column primary keys (except `sales_items` with composite PK)
- For `sales_items` composite PK `(invoice_id, medicine_id)`:
  - `quantity_sold` depends on both invoice AND medicine (how many of THIS medicine in THIS invoice)
  - `unit_price_at_sale` depends on both invoice AND medicine (price of THIS medicine in THIS invoice)
  - No partial dependencies exist

### 3NF (Third Normal Form) - No Transitive Dependencies ✅
- **medicines table**: No transitive dependencies
  - All non-key attributes depend directly on `medicine_id`
  - `supplier_id` is a foreign key (not a transitive dependency)
- **sales_transactions table**: No transitive dependencies
  - `subtotal`, `discount`, `tax`, `grand_total` are calculated from line items but stored for historical accuracy
  - `user_id` is a foreign key (not a transitive dependency)
- **sales_items table**: No transitive dependencies
  - `unit_price_at_sale` is denormalized intentionally (historical accuracy requirement)
  - This is an accepted denormalization for temporal data (preserves price at time of sale)
- **suppliers table**: No transitive dependencies (all attributes depend directly on `supplier_id`)
- **users table**: No transitive dependencies (all attributes depend directly on `user_id`)

**Conclusion**: Schema is in 3NF with one intentional denormalization (`sales_items.unit_price_at_sale`) justified by temporal data requirements.

---

## Table Schemas

### 1. medicines

**Purpose**: Store complete medicine inventory with batch tracking, pricing, and stock levels

**Module Owner**: Inventory & Stock Management

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| `medicine_id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier for each medicine record |
| `brand_name` | VARCHAR(200) | NOT NULL | Commercial/trade name (e.g., "Paracetamol 500mg") |
| `generic_name` | VARCHAR(200) | NOT NULL | Generic formulation (e.g., "Acetaminophen") |
| `batch_number` | VARCHAR(50) | NOT NULL | Manufacturer's batch/lot number |
| `manufacturing_date` | DATE | NOT NULL | Date of manufacture |
| `expiry_date` | DATE | NOT NULL, CHECK (expiry_date > manufacturing_date) | Expiration date (must be after manufacturing date) |
| `cost_price` | DECIMAL(10,2) | NOT NULL, CHECK (cost_price >= 0) | Purchase/cost price per unit |
| `selling_price` | DECIMAL(10,2) | NOT NULL, CHECK (selling_price >= 0) | Retail selling price per unit |
| `stock_quantity` | INT | NOT NULL, CHECK (stock_quantity >= 0) | Current units in stock |
| `reorder_threshold` | INT | NOT NULL, CHECK (reorder_threshold >= 0) | Minimum stock level before reorder alert |
| `supplier_id` | INT | NOT NULL, FOREIGN KEY → suppliers(supplier_id) | Reference to supplier |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |

**Indexes**:
- `PRIMARY KEY` on `medicine_id` (clustered index)
- `INDEX idx_medicine_barcode` on `(brand_name, batch_number)` - for barcode scanning
- `INDEX idx_medicine_billing` on `(brand_name, batch_number, selling_price, stock_quantity)` - covering index for POS
- `INDEX idx_medicine_expiry` on `expiry_date` - for expiry alert queries
- `INDEX fk_medicine_supplier` on `supplier_id` - for supplier lookups

**Business Rules**:
- Expiry date must be after manufacturing date (enforced by CHECK constraint)
- Cannot have negative prices or quantities (enforced by CHECK constraints)
- Cannot delete medicine with sales history (enforced by foreign key RESTRICT)
- `brand_name` + `batch_number` combination should be unique in practice but not enforced as UNIQUE constraint (business allows duplicate entries for separate deliveries)

---

### 2. sales_transactions

**Purpose**: Record complete billing transactions with financial totals and metadata

**Module Owner**: POS & Billing

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| `invoice_id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique invoice/transaction identifier |
| `user_id` | INT | NOT NULL, FOREIGN KEY → users(user_id) | Cashier who processed the transaction |
| `transaction_timestamp` | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Transaction date and time |
| `subtotal` | DECIMAL(10,2) | NOT NULL, CHECK (subtotal >= 0) | Total before discount and tax |
| `discount_applied` | DECIMAL(10,2) | NOT NULL, DEFAULT 0, CHECK (discount_applied >= 0) | Discount amount |
| `tax_amount` | DECIMAL(10,2) | NOT NULL, CHECK (tax_amount >= 0) | Tax amount |
| `grand_total` | DECIMAL(10,2) | NOT NULL, CHECK (grand_total >= 0) | Final amount (subtotal - discount + tax) |
| `payment_mode` | ENUM('Cash', 'Card', 'Wallet') | NOT NULL | Payment method used |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |

**Indexes**:
- `PRIMARY KEY` on `invoice_id` (clustered index)
- `INDEX idx_transaction_timestamp` on `transaction_timestamp` - for date-range reporting
- `INDEX fk_transaction_user` on `user_id` - for cashier performance queries

**Business Rules**:
- All financial amounts must be non-negative (enforced by CHECK constraints)
- Grand total calculation: `grand_total = subtotal - discount_applied + tax_amount` (enforced in application logic, not database trigger)
- Cannot delete transaction with line items (enforced by foreign key RESTRICT)
- Cannot delete user who has processed transactions (enforced by foreign key RESTRICT)

---

### 3. sales_items

**Purpose**: Store individual line items for each transaction with historical prices

**Module Owner**: POS & Billing

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| `invoice_id` | INT | PRIMARY KEY (composite), FOREIGN KEY → sales_transactions(invoice_id) | Reference to parent transaction |
| `medicine_id` | INT | PRIMARY KEY (composite), FOREIGN KEY → medicines(medicine_id) | Reference to medicine sold |
| `quantity_sold` | INT | NOT NULL, CHECK (quantity_sold > 0) | Number of units sold (must be positive) |
| `unit_price_at_sale` | DECIMAL(10,2) | NOT NULL, CHECK (unit_price_at_sale >= 0) | Price per unit at time of sale (historical accuracy) |
| `line_total` | DECIMAL(10,2) | NOT NULL, CHECK (line_total >= 0) | Line total (quantity × unit_price) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |

**Indexes**:
- `PRIMARY KEY` on `(invoice_id, medicine_id)` (composite clustered index)
- `INDEX fk_sales_items_medicine` on `medicine_id` - for medicine sales history queries

**Business Rules**:
- Composite primary key ensures one line per medicine per invoice (cannot add same medicine twice to same invoice; quantity must be aggregated)
- Quantity must be positive (CHECK constraint prevents zero or negative)
- `unit_price_at_sale` preserves historical pricing (immutable after transaction completion)
- `line_total = quantity_sold × unit_price_at_sale` (enforced in application logic)
- Cannot delete line item independently (must delete parent transaction)

---

### 4. suppliers

**Purpose**: Maintain supplier directory with contact information and financial tracking

**Module Owner**: Supplier & Purchase Management

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| `supplier_id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique supplier identifier |
| `company_name` | VARCHAR(200) | NOT NULL | Supplier company name |
| `contact_representative` | VARCHAR(100) | NULL | Primary contact person name |
| `phone_number` | VARCHAR(20) | NULL | Contact phone number |
| `email_address` | VARCHAR(100) | NULL | Contact email address |
| `physical_address` | VARCHAR(500) | NULL | Supplier physical address |
| `outstanding_balance` | DECIMAL(12,2) | NOT NULL, DEFAULT 0 | Amount owed to supplier (positive = owe, negative = credit) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |

**Indexes**:
- `PRIMARY KEY` on `supplier_id` (clustered index)
- `INDEX idx_supplier_name` on `company_name` - for supplier search

**Business Rules**:
- `outstanding_balance` can be negative (represents credit from overpayment or returns)
- Cannot delete supplier with associated medicines (enforced by foreign key RESTRICT)
- Contact fields are optional (NULL allowed) but `company_name` is mandatory

---

### 5. users

**Purpose**: Store user authentication credentials and role-based access control

**Module Owner**: User Roles & Access Control

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| `user_id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique user identifier |
| `full_name` | VARCHAR(100) | NOT NULL | User's full name |
| `username` | VARCHAR(50) | NOT NULL, UNIQUE | Login username (unique across system) |
| `password_hash` | VARCHAR(255) | NOT NULL | Bcrypt/Argon2 hashed password (never plaintext) |
| `contact_details` | VARCHAR(200) | NULL | Phone/email for user contact |
| `role` | ENUM('Admin', 'Cashier') | NOT NULL | Role designation for RBAC |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Account status (active/deactivated) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |
| `last_login` | TIMESTAMP | NULL | Last successful login timestamp |

**Indexes**:
- `PRIMARY KEY` on `user_id` (clustered index)
- `UNIQUE INDEX idx_user_username` on `username` - for login uniqueness
- `INDEX idx_user_role` on `role` - for role-based queries

**Business Rules**:
- `username` must be unique (enforced by UNIQUE constraint)
- `password_hash` stores bcrypt hash (60 characters) or Argon2id hash (varies, VARCHAR(255) accommodates both)
- Cannot delete user with transaction history (enforced by foreign key RESTRICT)
- `is_active = FALSE` disables account without deleting (soft delete for audit trail)

---

### 6. schema_versions

**Purpose**: Track applied database migrations for version control

**Module Owner**: Infrastructure

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| `version_number` | INT | PRIMARY KEY | Migration version number (v001 = 1, v002 = 2, etc.) |
| `description` | VARCHAR(255) | NOT NULL | Human-readable migration description |
| `applied_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Timestamp of migration execution |
| `execution_time_ms` | INT | NULL | Migration execution duration in milliseconds |
| `applied_by` | VARCHAR(100) | NOT NULL | User/system that executed migration (from USER() or script) |

**Indexes**:
- `PRIMARY KEY` on `version_number` (clustered index)

**Business Rules**:
- Each migration inserts exactly one row after successful execution
- `version_number` must be sequential (enforced in migration script logic)
- Used to determine pending migrations: `SELECT MAX(version_number) FROM schema_versions;`

---

## Data Dictionary

### Medicines Entity
**Business Context**: Represents pharmaceutical products tracked in inventory. Each record is a specific brand and batch combination with complete lifecycle information (manufacture to expiry), pricing (cost and retail), current stock levels, and supplier relationship.

**Key Concepts**:
- **Brand Name**: Commercial name on packaging (e.g., "Paracetamol 500mg Tablets")
- **Generic Name**: Active pharmaceutical ingredient (e.g., "Acetaminophen")
- **Batch Number**: Manufacturer's lot identifier for traceability and recalls
- **Stock Quantity**: Current units available for sale (decremented on each sale)
- **Reorder Threshold**: Low-stock alert trigger (e.g., alert when <10 units)

### Sales Transactions Entity
**Business Context**: Represents a complete billing event at the POS counter. Captures financial details (totals, discounts, taxes), metadata (cashier, timestamp), and payment method for audit and reporting.

**Key Concepts**:
- **Subtotal**: Sum of all line item totals before adjustments
- **Discount Applied**: Total discount amount (can be per-item or invoice-level)
- **Tax Amount**: Calculated tax on taxable items
- **Grand Total**: Final amount charged to customer
- **Payment Mode**: Cash (physical currency), Card (credit/debit), Wallet (mobile payment)

### Sales Items Entity
**Business Context**: Individual products sold within a transaction. Junction table linking transactions to medicines with quantity and **historical price** preservation.

**Key Concepts**:
- **Unit Price at Sale**: Price charged at time of transaction (immutable, preserves historical accuracy even if medicine price changes later)
- **Line Total**: Quantity × unit price (stored for performance, avoids recalculation)

### Suppliers Entity
**Business Context**: External vendors providing medicine inventory. Tracks company identification, contact information for ordering, and financial relationship (amounts owed).

**Key Concepts**:
- **Outstanding Balance**: Positive = pharmacy owes supplier, Negative = supplier owes pharmacy (credit), Zero = settled

### Users Entity
**Business Context**: Pharmacy staff with system access. Credentials for authentication and role designation for authorization (Admin vs Cashier permissions).

**Key Concepts**:
- **Role = Admin**: Full system access (financial reports, price changes, user management, data deletion)
- **Role = Cashier**: Limited access (billing operations, stock inquiries, read-only reports, NO deletion)
- **Password Hash**: Bcrypt (cost factor ≥12) or Argon2id hash (never store plaintext)

---

## Performance Considerations

### Index Strategy Summary

| Index Name | Table | Columns | Type | Purpose | Estimated Size (100K records) |
|------------|-------|---------|------|---------|-------------------------------|
| `idx_medicine_barcode` | medicines | (brand_name, batch_number) | Composite | Barcode scanning lookups | ~5 MB |
| `idx_medicine_billing` | medicines | (brand_name, batch_number, selling_price, stock_quantity) | Covering | POS billing queries (index-only scan) | ~6 MB |
| `idx_medicine_expiry` | medicines | expiry_date | Single-column | Expiry alert generation | ~2 MB |
| `idx_transaction_timestamp` | sales_transactions | transaction_timestamp | Single-column | Date-range reporting | ~4 MB (1M records) |

**Total Index Overhead**: ~17 MB for 100K medicines + 1M transactions (negligible)

### Query Performance Targets

| Query Type | Target | Index Used | Notes |
|------------|--------|------------|-------|
| Medicine lookup by barcode | <500ms (p95) | idx_medicine_billing (covering) | Index-only scan, no table access |
| Expiry alert query (30-60 days) | <1s | idx_medicine_expiry | Range scan on indexed date column |
| Transaction history by date range | <2s | idx_transaction_timestamp | Range scan with limit/offset pagination |
| Daily sales report | <5s | idx_transaction_timestamp | Aggregate query with date filter |

---

## Next Steps

This data model document provides the foundation for generating DDL scripts in the `contracts/` directory:

1. **001_create_tables.sql**: CREATE TABLE statements in dependency order
2. **002_create_indexes.sql**: CREATE INDEX statements for all indexes
3. **003_create_constraints.sql**: ALTER TABLE statements for foreign keys and check constraints
4. **004_seed_data.sql**: INSERT statements for initial admin user and test data

Proceed to contract generation phase.

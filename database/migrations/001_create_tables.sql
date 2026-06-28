-- =============================================================================
-- Migration: v001
-- Description: Create initial database tables for Pharmacy Management System
-- Author: Database Architecture Team
-- Date: 2026-06-22
-- Dependencies: None (initial schema)
-- Estimated execution time: <10 seconds
-- Rollback: database/rollback/v001_rollback.sql
-- =============================================================================
-- Purpose: This script creates all core tables in dependency order:
--   1. schema_versions (migration tracking)
--   2. suppliers (no dependencies)
--   3. users (no dependencies)
--   4. medicines (no dependencies yet - FK added in 003_create_constraints.sql)
--   5. sales_transactions (no dependencies yet - FK added in 003_create_constraints.sql)
--   6. sales_items (no dependencies yet - FK added in 003_create_constraints.sql)
--
-- Note: Foreign keys and check constraints are added separately in
--       003_create_constraints.sql to avoid circular dependency issues
-- =============================================================================

USE pharmacy_db;

SELECT 'Starting migration v001: Create initial tables...' AS status;

-- -----------------------------------------------------------------------------
-- Table: schema_versions
-- Purpose: Track applied database migrations for version control
-- Module: Infrastructure
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS schema_versions (
    version_number INT PRIMARY KEY COMMENT 'Migration version number (1, 2, 3, ...)',
    description VARCHAR(255) NOT NULL COMMENT 'Human-readable migration description',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp of migration execution',
    execution_time_ms INT NULL COMMENT 'Migration execution duration in milliseconds',
    applied_by VARCHAR(100) NOT NULL COMMENT 'User/system that executed migration'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Database migration tracking table';

-- -----------------------------------------------------------------------------
-- Table: suppliers
-- Purpose: Maintain supplier directory with contact information and financials
-- Module: Supplier & Purchase Management
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique supplier identifier',
    company_name VARCHAR(200) NOT NULL COMMENT 'Supplier company name',
    contact_representative VARCHAR(100) NULL COMMENT 'Primary contact person name',
    phone_number VARCHAR(20) NULL COMMENT 'Contact phone number',
    email_address VARCHAR(100) NULL COMMENT 'Contact email address',
    physical_address VARCHAR(500) NULL COMMENT 'Supplier physical address',
    outstanding_balance DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT 'Amount owed to supplier (positive=owe, negative=credit)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Supplier directory and financial tracking';

-- -----------------------------------------------------------------------------
-- Table: users
-- Purpose: Store user authentication credentials and role-based access control
-- Module: User Roles & Access Control
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique user identifier',
    full_name VARCHAR(100) NOT NULL COMMENT 'User full name',
    username VARCHAR(50) NOT NULL UNIQUE COMMENT 'Login username (unique)',
    password_hash VARCHAR(255) NOT NULL COMMENT 'Bcrypt/Argon2 hashed password',
    contact_details VARCHAR(200) NULL COMMENT 'Phone/email for user contact',
    role ENUM('Admin', 'Cashier') NOT NULL COMMENT 'Role designation for RBAC',
    is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Account status (active/deactivated)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
    last_login TIMESTAMP NULL COMMENT 'Last successful login timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User authentication and RBAC';

-- -----------------------------------------------------------------------------
-- Table: medicines
-- Purpose: Store complete medicine inventory with batch tracking and pricing
-- Module: Inventory & Stock Management
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS medicines (
    medicine_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique medicine identifier',
    brand_name VARCHAR(200) NOT NULL COMMENT 'Commercial/trade name',
    generic_name VARCHAR(200) NOT NULL COMMENT 'Generic formulation name',
    batch_number VARCHAR(50) NOT NULL COMMENT 'Manufacturer batch/lot number',
    manufacturing_date DATE NOT NULL COMMENT 'Date of manufacture',
    expiry_date DATE NOT NULL COMMENT 'Expiration date',
    cost_price DECIMAL(10,2) NOT NULL COMMENT 'Purchase/cost price per unit',
    selling_price DECIMAL(10,2) NOT NULL COMMENT 'Retail selling price per unit',
    stock_quantity INT NOT NULL COMMENT 'Current units in stock',
    reorder_threshold INT NOT NULL COMMENT 'Minimum stock level before reorder alert',
    supplier_id INT NOT NULL COMMENT 'Reference to supplier (FK added in 003_create_constraints.sql)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Medicine inventory with batch tracking';

-- -----------------------------------------------------------------------------
-- Table: sales_transactions
-- Purpose: Record complete billing transactions with financial totals
-- Module: POS & Billing
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sales_transactions (
    invoice_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique invoice/transaction identifier',
    user_id INT NOT NULL COMMENT 'Cashier who processed transaction (FK added in 003_create_constraints.sql)',
    transaction_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Transaction date and time',
    subtotal DECIMAL(10,2) NOT NULL COMMENT 'Total before discount and tax',
    discount_applied DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'Discount amount',
    tax_amount DECIMAL(10,2) NOT NULL COMMENT 'Tax amount',
    grand_total DECIMAL(10,2) NOT NULL COMMENT 'Final amount (subtotal - discount + tax)',
    payment_mode ENUM('Cash', 'Card', 'Wallet') NOT NULL COMMENT 'Payment method used',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Sales transactions with financial totals';

-- -----------------------------------------------------------------------------
-- Table: sales_items
-- Purpose: Store line items for transactions with historical prices
-- Module: POS & Billing
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sales_items (
    invoice_id INT NOT NULL COMMENT 'Reference to parent transaction (FK added in 003_create_constraints.sql)',
    medicine_id INT NOT NULL COMMENT 'Reference to medicine sold (FK added in 003_create_constraints.sql)',
    quantity_sold INT NOT NULL COMMENT 'Number of units sold',
    unit_price_at_sale DECIMAL(10,2) NOT NULL COMMENT 'Price per unit at time of sale (historical)',
    line_total DECIMAL(10,2) NOT NULL COMMENT 'Line total (quantity × unit_price)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
    PRIMARY KEY (invoice_id, medicine_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Sales line items with historical pricing';

-- -----------------------------------------------------------------------------
-- Record migration
-- -----------------------------------------------------------------------------

INSERT INTO schema_versions (version_number, description, applied_by, execution_time_ms)
VALUES (1, 'Create initial schema (all tables)', USER(), NULL)
ON DUPLICATE KEY UPDATE description=description;

SELECT 'Migration v001 complete: All tables created.' AS status;
SELECT 'Next step: Run 002_create_indexes.sql' AS next_action;

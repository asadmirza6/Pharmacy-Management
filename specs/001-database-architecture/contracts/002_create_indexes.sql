-- =============================================================================
-- Migration: v002
-- Description: Create indexes for query performance optimization
-- Author: Database Architecture Team
-- Date: 2026-06-22
-- Dependencies: 001_create_tables.sql (all tables must exist)
-- Estimated execution time: <5 seconds
-- Rollback: database/rollback/v002_rollback.sql
-- =============================================================================
-- Purpose: This script creates all indexes to meet performance targets:
--   - Composite index on (brand_name, batch_number) for barcode scanning <500ms
--   - Covering index for POS billing queries (index-only scan)
--   - Single-column index on expiry_date for alert queries <1s
--   - Single-column index on transaction_timestamp for reporting <2s
--   - Foreign key indexes for join performance
-- =============================================================================

USE pharmacy_db;

SELECT 'Starting migration v002: Create indexes...' AS status;

-- -----------------------------------------------------------------------------
-- Medicines Table Indexes
-- -----------------------------------------------------------------------------

-- Composite index for barcode scanning lookups
-- Target: <500ms for medicine lookup by brand name AND batch number
CREATE INDEX idx_medicine_barcode
ON medicines(brand_name, batch_number)
COMMENT='Composite index for barcode scanning (brand + batch lookup)';

-- Covering index for POS billing queries (index-only scan)
-- Includes frequently accessed columns to avoid table access
-- Target: <500ms with no table lookup overhead
CREATE INDEX idx_medicine_billing
ON medicines(brand_name, batch_number, selling_price, stock_quantity)
COMMENT='Covering index for POS billing (includes price and stock)';

-- Single-column index on expiry_date for alert generation
-- Target: <1s for queries finding medicines expiring within 30-60 days
CREATE INDEX idx_medicine_expiry
ON medicines(expiry_date)
COMMENT='Index for expiry alert queries (range scan on dates)';

-- Foreign key index for supplier lookups
CREATE INDEX fk_medicine_supplier
ON medicines(supplier_id)
COMMENT='Foreign key index for supplier relationship';

-- -----------------------------------------------------------------------------
-- Sales Transactions Table Indexes
-- -----------------------------------------------------------------------------

-- Single-column index on transaction_timestamp for date-range reporting
-- Target: <2s for daily/weekly/monthly transaction queries
CREATE INDEX idx_transaction_timestamp
ON sales_transactions(transaction_timestamp)
COMMENT='Index for date-range reporting and analytics';

-- Foreign key index for cashier/user lookups
CREATE INDEX fk_transaction_user
ON sales_transactions(user_id)
COMMENT='Foreign key index for user (cashier) relationship';

-- -----------------------------------------------------------------------------
-- Sales Items Table Indexes
-- -----------------------------------------------------------------------------

-- Foreign key index for medicine sales history
-- (invoice_id is already indexed as part of composite PK)
CREATE INDEX fk_sales_items_medicine
ON sales_items(medicine_id)
COMMENT='Foreign key index for medicine sales history queries';

-- -----------------------------------------------------------------------------
-- Suppliers Table Indexes
-- -----------------------------------------------------------------------------

-- Index on company_name for supplier search
CREATE INDEX idx_supplier_name
ON suppliers(company_name)
COMMENT='Index for supplier search by company name';

-- -----------------------------------------------------------------------------
-- Users Table Indexes
-- -----------------------------------------------------------------------------

-- Index on role for role-based queries
-- (username already has UNIQUE index from table definition)
CREATE INDEX idx_user_role
ON users(role)
COMMENT='Index for role-based access control queries';

-- -----------------------------------------------------------------------------
-- Record migration
-- -----------------------------------------------------------------------------

INSERT INTO schema_versions (version_number, description, applied_by, execution_time_ms)
VALUES (2, 'Create all performance indexes', USER(), NULL)
ON DUPLICATE KEY UPDATE description=description;

SELECT 'Migration v002 complete: All indexes created.' AS status;
SELECT 'Next step: Run 003_create_constraints.sql' AS next_action;

-- -----------------------------------------------------------------------------
-- Verify indexes created
-- -----------------------------------------------------------------------------

SELECT
    TABLE_NAME,
    INDEX_NAME,
    INDEX_TYPE,
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ', ') AS indexed_columns
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'pharmacy_db'
  AND INDEX_NAME != 'PRIMARY'
GROUP BY TABLE_NAME, INDEX_NAME, INDEX_TYPE
ORDER BY TABLE_NAME, INDEX_NAME;

-- =============================================================================
-- Migration: v003
-- Description: Add foreign key constraints and check constraints
-- Author: Database Architecture Team
-- Date: 2026-06-22
-- Dependencies: 001_create_tables.sql, 002_create_indexes.sql (tables and indexes must exist)
-- Estimated execution time: <5 seconds
-- Rollback: database/rollback/v003_rollback.sql
-- =============================================================================
-- Purpose: This script adds all data integrity constraints:
--   - Foreign key constraints with CASCADE RESTRICT (prevent accidental deletions)
--   - Check constraints for data validation (non-negative values, date logic)
--
-- Note: Constraints are added after tables and indexes to avoid circular
--       dependency issues and ensure foreign key indexes exist for performance
-- =============================================================================

USE pharmacy_db;

SELECT 'Starting migration v003: Add constraints...' AS status;

-- -----------------------------------------------------------------------------
-- Medicines Table Constraints
-- -----------------------------------------------------------------------------

-- Foreign key: medicines → suppliers
ALTER TABLE medicines
ADD CONSTRAINT fk_medicine_supplier
FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
ON DELETE RESTRICT
ON UPDATE CASCADE
COMMENT='Prevent deletion of suppliers with associated medicines';

-- Check constraint: expiry_date must be after manufacturing_date
ALTER TABLE medicines
ADD CONSTRAINT chk_medicine_dates
CHECK (expiry_date > manufacturing_date);

-- Check constraint: cost_price must be non-negative
ALTER TABLE medicines
ADD CONSTRAINT chk_medicine_cost_price
CHECK (cost_price >= 0);

-- Check constraint: selling_price must be non-negative
ALTER TABLE medicines
ADD CONSTRAINT chk_medicine_selling_price
CHECK (selling_price >= 0);

-- Check constraint: stock_quantity must be non-negative
ALTER TABLE medicines
ADD CONSTRAINT chk_medicine_stock_quantity
CHECK (stock_quantity >= 0);

-- Check constraint: reorder_threshold must be non-negative
ALTER TABLE medicines
ADD CONSTRAINT chk_medicine_reorder_threshold
CHECK (reorder_threshold >= 0);

-- -----------------------------------------------------------------------------
-- Sales Transactions Table Constraints
-- -----------------------------------------------------------------------------

-- Foreign key: sales_transactions → users
ALTER TABLE sales_transactions
ADD CONSTRAINT fk_transaction_user
FOREIGN KEY (user_id) REFERENCES users(user_id)
ON DELETE RESTRICT
ON UPDATE CASCADE
COMMENT='Prevent deletion of users with transaction history';

-- Check constraint: subtotal must be non-negative
ALTER TABLE sales_transactions
ADD CONSTRAINT chk_transaction_subtotal
CHECK (subtotal >= 0);

-- Check constraint: discount_applied must be non-negative
ALTER TABLE sales_transactions
ADD CONSTRAINT chk_transaction_discount
CHECK (discount_applied >= 0);

-- Check constraint: tax_amount must be non-negative
ALTER TABLE sales_transactions
ADD CONSTRAINT chk_transaction_tax
CHECK (tax_amount >= 0);

-- Check constraint: grand_total must be non-negative
ALTER TABLE sales_transactions
ADD CONSTRAINT chk_transaction_grand_total
CHECK (grand_total >= 0);

-- -----------------------------------------------------------------------------
-- Sales Items Table Constraints
-- -----------------------------------------------------------------------------

-- Foreign key: sales_items → sales_transactions
ALTER TABLE sales_items
ADD CONSTRAINT fk_sales_items_invoice
FOREIGN KEY (invoice_id) REFERENCES sales_transactions(invoice_id)
ON DELETE RESTRICT
ON UPDATE CASCADE
COMMENT='Prevent deletion of transactions with line items';

-- Foreign key: sales_items → medicines
ALTER TABLE sales_items
ADD CONSTRAINT fk_sales_items_medicine
FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id)
ON DELETE RESTRICT
ON UPDATE CASCADE
COMMENT='Prevent deletion of medicines with sales history';

-- Check constraint: quantity_sold must be positive (not zero)
ALTER TABLE sales_items
ADD CONSTRAINT chk_sales_items_quantity
CHECK (quantity_sold > 0);

-- Check constraint: unit_price_at_sale must be non-negative
ALTER TABLE sales_items
ADD CONSTRAINT chk_sales_items_price
CHECK (unit_price_at_sale >= 0);

-- Check constraint: line_total must be non-negative
ALTER TABLE sales_items
ADD CONSTRAINT chk_sales_items_total
CHECK (line_total >= 0);

-- -----------------------------------------------------------------------------
-- Record migration
-- -----------------------------------------------------------------------------

INSERT INTO schema_versions (version_number, description, applied_by, execution_time_ms)
VALUES (3, 'Add foreign key and check constraints', USER(), NULL)
ON DUPLICATE KEY UPDATE description=description;

SELECT 'Migration v003 complete: All constraints added.' AS status;
SELECT 'Next step: Run 004_seed_data.sql' AS next_action;

-- -----------------------------------------------------------------------------
-- Verify constraints created
-- -----------------------------------------------------------------------------

-- Show foreign keys
SELECT
    TABLE_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    DELETE_RULE,
    UPDATE_RULE
FROM information_schema.REFERENTIAL_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = 'pharmacy_db'
ORDER BY TABLE_NAME, CONSTRAINT_NAME;

-- Show check constraints
SELECT
    TABLE_NAME,
    CONSTRAINT_NAME,
    CHECK_CLAUSE
FROM information_schema.CHECK_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = 'pharmacy_db'
ORDER BY TABLE_NAME, CONSTRAINT_NAME;

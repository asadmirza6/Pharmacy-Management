-- =============================================================================
-- Migration: v004
-- Description: Insert seed data (initial admin user and sample data)
-- Author: Database Architecture Team
-- Date: 2026-06-22
-- Dependencies: 001_create_tables.sql, 002_create_indexes.sql, 003_create_constraints.sql
-- Estimated execution time: <2 seconds
-- Rollback: database/rollback/v004_rollback.sql
-- =============================================================================
-- Purpose: This script populates initial data for system bootstrap:
--   1. Default admin user account for first-time login
--   2. Sample supplier for testing medicine creation
--   3. Sample cashier user for testing POS operations
--   4. Sample medicine records for testing inventory and billing
--
-- IMPORTANT SECURITY NOTES:
--   - Default admin password is 'Admin@123' (hashed with bcrypt cost 12)
--   - MUST be changed on first login in production
--   - Default cashier password is 'Cashier@123' (hashed with bcrypt cost 12)
--   - These are for development/testing ONLY
-- =============================================================================

USE pharmacy_db;

SELECT 'Starting migration v004: Insert seed data...' AS status;

-- -----------------------------------------------------------------------------
-- Seed Data: Users
-- -----------------------------------------------------------------------------

-- Default admin user
-- Username: admin
-- Password: Admin@123 (bcrypt hash below with cost=12)
-- SECURITY WARNING: Change password immediately after first login in production
INSERT INTO users (full_name, username, password_hash, contact_details, role, is_active)
VALUES (
    'System Administrator',
    'admin',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYKHR92rKke',  -- bcrypt hash of 'Admin@123'
    'admin@pharmacy.local',
    'Admin',
    TRUE
)
ON DUPLICATE KEY UPDATE full_name=full_name;  -- Prevent duplicate on re-run

-- Default cashier user for testing
-- Username: cashier
-- Password: Cashier@123 (bcrypt hash below with cost=12)
-- SECURITY WARNING: For development/testing only
INSERT INTO users (full_name, username, password_hash, contact_details, role, is_active)
VALUES (
    'John Cashier',
    'cashier',
    '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',  -- bcrypt hash of 'Cashier@123'
    'cashier@pharmacy.local',
    'Cashier',
    TRUE
)
ON DUPLICATE KEY UPDATE full_name=full_name;

-- -----------------------------------------------------------------------------
-- Seed Data: Suppliers
-- -----------------------------------------------------------------------------

-- Sample supplier for testing medicine creation
INSERT INTO suppliers (company_name, contact_representative, phone_number, email_address, physical_address, outstanding_balance)
VALUES
(
    'PharmaCorp International Ltd',
    'Jane Smith',
    '+1-555-0100',
    'orders@pharmacorp.com',
    '123 Medical Plaza, Healthcare City, HC 12345',
    0.00
),
(
    'Global Medicines Supply Co',
    'Michael Johnson',
    '+1-555-0200',
    'sales@globalmeds.com',
    '456 Pharmaceutical Drive, MedCity, MC 67890',
    0.00
),
(
    'Healthcare Solutions Inc',
    'Sarah Williams',
    '+1-555-0300',
    'contact@healthsolutions.com',
    '789 Wellness Boulevard, PharmaTown, PT 11223',
    0.00
)
ON DUPLICATE KEY UPDATE company_name=company_name;

-- -----------------------------------------------------------------------------
-- Seed Data: Medicines
-- -----------------------------------------------------------------------------

-- Sample medicines for testing inventory and POS operations
-- Using supplier_id from inserted suppliers (assuming IDs 1, 2, 3)

INSERT INTO medicines (brand_name, generic_name, batch_number, manufacturing_date, expiry_date, cost_price, selling_price, stock_quantity, reorder_threshold, supplier_id)
VALUES
-- Common pain relievers
(
    'Paracetamol 500mg Tablets',
    'Acetaminophen',
    'B2024-001',
    '2024-01-15',
    '2027-01-14',
    5.00,
    8.50,
    500,
    50,
    1  -- PharmaCorp International
),
(
    'Ibuprofen 400mg Tablets',
    'Ibuprofen',
    'B2024-002',
    '2024-02-20',
    '2027-02-19',
    6.50,
    10.00,
    300,
    40,
    1  -- PharmaCorp International
),
-- Antibiotics
(
    'Amoxicillin 500mg Capsules',
    'Amoxicillin',
    'B2024-003',
    '2024-03-10',
    '2026-03-09',
    12.00,
    18.00,
    200,
    30,
    2  -- Global Medicines Supply Co
),
(
    'Azithromycin 250mg Tablets',
    'Azithromycin',
    'B2024-004',
    '2024-04-05',
    '2026-04-04',
    15.00,
    22.50,
    150,
    25,
    2  -- Global Medicines Supply Co
),
-- Vitamins and supplements
(
    'Vitamin C 1000mg Tablets',
    'Ascorbic Acid',
    'B2024-005',
    '2024-05-12',
    '2027-05-11',
    3.50,
    6.00,
    800,
    100,
    3  -- Healthcare Solutions Inc
),
(
    'Multivitamin Daily Capsules',
    'Multivitamin',
    'B2024-006',
    '2024-06-01',
    '2027-05-31',
    4.00,
    7.50,
    600,
    80,
    3  -- Healthcare Solutions Inc
),
-- Cold and flu
(
    'Cetirizine 10mg Tablets',
    'Cetirizine',
    'B2024-007',
    '2024-07-18',
    '2027-07-17',
    4.50,
    7.00,
    400,
    60,
    1  -- PharmaCorp International
),
-- Test data: Low stock item (should trigger reorder alert)
(
    'Aspirin 100mg Tablets',
    'Acetylsalicylic Acid',
    'B2024-008',
    '2024-08-22',
    '2027-08-21',
    2.50,
    4.50,
    8,  -- Below reorder threshold of 10
    10,
    2  -- Global Medicines Supply Co
),
-- Test data: Near-expiry item (should trigger expiry alert if within 30-60 days)
(
    'Loratadine 10mg Tablets',
    'Loratadine',
    'B2023-009',
    '2023-09-15',
    DATE_ADD(CURDATE(), INTERVAL 45 DAY),  -- Expires in 45 days
    5.50,
    9.00,
    120,
    20,
    3  -- Healthcare Solutions Inc
),
-- Test data: Multiple batches of same medicine
(
    'Paracetamol 500mg Tablets',
    'Acetaminophen',
    'B2024-010',  -- Different batch than B2024-001
    '2024-10-01',
    '2027-09-30',
    5.00,
    8.50,
    250,
    50,
    1  -- PharmaCorp International
)
ON DUPLICATE KEY UPDATE brand_name=brand_name;

-- -----------------------------------------------------------------------------
-- Seed Data: Sample Transaction (optional, for testing)
-- -----------------------------------------------------------------------------

-- Sample transaction to demonstrate sales recording
-- Uses cashier user_id=2 (assuming admin=1, cashier=2)
-- Transaction with 3 line items

INSERT INTO sales_transactions (user_id, transaction_timestamp, subtotal, discount_applied, tax_amount, grand_total, payment_mode)
VALUES
(
    2,  -- cashier user
    NOW(),
    32.50,  -- subtotal (8.50 + 10.00 + 7.00 + 7.00)
    2.00,   -- discount
    3.05,   -- tax (10% on 30.50)
    33.55,  -- grand total (32.50 - 2.00 + 3.05)
    'Cash'
)
ON DUPLICATE KEY UPDATE user_id=user_id;

-- Get the inserted invoice_id (will be 1 if first transaction)
SET @invoice_id = LAST_INSERT_ID();

-- Line items for the sample transaction
INSERT INTO sales_items (invoice_id, medicine_id, quantity_sold, unit_price_at_sale, line_total)
VALUES
(@invoice_id, 1, 2, 8.50, 17.00),   -- 2x Paracetamol @ 8.50
(@invoice_id, 2, 1, 10.00, 10.00),  -- 1x Ibuprofen @ 10.00
(@invoice_id, 7, 1, 7.00, 7.00)     -- 1x Cetirizine @ 7.00
ON DUPLICATE KEY UPDATE quantity_sold=quantity_sold;

-- Update stock quantities after sample transaction
UPDATE medicines SET stock_quantity = stock_quantity - 2 WHERE medicine_id = 1;
UPDATE medicines SET stock_quantity = stock_quantity - 1 WHERE medicine_id = 2;
UPDATE medicines SET stock_quantity = stock_quantity - 1 WHERE medicine_id = 7;

-- -----------------------------------------------------------------------------
-- Record migration
-- -----------------------------------------------------------------------------

INSERT INTO schema_versions (version_number, description, applied_by, execution_time_ms)
VALUES (4, 'Insert seed data (users, suppliers, medicines, sample transaction)', USER(), NULL)
ON DUPLICATE KEY UPDATE description=description;

SELECT 'Migration v004 complete: Seed data inserted.' AS status;
SELECT 'Schema setup complete. Ready for application deployment.' AS next_action;

-- -----------------------------------------------------------------------------
-- Display seed data summary
-- -----------------------------------------------------------------------------

SELECT '=== SEED DATA SUMMARY ===' AS '';

SELECT 'Users created:' AS '', COUNT(*) AS count FROM users;
SELECT 'Suppliers created:' AS '', COUNT(*) AS count FROM suppliers;
SELECT 'Medicines created:' AS '', COUNT(*) AS count FROM medicines;
SELECT 'Sample transactions:' AS '', COUNT(*) AS count FROM sales_transactions;

SELECT '=== DEFAULT CREDENTIALS (CHANGE IMMEDIATELY) ===' AS '';
SELECT 'Admin username: admin, password: Admin@123' AS credentials;
SELECT 'Cashier username: cashier, password: Cashier@123' AS credentials;

SELECT '=== LOW STOCK ALERTS ===' AS '';
SELECT
    medicine_id,
    brand_name,
    batch_number,
    stock_quantity,
    reorder_threshold
FROM medicines
WHERE stock_quantity <= reorder_threshold;

SELECT '=== NEAR-EXPIRY ALERTS (30-60 days) ===' AS '';
SELECT
    medicine_id,
    brand_name,
    batch_number,
    expiry_date,
    DATEDIFF(expiry_date, CURDATE()) AS days_until_expiry
FROM medicines
WHERE expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 60 DAY);

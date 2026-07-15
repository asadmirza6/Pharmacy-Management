-- Vendor & Inventory Management System - Database Migration
-- PostgreSQL schema updates for Neon database
-- Run this migration: node database/migrations/003_vendor_inventory_system.js

-- A. Create Vendors Table
CREATE TABLE IF NOT EXISTS vendors (
    vendor_id SERIAL PRIMARY KEY,
    vendor_name VARCHAR(150) UNIQUE NOT NULL,
    contact_person VARCHAR(150),
    phone VARCHAR(50),
    email VARCHAR(150),
    address TEXT,
    total_ordered_amount DECIMAL(12, 2) DEFAULT 0.00,
    total_paid_amount DECIMAL(12, 2) DEFAULT 0.00,
    balance_amount DECIMAL(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- B. Modify Medicines Table - Add new columns
ALTER TABLE medicines
ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS current_vendor_id INT REFERENCES vendors(vendor_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cost_per_box DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS cost_per_tablet DECIMAL(10, 2) DEFAULT 0.00;

-- C. Create Vendor Supply History Table
CREATE TABLE IF NOT EXISTS vendor_supply_history (
    supply_id SERIAL PRIMARY KEY,
    vendor_id INT REFERENCES vendors(vendor_id) ON DELETE CASCADE,
    medicine_id UUID REFERENCES medicines(id) ON DELETE CASCADE,
    medicine_name VARCHAR(255) NOT NULL,
    quantity_added INT NOT NULL,
    price_per_box DECIMAL(10, 2),
    price_per_tablet DECIMAL(10, 2),
    total_cost DECIMAL(12, 2) NOT NULL,
    amount_paid_this_batch DECIMAL(10, 2) DEFAULT 0.00,
    balance_remaining DECIMAL(10, 2) DEFAULT 0.00,
    supply_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- D. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_medicines_is_live ON medicines(is_live);
CREATE INDEX IF NOT EXISTS idx_medicines_vendor ON medicines(current_vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_supply_vendor ON vendor_supply_history(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_supply_medicine ON vendor_supply_history(medicine_id);
CREATE INDEX IF NOT EXISTS idx_vendor_supply_date ON vendor_supply_history(supply_date);

-- E. Insert sample vendors (if not exists)
INSERT INTO vendors (vendor_name, contact_person, phone, email, address)
VALUES
    ('Mirza Pharma Company', 'Mr. Mirza', '+92-300-1234567', 'mirza@pharmaco.pk', 'Karachi, Pakistan'),
    ('Asad Medical Supplies', 'Mr. Asad Ahmed', '+92-321-9876543', 'asad@medical.pk', 'Lahore, Pakistan'),
    ('Global Medicines Ltd', 'Ms. Sarah Khan', '+92-333-5555555', 'contact@globalmed.pk', 'Islamabad, Pakistan')
ON CONFLICT (vendor_name) DO NOTHING;

-- F. Update trigger for vendors updated_at
CREATE OR REPLACE FUNCTION update_vendor_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_vendor_timestamp ON vendors;
CREATE TRIGGER trigger_update_vendor_timestamp
BEFORE UPDATE ON vendors
FOR EACH ROW
EXECUTE FUNCTION update_vendor_updated_at();

COMMIT;

-- Migration: Add Package and Unit Level Tracking
-- Description: Add fields to support package-level (strip/box/bottle) and unit-level (tablet/pill) tracking
-- Date: 2026-07-06

-- Add packaging columns to medicines table
ALTER TABLE medicines
ADD COLUMN IF NOT EXISTS package_type VARCHAR(50) DEFAULT 'piece',
ADD COLUMN IF NOT EXISTS units_per_package INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS package_cost_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS package_selling_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS total_packages INTEGER DEFAULT 0;

-- Update existing records to maintain backward compatibility
UPDATE medicines
SET
    package_type = 'piece',
    units_per_package = 1,
    package_cost_price = cost_price,
    package_selling_price = selling_price,
    total_packages = stock_quantity
WHERE package_type IS NULL OR units_per_package IS NULL;

-- Add check constraint to ensure units_per_package is positive
ALTER TABLE medicines
ADD CONSTRAINT check_units_per_package_positive
CHECK (units_per_package > 0);

-- Create index for package_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_medicines_package_type ON medicines(package_type);

-- Add comments for documentation
COMMENT ON COLUMN medicines.package_type IS 'Type of packaging: strip, box, bottle, piece, sachet, vial, injection';
COMMENT ON COLUMN medicines.units_per_package IS 'Number of units (tablets/pills) in one package';
COMMENT ON COLUMN medicines.package_cost_price IS 'Cost price of one complete package';
COMMENT ON COLUMN medicines.package_selling_price IS 'Selling price of one complete package';
COMMENT ON COLUMN medicines.total_packages IS 'Total number of complete packages in stock (calculated)';
COMMENT ON COLUMN medicines.cost_price IS 'Cost price per individual unit (calculated from package_cost_price / units_per_package)';
COMMENT ON COLUMN medicines.selling_price IS 'Selling price per individual unit (calculated from package_selling_price / units_per_package)';
COMMENT ON COLUMN medicines.stock_quantity IS 'Total individual units in stock (tablets/pills/items)';

COMMIT;

# Implementation Plan: Package + Unit Level Medicine Tracking

## Feature Overview
Enable pharmacy system to track medicines at both package level (strips/boxes/bottles) and individual unit level (tablets/pills). Allow flexible inventory management and accurate per-unit billing.

## User Requirements
- **Inventory Entry**: Enter stock in packages (e.g., "10 strips of Panadol, each strip has 10 tablets")
- **Package Types**: Support strip, box, bottle, piece, and other packaging types
- **Pricing**: Package price is primary; unit price auto-calculated
- **POS Billing**: Customer can buy any quantity (e.g., 4 tablets); system calculates price automatically
- **Display**: Show both package and unit information everywhere

## Database Schema Changes

### Add to `medicines` table:
```sql
ALTER TABLE medicines
ADD COLUMN package_type VARCHAR(50) DEFAULT 'piece',
ADD COLUMN units_per_package INTEGER DEFAULT 1,
ADD COLUMN package_cost_price DECIMAL(10, 2),
ADD COLUMN package_selling_price DECIMAL(10, 2),
ADD COLUMN total_packages INTEGER DEFAULT 0;

-- Add computed column for unit selling price (optional, can compute in app)
-- unit_selling_price = package_selling_price / units_per_package
```

### Field Definitions:
- `package_type`: 'strip', 'box', 'bottle', 'piece', 'sachet', 'vial', 'injection'
- `units_per_package`: Number of units in one package (e.g., 10 tablets per strip)
- `package_cost_price`: Cost price of one complete package
- `package_selling_price`: Selling price of one complete package
- `total_packages`: Total packages in stock (calculated from stock_quantity)
- `stock_quantity`: Total individual units (remains as total tablets/units)
- `cost_price`: Per-unit cost (calculated: package_cost_price / units_per_package)
- `selling_price`: Per-unit selling (calculated: package_selling_price / units_per_package)

### Calculation Logic:
```
Given: package_selling_price = Rs 100, units_per_package = 10
Then: selling_price (per unit) = 100 / 10 = Rs 10

If customer buys 4 tablets:
Price = 4 × 10 = Rs 40
```

## API Changes

### POST /api/medicines (Add New Medicine)
**Request Body:**
```json
{
  "brand_name": "Panadol",
  "generic_name": "Paracetamol",
  "batch_number": "B2024-001",
  "manufacturing_date": "2024-01-01",
  "expiry_date": "2026-01-01",
  "package_type": "strip",
  "units_per_package": 10,
  "package_cost_price": 80.00,
  "package_selling_price": 100.00,
  "stock_quantity": 100,
  "reorder_threshold": 20,
  "supplier_id": "SUP-001",
  "supplier_name": "PharmaCorp"
}
```

**Backend Processing:**
- Calculate `cost_price = package_cost_price / units_per_package`
- Calculate `selling_price = package_selling_price / units_per_package`
- Calculate `total_packages = stock_quantity / units_per_package`
- Validate: `stock_quantity` should be multiple of `units_per_package` (or allow partial)

### PUT /api/medicines/:id (Update Medicine)
- Allow updating package info
- Recalculate unit prices automatically

### POST /api/suppliers/:id/purchase (Add Stock)
**Request Body:**
```json
{
  "medicine_id": "uuid",
  "quantity_type": "packages",
  "quantity": 10,
  "cost_price": 80.00
}
```

**Backend Processing:**
- If `quantity_type === 'packages'`:
  - `units_to_add = quantity × units_per_package`
  - `stock_quantity += units_to_add`
  - `total_packages = stock_quantity / units_per_package`

### GET /api/medicines (List Medicines)
**Response includes new fields:**
```json
{
  "id": "uuid",
  "brand_name": "Panadol",
  "package_type": "strip",
  "units_per_package": 10,
  "package_selling_price": 100.00,
  "selling_price": 10.00,
  "stock_quantity": 100,
  "total_packages": 10,
  "display_stock": "100 tablets (10 strips)"
}
```

## Frontend Changes

### 1. Inventory Management Forms

#### Add New Medicine Form
Add fields:
- **Package Type** (dropdown): Strip, Box, Bottle, Piece, Sachet, Vial, Injection
- **Units per Package** (number): e.g., 10
- **Package Cost Price** (decimal): e.g., Rs 80.00
- **Package Selling Price** (decimal): e.g., Rs 100.00
- **Initial Stock Quantity** (number): Total units (e.g., 100 tablets)

Display calculated values:
- Unit Cost Price: Rs 8.00
- Unit Selling Price: Rs 10.00
- Total Packages: 10 strips

#### Add Stock to Existing Medicine Form
Add option:
- **Quantity Type**: Radio buttons - "Packages" (default) | "Units"
- If Packages selected: "Enter number of strips/boxes"
- If Units selected: "Enter number of tablets/pills"

Show medicine package info:
- "Panadol (Strip of 10 tablets)"
- "Current Stock: 100 tablets (10 strips)"

### 2. Medicines Table Display

Update table columns to show:
```
| Medicine | Package Info | Stock | Price |
| Panadol | Strip (10 tabs) | 100 units (10 strips) | Rs 10.00/tab (Rs 100/strip) |
```

### 3. POS Billing

**Medicine Selection Dropdown:**
```
Panadol - Strip of 10 tablets - Stock: 100 (10 strips) - Rs 10.00/tablet
```

**Cart Display:**
```
Panadol (4 tablets)
4 × Rs 10.00 = Rs 40.00
```

**Quantity Input:**
- Allow any quantity (not restricted to package size)
- Show package equivalent: "4 tablets = 0.4 strips"

### 4. Statistics & Alerts

**Low Stock Alerts:**
- Alert based on total units: "Panadol: 15 tablets (1.5 strips) remaining"

## Implementation Steps

### Step 1: Database Migration
- Create migration file: `database/migrations/005_add_packaging_fields.sql`
- Add new columns to medicines table
- Update existing records with default values

### Step 2: Backend API Updates
- Update `routes/medicines.js`:
  - Add package fields to POST/PUT handlers
  - Calculate unit prices automatically
  - Update response to include package info
- Update `routes/suppliers.js`:
  - Modify purchase endpoint to handle package quantities

### Step 3: Frontend Form Updates
- Update Add Medicine modal (index.html):
  - Add package type dropdown
  - Add units per package field
  - Add package price fields
  - Show calculated unit prices in real-time
- Update Inventory Management section:
  - Add package fields to "Add New Medicine" form
  - Update "Add Stock" form with quantity type selector

### Step 4: Frontend Display Updates
- Update medicine table display
- Update POS medicine selection
- Update cart display
- Update statistics cards

### Step 5: Calculation Logic
Create utility functions:
```javascript
function calculateUnitPrice(packagePrice, unitsPerPackage) {
  return (packagePrice / unitsPerPackage).toFixed(2);
}

function calculatePackageEquivalent(units, unitsPerPackage) {
  return (units / unitsPerPackage).toFixed(2);
}

function formatStockDisplay(stockQuantity, unitsPerPackage, packageType) {
  const packages = Math.floor(stockQuantity / unitsPerPackage);
  return `${stockQuantity} units (${packages} ${packageType}s)`;
}
```

### Step 6: Testing
- Test adding medicine with packaging
- Test inventory addition with packages
- Test POS billing with partial quantities
- Test stock calculations
- Test price calculations

## Edge Cases to Handle

1. **Partial Packages**: Stock may not be exact multiple of package size
   - Example: 95 tablets when strip has 10 → "95 tablets (9 strips + 5 loose)"

2. **Package Type "Piece"**: Some items sold individually
   - units_per_package = 1
   - Display as single units only

3. **Selling Partial Packages**: Customer buys 7 tablets from 10-tablet strip
   - Calculate: 7 × (package_price / 10)
   - No restriction on minimum quantity

4. **Stock Update**: When adding/selling, maintain accurate unit count
   - Always work in units internally
   - Convert packages to units for storage

5. **Price Rounding**: Unit price may have decimals
   - Store with 2 decimal precision
   - Display with proper rounding

## Success Criteria

- ✅ Medicine can be added with package information
- ✅ Stock can be added in packages (e.g., "10 strips")
- ✅ System calculates total units automatically
- ✅ POS allows selling any quantity (e.g., 4 tablets)
- ✅ Price calculated accurately: (package_price / units_per_package) × quantity
- ✅ Stock display shows both units and packages
- ✅ Database stores package and unit information
- ✅ All existing functionality remains working

## Migration Strategy

**For Existing Medicines:**
- Set `package_type = 'piece'`
- Set `units_per_package = 1`
- Set `package_cost_price = cost_price`
- Set `package_selling_price = selling_price`
- This ensures backward compatibility

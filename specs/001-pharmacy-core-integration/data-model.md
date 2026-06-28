# Data Model: Pharmacy Core Integration

**Feature**: 001-pharmacy-core-integration  
**Date**: 2026-06-23  
**Status**: Draft

## Overview

This document defines the data structures for pharmacy core features: medicines (existing), suppliers, invoices, and computed entities (alerts, statistics). All data is stored in-memory as JavaScript objects/arrays during this mock phase.

---

## Entities

### 1. Medicine (EXISTING - Enhanced)

**Description**: Pharmaceutical products in inventory with stock levels, pricing, and supplier information.

**Storage**: `data/medicines.js` - array of medicine objects

**Schema**:

```javascript
{
  // Identity
  id: String,                    // UUID v4, primary identifier
  brand_name: String,            // Commercial product name (e.g., "Paracetamol 500mg Tablets")
  generic_name: String,          // Active ingredient name (e.g., "Acetaminophen")
  batch_number: String,          // Manufacturer batch/lot number for traceability
  
  // Dates
  manufacturing_date: String,    // ISO 8601 date string (YYYY-MM-DD)
  expiry_date: String,           // ISO 8601 date string (YYYY-MM-DD)
  created_at: String,            // ISO 8601 datetime (when record created)
  updated_at: String,            // ISO 8601 datetime (last modification)
  
  // Pricing (2 decimal places)
  cost_price: Number,            // Purchase cost per unit
  selling_price: Number,         // Retail price per unit
  
  // Inventory
  stock_quantity: Number,        // Current units in stock (integer >= 0)
  reorder_threshold: Number,     // Minimum stock level before reorder alert (integer >= 0)
  
  // Supplier relationship
  supplier_id: String,           // References Supplier.id
  supplier_name: String          // Denormalized for display convenience
}
```

**Validation Rules**:
- `id`: Required, UUID format
- `brand_name`: Required, non-empty string
- `generic_name`: Required, non-empty string
- `batch_number`: Required, non-empty string
- `manufacturing_date`: Required, valid ISO date, <= expiry_date
- `expiry_date`: Required, valid ISO date, >= manufacturing_date
- `cost_price`: Required, decimal >= 0.00
- `selling_price`: Required, decimal >= cost_price (enforce margin >= 0)
- `stock_quantity`: Required, integer >= 0
- `reorder_threshold`: Required, integer >= 0
- `supplier_id`: Required, non-empty string
- `supplier_name`: Required, non-empty string

**Computed Properties** (not stored):
- `days_until_expiry`: Calculated as `(expiry_date - today) / 86400000`
- `is_near_expiry`: Boolean, true if `days_until_expiry <= 30`
- `is_low_stock`: Boolean, true if `stock_quantity <= reorder_threshold`
- `inventory_value`: Calculated as `stock_quantity * cost_price`

**Example**:
```javascript
{
  id: "a3f2c789-1234-5678-9abc-def012345678",
  brand_name: "Paracetamol 500mg Tablets",
  generic_name: "Acetaminophen",
  batch_number: "B2024-001",
  manufacturing_date: "2024-01-15",
  expiry_date: "2027-01-14",
  cost_price: 5.00,
  selling_price: 8.50,
  stock_quantity: 500,
  reorder_threshold: 50,
  supplier_id: "SUP-001",
  supplier_name: "PharmaCorp International Ltd",
  created_at: "2026-06-23T08:00:00.000Z",
  updated_at: "2026-06-23T08:00:00.000Z"
}
```

---

### 2. Supplier (NEW)

**Description**: Business entities that supply medicines to the pharmacy. Tracks contact information and financial ledger balance.

**Storage**: `data/suppliers.js` - array of supplier objects

**Schema**:

```javascript
{
  // Identity
  id: String,                    // Unique identifier (e.g., "SUP-001")
  name: String,                  // Business name
  
  // Contact
  contact_person: String,        // Primary contact name
  phone: String,                 // Phone number
  email: String,                 // Email address
  address: String,               // Physical address
  
  // Financial
  ledger_balance: Number,        // Current account balance (2 decimals)
                                 // Positive = pharmacy owes supplier
                                 // Negative = supplier owes pharmacy (credit)
  
  // Metadata
  created_at: String,            // ISO 8601 datetime
  updated_at: String             // ISO 8601 datetime
}
```

**Validation Rules**:
- `id`: Required, unique, non-empty string
- `name`: Required, non-empty string
- `contact_person`: Optional, string
- `phone`: Optional, string (no format validation in mock)
- `email`: Optional, string (no format validation in mock)
- `address`: Optional, string
- `ledger_balance`: Required, decimal (can be positive, zero, or negative)
- `created_at`, `updated_at`: Required, ISO 8601 datetime

**Relationships**:
- One supplier can supply many medicines (one-to-many)
- Medicine.supplier_id references Supplier.id

**Example**:
```javascript
{
  id: "SUP-001",
  name: "PharmaCorp International Ltd",
  contact_person: "John Supplier",
  phone: "+1-555-0100",
  email: "orders@pharmacorp.com",
  address: "123 Medical Drive, Pharmacy City, PC 12345",
  ledger_balance: 15000.00,  // Pharmacy owes 15,000 to this supplier
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-06-23T08:00:00.000Z"
}
```

---

### 3. Invoice (NEW)

**Description**: Record of completed sales transactions. Immutable once created (no updates, only inserts).

**Storage**: `data/invoices.js` - array of invoice objects

**Schema**:

```javascript
{
  // Identity
  id: String,                    // UUID v4, primary identifier
  invoice_number: String,        // Human-readable sequential number (e.g., "INV-2026-0001")
  
  // Timestamp
  timestamp: String,             // ISO 8601 datetime when sale completed
  
  // Items (nested array)
  items: [
    {
      medicine_id: String,       // References Medicine.id at time of sale
      medicine_name: String,     // Denormalized for audit trail
      batch_number: String,      // Denormalized for traceability
      quantity: Number,          // Units sold (integer > 0)
      unit_price: Number,        // Selling price at time of sale (2 decimals)
      subtotal: Number           // quantity * unit_price (2 decimals)
    }
  ],
  
  // Totals
  total_amount: Number,          // Sum of all item subtotals (2 decimals)
  
  // Payment
  payment_status: String,        // "completed" | "pending" | "cancelled"
  payment_method: String,        // "cash" | "card" | "insurance" (future use)
  
  // Customer (optional for walk-ins)
  customer_name: String,         // Customer name or "Walk-in Customer"
  customer_phone: String,        // Optional phone number
  
  // Audit
  served_by: String              // User ID (placeholder: "system" until auth implemented)
}
```

**Validation Rules**:
- `id`: Required, UUID format
- `invoice_number`: Required, unique, format "INV-YYYY-####"
- `timestamp`: Required, ISO 8601 datetime
- `items`: Required, array with min length 1
- `items[].medicine_id`: Required, non-empty string
- `items[].medicine_name`: Required, non-empty string
- `items[].batch_number`: Required, non-empty string
- `items[].quantity`: Required, integer > 0
- `items[].unit_price`: Required, decimal >= 0.00
- `items[].subtotal`: Required, decimal, must equal `quantity * unit_price`
- `total_amount`: Required, decimal, must equal sum of all subtotals
- `payment_status`: Required, enum ["completed", "pending", "cancelled"]
- `payment_method`: Optional, string
- `customer_name`: Optional, string (default: "Walk-in Customer")
- `customer_phone`: Optional, string
- `served_by`: Required, non-empty string

**Relationships**:
- One invoice has many invoice items (one-to-many, nested)
- InvoiceItem.medicine_id references Medicine.id (denormalized snapshot)

**Immutability**: Once created, invoices are never updated. Cancellations create new records with `payment_status: "cancelled"`.

**Example**:
```javascript
{
  id: "b8d3e890-5678-9abc-def0-123456789012",
  invoice_number: "INV-2026-0042",
  timestamp: "2026-06-23T10:30:45.123Z",
  items: [
    {
      medicine_id: "a3f2c789-1234-5678-9abc-def012345678",
      medicine_name: "Paracetamol 500mg Tablets",
      batch_number: "B2024-001",
      quantity: 2,
      unit_price: 8.50,
      subtotal: 17.00
    },
    {
      medicine_id: "c9e4f012-3456-7890-abcd-ef0123456789",
      medicine_name: "Ibuprofen 400mg Tablets",
      batch_number: "B2024-002",
      quantity: 1,
      unit_price: 10.00,
      subtotal: 10.00
    }
  ],
  total_amount: 27.00,
  payment_status: "completed",
  payment_method: "cash",
  customer_name: "Walk-in Customer",
  customer_phone: null,
  served_by: "system"
}
```

---

### 4. Alert (COMPUTED - Not Persisted)

**Description**: System-generated warnings about inventory conditions. Computed on-demand from medicine data.

**Storage**: Not persisted; generated by aggregation functions in `data/medicines.js`

**Schema**:

```javascript
{
  // Identity
  id: String,                    // Composite: "type-medicine_id" (e.g., "expiry-abc123")
  
  // Classification
  type: String,                  // "expiry" | "low_stock" | "transaction_error"
  severity: String,              // "critical" | "high" | "medium" | "low"
  
  // Content
  message: String,               // Human-readable alert text
  timestamp: String,             // ISO 8601 datetime when alert generated
  
  // References
  medicine_id: String,           // References Medicine.id (if medicine-related)
  invoice_id: String             // References Invoice.id (if transaction-related, future)
}
```

**Alert Types**:

1. **Expiry Alerts** (`type: "expiry"`):
   - Generated for medicines where `days_until_expiry <= 30`
   - Severity based on days remaining:
     - `critical`: 0-7 days
     - `high`: 8-14 days
     - `medium`: 15-30 days

2. **Low Stock Alerts** (`type: "low_stock"`):
   - Generated for medicines where `stock_quantity <= reorder_threshold`
   - Severity: always `medium` (unless stock = 0, then `high`)

3. **Transaction Errors** (future):
   - `type: "transaction_error"`, generated on billing failures

**Example**:
```javascript
{
  id: "expiry-a3f2c789-1234-5678-9abc-def012345678",
  type: "expiry",
  severity: "critical",
  message: "Paracetamol 500mg Tablets expires in 5 days (Batch: B2024-001)",
  timestamp: "2026-06-23T10:00:00.000Z",
  medicine_id: "a3f2c789-1234-5678-9abc-def012345678",
  invoice_id: null
}
```

---

### 5. InventoryStatistics (COMPUTED - Not Persisted)

**Description**: Aggregate metrics computed from medicine data.

**Storage**: Not persisted; calculated on-demand in `data/medicines.js`

**Schema**:

```javascript
{
  // Item counts
  total_products: Number,        // Count of distinct medicine records
  total_items: Number,           // Sum of all stock_quantity values
  
  // Financial
  total_value: Number,           // Sum of (stock_quantity * cost_price) across all medicines
  
  // Alerts
  near_expiry_count: Number,     // Count of medicines expiring within 30 days
  low_stock_count: Number,       // Count of medicines with stock <= reorder_threshold
  
  // Computed timestamp
  computed_at: String            // ISO 8601 datetime when statistics calculated
}
```

**Calculation Logic**:
```javascript
function getInventoryStatistics() {
  const medicines = getAllMedicines();
  return {
    total_products: medicines.length,
    total_items: medicines.reduce((sum, m) => sum + m.stock_quantity, 0),
    total_value: medicines.reduce((sum, m) => sum + (m.stock_quantity * m.cost_price), 0).toFixed(2),
    near_expiry_count: getNearExpiryMedicines(30).length,
    low_stock_count: getLowStockMedicines().length,
    computed_at: new Date().toISOString()
  };
}
```

**Example**:
```javascript
{
  total_products: 5,
  total_items: 1808,
  total_value: "12450.00",
  near_expiry_count: 1,
  low_stock_count: 2,
  computed_at: "2026-06-23T10:15:30.456Z"
}
```

---

## Data Relationships Diagram

```text
┌─────────────────┐
│    Supplier     │
│  - id           │
│  - name         │
│  - ledger_bal   │
└────────┬────────┘
         │
         │ supplies (1:N)
         │
         ▼
┌─────────────────┐         ┌──────────────────┐
│    Medicine     │◄────────│   Invoice Item   │
│  - id           │ refs    │  - medicine_id   │
│  - brand_name   │         │  - quantity      │
│  - stock_qty    │         │  - unit_price    │
│  - expiry_date  │         └────────┬─────────┘
│  - supplier_id  │                  │
└────────┬────────┘                  │ nested in (1:N)
         │                           │
         │ computes                  ▼
         │                  ┌─────────────────┐
         ▼                  │     Invoice     │
┌─────────────────┐        │  - id           │
│     Alert       │        │  - timestamp    │
│  - type         │        │  - items[]      │
│  - severity     │        │  - total_amount │
│  - medicine_id  │        └─────────────────┘
└─────────────────┘

┌─────────────────┐
│   Statistics    │
│  - total_value  │
│  - expiry_count │
└─────────────────┘
  (computed from Medicine)
```

---

## Data Access Patterns

### Read Operations

1. **Get all medicines**: `GET /api/medicines` → returns array of Medicine
2. **Get near-expiry medicines**: `GET /api/medicines/near-expiry?threshold=30`
3. **Get inventory statistics**: `GET /api/medicines/statistics` → returns InventoryStatistics
4. **Get all suppliers**: `GET /api/suppliers` → returns array of Supplier
5. **Get all invoices**: `GET /api/billing/invoices` → returns array of Invoice
6. **Get aggregated alerts**: `GET /api/medicines/alerts` → returns array of Alert

### Write Operations

1. **Add medicine**: `POST /api/medicines` → creates Medicine, returns created object
2. **Update medicine stock**: `PUT /api/medicines/:id` → updates Medicine.stock_quantity
3. **Process sale**: `POST /api/billing/checkout` → creates Invoice, updates Medicine stock (atomic)
4. **Add supplier**: `POST /api/suppliers` → creates Supplier (future enhancement)

### Data Consistency Rules

1. **Billing atomic operation**: Stock validation + deduction + invoice creation must succeed or fail together
2. **Immutable invoices**: Once created, invoices cannot be modified (audit trail integrity)
3. **Denormalized data**: Invoice items store medicine_name and batch_number at time of sale (prevents data loss if medicine deleted)
4. **Computed entities**: Alerts and statistics always reflect current state (no stale data)

---

## Migration Notes

**Current State**: In-memory JavaScript arrays  
**Future State**: MySQL database with tables matching these entities

**Migration Path**:
1. Phase 1 (current): In-memory mock data for rapid prototyping
2. Phase 2: Add MySQL schema creation scripts based on this model
3. Phase 3: Replace data layer functions with database queries (API contracts remain unchanged)

**Schema Mapping** (for future MySQL migration):
- Medicine → `medicines` table
- Supplier → `suppliers` table
- Invoice → `invoices` table
- InvoiceItem → `invoice_items` table (separate table with foreign key)
- Alert → Not persisted (computed view)
- Statistics → Not persisted (computed aggregate query)

---

## Validation Summary

All entities satisfy:
- ✅ Constitution I: Full traceability with timestamps and immutable records
- ✅ Spec FR-001 to FR-014: All functional requirements mappable to entity fields
- ✅ Data integrity: Validation rules prevent invalid states
- ✅ Audit compliance: Denormalized critical fields for historical accuracy

**Status**: Ready for API contract generation

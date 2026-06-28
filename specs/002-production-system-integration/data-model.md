# Data Model: Production System Integration

**Feature**: 002-production-system-integration  
**Date**: 2026-06-23  
**Phase**: Phase 1 - Design

This document defines the data model for production system integration, focusing on the new customers (patients) entity and modifications to existing schema.

---

## Overview

This feature builds upon the database schema established in feature 001-database-architecture. The primary additions are:

1. **customers (patients table)**: New entity for customer contact management
2. **sales_transactions.patient_id**: Foreign key linking sales to customers (optional)

All other entities (medicines, suppliers, sales_transactions, sales_items, users, schema_versions) remain as defined in feature 001 data-model.md.

---

## New Entity: Customers (patients table)

### Business Context

Represents pharmacy customers for loyalty tracking and purchase history analysis. Stores basic contact information only - no medical records or prescription data. Table is named "patients" for historical consistency with feature 001 schema but serves simple customer relationship management purpose.

### Schema Definition

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| `patient_id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique customer identifier |
| `full_name` | VARCHAR(100) | NOT NULL | Customer's full name |
| `contact_number` | VARCHAR(20) | NULL | Customer phone number (optional) |
| `email` | VARCHAR(100) | NULL | Customer email address (optional) |
| `address` | VARCHAR(500) | NULL | Customer physical address (optional) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |

### Indexes

- `PRIMARY KEY` on `patient_id` (clustered index)
- `INDEX idx_patient_name` on `full_name` - for customer search by name
- `INDEX idx_patient_contact` on `contact_number` - for customer lookup by phone

### Business Rules

- `full_name` is mandatory; all other contact fields are optional
- Multiple customers can have the same name (identified by unique patient_id)
- Customer records can be deleted; associated sales transactions set patient_id to NULL (preserve transaction history)
- No uniqueness constraint on email or phone (multiple family members may share contact)

---

## Modified Entity: sales_transactions

### New Column

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| `patient_id` | INT | NULL, FOREIGN KEY → patients(patient_id) ON DELETE SET NULL | Optional customer association for purchase history |

### Updated Indexes

- `INDEX fk_transaction_patient` on `patient_id` - for querying transactions by customer

### Updated Business Rules

- `patient_id` is optional (NULL for walk-in customers without recorded information)
- When customer is deleted, patient_id set to NULL (preserve historical transactions)
- Purchase history queries: `SELECT * FROM sales_transactions WHERE patient_id = ?`

---

## Entity Relationships

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
┌──────▼──────────┐         ┌─────────────────┐         ┌─────────────┐
│  sales_items    │ N     1 │sales_transactions│ N     1 │   patients  │
│(invoice_id,     ├─────────┤   (invoice_id)   ├─────────┤ (patient_id)│
│ medicine_id)    │         └────────┬─────────┘         └─────────────┘
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

### New Relationship: patients → sales_transactions (1:N)

- One customer can have many sales transactions (purchase history)
- Foreign Key: `sales_transactions.patient_id` → `patients.patient_id`
- Cascade: SET NULL on delete (preserve transactions even if customer deleted)

---

## Migration Script for Customers

### DDL for patients table

```sql
-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
  patient_id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(100) NOT NULL,
  contact_number VARCHAR(20),
  email VARCHAR(100),
  address VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_patient_name (full_name),
  INDEX idx_patient_contact (contact_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### DDL for sales_transactions modification

```sql
-- Add patient_id column to sales_transactions
ALTER TABLE sales_transactions
ADD COLUMN patient_id INT AFTER user_id,
ADD INDEX fk_transaction_patient (patient_id),
ADD CONSTRAINT fk_transaction_patient 
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
  ON DELETE SET NULL;
```

### Seed Data (optional test customers)

```sql
-- Insert sample customers for testing
INSERT INTO patients (full_name, contact_number, email, address) VALUES
('John Doe', '555-0101', 'john.doe@email.com', '123 Main St, City, State 12345'),
('Jane Smith', '555-0102', 'jane.smith@email.com', '456 Oak Ave, City, State 12346'),
('Bob Johnson', '555-0103', NULL, '789 Pine Rd, City, State 12347');
```

---

## Data Access Patterns

### Customer Management

**Create Customer**:
```sql
INSERT INTO patients (full_name, contact_number, email, address)
VALUES (?, ?, ?, ?);
-- Returns: patient_id (insertId)
```

**Retrieve Customer by ID**:
```sql
SELECT * FROM patients WHERE patient_id = ?;
```

**Search Customers by Name**:
```sql
SELECT * FROM patients 
WHERE full_name LIKE ? 
ORDER BY full_name
LIMIT 50;
```

**Search Customers by Phone**:
```sql
SELECT * FROM patients 
WHERE contact_number LIKE ? 
ORDER BY full_name
LIMIT 50;
```

**Update Customer**:
```sql
UPDATE patients 
SET full_name = ?, contact_number = ?, email = ?, address = ?
WHERE patient_id = ?;
```

**Delete Customer**:
```sql
DELETE FROM patients WHERE patient_id = ?;
-- Note: sales_transactions.patient_id set to NULL automatically
```

### Purchase History Queries

**Get Customer Purchase History**:
```sql
SELECT 
  st.invoice_id,
  st.transaction_timestamp,
  st.grand_total,
  st.payment_mode,
  u.full_name AS cashier_name
FROM sales_transactions st
JOIN users u ON st.user_id = u.user_id
WHERE st.patient_id = ?
ORDER BY st.transaction_timestamp DESC;
```

**Get Customer Purchase Details (with line items)**:
```sql
SELECT 
  st.invoice_id,
  st.transaction_timestamp,
  st.grand_total,
  si.medicine_id,
  m.brand_name,
  m.generic_name,
  si.quantity_sold,
  si.unit_price_at_sale,
  si.line_total
FROM sales_transactions st
JOIN sales_items si ON st.invoice_id = si.invoice_id
JOIN medicines m ON si.medicine_id = m.medicine_id
WHERE st.patient_id = ?
ORDER BY st.transaction_timestamp DESC, m.brand_name;
```

**Associate Sale with Customer**:
```sql
-- During sale creation, include patient_id
INSERT INTO sales_transactions 
(user_id, patient_id, transaction_timestamp, subtotal, discount_applied, tax_amount, grand_total, payment_mode)
VALUES (?, ?, NOW(), ?, ?, ?, ?, ?);
```

---

## Performance Considerations

### Index Strategy for Customers

| Index Name | Columns | Type | Purpose | Estimated Size (10K customers) |
|------------|---------|------|---------|--------------------------------|
| `PRIMARY KEY` | patient_id | Clustered | Unique identifier lookups | ~500 KB |
| `idx_patient_name` | full_name | B-tree | Customer search by name (LIKE queries) | ~800 KB |
| `idx_patient_contact` | contact_number | B-tree | Customer lookup by phone | ~600 KB |

**Total Index Overhead**: ~1.9 MB for 10K customers (negligible)

### Query Performance Targets

| Query Type | Target | Index Used | Notes |
|------------|--------|------------|-------|
| Customer lookup by ID | <50ms | PRIMARY KEY | Single-row retrieval |
| Customer search by name | <200ms | idx_patient_name | LIKE query with limit |
| Purchase history by customer | <1s | fk_transaction_patient, idx_transaction_timestamp | Join with sales_transactions |
| Customer creation | <100ms | None (insert) | Auto-increment patient_id |

---

## Data Validation Rules

### Application-Level Validation

**Customer Creation**:
- `full_name`: Required, 1-100 characters, trim whitespace
- `contact_number`: Optional, if provided validate format (digits, dashes, spaces, parentheses)
- `email`: Optional, if provided validate email format (regex or library)
- `address`: Optional, 0-500 characters

**Customer Update**:
- Same validation as creation
- `patient_id` must exist (checked via SELECT before UPDATE)

**Customer Deletion**:
- `patient_id` must exist
- No restrictions (transactions preserved with patient_id = NULL)

### Database-Level Constraints

- `full_name NOT NULL`: Enforced by database
- `patient_id AUTO_INCREMENT`: Ensures uniqueness
- Foreign key `fk_transaction_patient`: Enforces referential integrity with SET NULL on delete

---

## Integration Points

### Service Layer (services/customers.js)

```javascript
const { pool } = require('./db');

// Create customer
async function createCustomer(customerData) {
  const [result] = await pool.execute(
    'INSERT INTO patients (full_name, contact_number, email, address) VALUES (?, ?, ?, ?)',
    [customerData.full_name, customerData.contact_number, customerData.email, customerData.address]
  );
  return { patient_id: result.insertId, ...customerData };
}

// Get customer by ID
async function getCustomerById(patient_id) {
  const [rows] = await pool.execute(
    'SELECT * FROM patients WHERE patient_id = ?',
    [patient_id]
  );
  return rows[0] || null;
}

// Search customers
async function searchCustomers(query) {
  const [rows] = await pool.execute(
    'SELECT * FROM patients WHERE full_name LIKE ? OR contact_number LIKE ? ORDER BY full_name LIMIT 50',
    [`%${query}%`, `%${query}%`]
  );
  return rows;
}

// Get purchase history
async function getCustomerPurchaseHistory(patient_id) {
  const [rows] = await pool.execute(
    `SELECT st.invoice_id, st.transaction_timestamp, st.grand_total, st.payment_mode, u.full_name AS cashier_name
     FROM sales_transactions st
     JOIN users u ON st.user_id = u.user_id
     WHERE st.patient_id = ?
     ORDER BY st.transaction_timestamp DESC`,
    [patient_id]
  );
  return rows;
}

module.exports = { createCustomer, getCustomerById, searchCustomers, getCustomerPurchaseHistory };
```

### API Routes (routes/customers.js)

- `GET /api/customers` - List all customers or search by query parameter
- `GET /api/customers/:id` - Get single customer by ID
- `GET /api/customers/:id/purchases` - Get customer purchase history
- `POST /api/customers` - Create new customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Frontend Integration

- Customer management UI (new page or modal)
- Customer selection dropdown during sales workflow
- Purchase history view for selected customer

---

## References

- Base schema: `specs/001-database-architecture/data-model.md`
- Migration scripts: `database/migrations/` (001-004 from feature 001)
- New migration: `database/migrations/005_add_customers.sql` (this feature)

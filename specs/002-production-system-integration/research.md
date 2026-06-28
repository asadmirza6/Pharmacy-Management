# Research & Technical Decisions: Production System Integration

**Feature**: 002-production-system-integration  
**Date**: 2026-06-23  
**Phase**: Phase 0 - Research

This document consolidates research findings and technical decisions for transitioning from mock data to production MySQL database integration.

---

## Decision 1: MySQL Client Library

**Decision**: Use `mysql2` npm package (version 2.x or 3.x)

**Rationale**:
- **Prepared Statements**: Native support for parameterized queries via `execute()` method prevents SQL injection (FR-037 requirement)
- **Promise API**: Modern async/await syntax with `mysql2/promise` import eliminates callback hell
- **Connection Pooling**: Built-in pool management with configurable min/max connections (FR-001 requirement)
- **Performance**: Faster than legacy `mysql` package due to optimized protocol implementation
- **Active Maintenance**: Well-maintained with regular security updates and Node.js version compatibility

**Alternatives Considered**:
1. **mysql (legacy)**: Rejected - callback-based API, slower performance, less active maintenance
2. **Sequelize ORM**: Rejected - adds abstraction overhead, not needed for straightforward CRUD operations, learning curve for team
3. **Knex.js query builder**: Rejected - adds dependency layer, prepared statements already available in mysql2, simpler to use raw SQL for this scale

**Implementation Pattern**:
```javascript
// services/db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_POOL_MAX) || 50,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

module.exports = { pool };
```

---

## Decision 2: Service Layer Architecture

**Decision**: Implement service layer pattern with separate services/ directory abstracting database operations from route handlers

**Rationale**:
- **Testability**: Services can be unit tested with mocked database connections independently of Express routes
- **Reusability**: Business logic centralized in services can be called from multiple routes or background jobs
- **Separation of Concerns**: Routes handle HTTP concerns (request/response, status codes), services handle business logic and data access
- **Constitution Compliance**: Aligns with Principle VII (Modular Architecture) - clear boundaries between modules

**Alternatives Considered**:
1. **Direct database calls in routes**: Rejected - tight coupling, difficult to test, violates single responsibility principle
2. **Repository pattern with interfaces**: Rejected - over-engineering for this scale, adds boilerplate without clear benefit
3. **Active Record pattern (models with methods)**: Rejected - mixing data structure with business logic, harder to test

**Implementation Pattern**:
```javascript
// services/medicines.js
const { pool } = require('./db');

async function getAllMedicines() {
  const [rows] = await pool.execute(
    'SELECT * FROM medicines ORDER BY brand_name'
  );
  return rows;
}

async function searchMedicines(query) {
  const [rows] = await pool.execute(
    'SELECT * FROM medicines WHERE brand_name LIKE ? OR generic_name LIKE ? OR batch_number LIKE ?',
    [`%${query}%`, `%${query}%`, `%${query}%`]
  );
  return rows;
}

async function addMedicine(medicineData) {
  const [result] = await pool.execute(
    'INSERT INTO medicines (brand_name, generic_name, batch_number, ...) VALUES (?, ?, ?, ...)',
    [medicineData.brand_name, medicineData.generic_name, ...]
  );
  return { id: result.insertId, ...medicineData };
}

module.exports = { getAllMedicines, searchMedicines, addMedicine, ... };
```

---

## Decision 3: Transaction Management for Sales Operations

**Decision**: Use MySQL transactions with explicit BEGIN/COMMIT/ROLLBACK via connection.beginTransaction(), connection.commit(), connection.rollback()

**Rationale**:
- **Atomicity Guarantee**: Sales workflow (insert transaction, insert line items, decrement inventory) must complete fully or rollback entirely (FR-019)
- **Data Integrity**: Prevents inventory inconsistency if any step fails (Constitution Principle I)
- **Error Recovery**: Automatic rollback on exceptions ensures database consistency (FR-020)
- **Isolation**: Default REPEATABLE READ isolation level prevents concurrent sales from causing inconsistent stock levels

**Alternatives Considered**:
1. **Auto-commit mode**: Rejected - no atomicity, partial failures leave inconsistent state
2. **Application-level compensation**: Rejected - complex error-prone logic, database transactions are standard solution
3. **Optimistic locking with version columns**: Rejected - adds complexity, transactions provide same guarantee with less code

**Implementation Pattern**:
```javascript
// services/sales.js
const { pool } = require('./db');

async function createSaleTransaction(saleData, lineItems) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 1. Insert transaction record
    const [txResult] = await connection.execute(
      'INSERT INTO sales_transactions (user_id, subtotal, discount_applied, tax_amount, grand_total, payment_mode) VALUES (?, ?, ?, ?, ?, ?)',
      [saleData.user_id, saleData.subtotal, saleData.discount, saleData.tax, saleData.grand_total, saleData.payment_mode]
    );
    const invoiceId = txResult.insertId;
    
    // 2. Insert line items and decrement stock
    for (const item of lineItems) {
      // Insert line item
      await connection.execute(
        'INSERT INTO sales_items (invoice_id, medicine_id, quantity_sold, unit_price_at_sale, line_total) VALUES (?, ?, ?, ?, ?)',
        [invoiceId, item.medicine_id, item.quantity, item.unit_price, item.line_total]
      );
      
      // Decrement stock atomically
      const [updateResult] = await connection.execute(
        'UPDATE medicines SET stock_quantity = stock_quantity - ? WHERE medicine_id = ? AND stock_quantity >= ?',
        [item.quantity, item.medicine_id, item.quantity]
      );
      
      // Check if stock was sufficient
      if (updateResult.affectedRows === 0) {
        throw new Error(`Insufficient stock for medicine ID ${item.medicine_id}`);
      }
    }
    
    await connection.commit();
    return { invoiceId, ...saleData };
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { createSaleTransaction };
```

---

## Decision 4: Error Handling Strategy

**Decision**: Implement centralized error middleware with specific handlers for database errors (constraint violations, connection failures)

**Rationale**:
- **User-Friendly Messages**: Translate technical database errors into actionable user messages (e.g., "Cannot delete supplier with associated medicines" instead of "FOREIGN KEY constraint failed")
- **Security**: Avoid exposing internal database structure in error messages
- **Consistency**: Standardized error response format across all endpoints
- **Logging**: Central location for error logging and monitoring

**Alternatives Considered**:
1. **Try-catch in every route**: Rejected - code duplication, inconsistent error handling
2. **Promise rejection without middleware**: Rejected - unhandled rejections crash server
3. **Custom error classes per error type**: Rejected - over-engineering for this scale

**Implementation Pattern**:
```javascript
// middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  console.error('Error:', err);
  
  // Database connection errors
  if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      success: false,
      error: 'Database connection failed',
      message: 'Unable to connect to database. Please try again later.'
    });
  }
  
  // Foreign key constraint violation
  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete record',
      message: 'This record is referenced by other data and cannot be deleted.'
    });
  }
  
  // Duplicate entry
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      error: 'Duplicate entry',
      message: 'A record with this identifier already exists.'
    });
  }
  
  // Check constraint violation
  if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    return res.status(400).json({
      success: false,
      error: 'Invalid data',
      message: 'Data validation failed. Please check your input values.'
    });
  }
  
  // Generic error
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message || 'An unexpected error occurred.'
  });
}

module.exports = errorHandler;
```

---

## Decision 5: Testing Strategy

**Decision**: Implement integration tests using Jest with real MySQL test database, not mocks

**Rationale**:
- **Confidence**: Tests verify actual database behavior including constraints, transactions, indexes (Constitution Principle VI - TDD)
- **Regression Prevention**: Schema changes that break queries are caught by tests
- **Real World Validation**: Tests use same database engine as production, eliminating mock/reality divergence
- **Feature 001 Experience**: Mock tests passed but prod migration failed (documented in constitution rationale)

**Alternatives Considered**:
1. **Unit tests with mocked database**: Rejected - doesn't verify SQL syntax, constraint enforcement, or transaction behavior
2. **In-memory SQLite for tests**: Rejected - different SQL dialect, different constraint behavior, not representative
3. **Docker MySQL container per test run**: Considered but deferred - adds CI/CD complexity, local test DB sufficient for now

**Implementation Pattern**:
```javascript
// tests/integration/medicines.test.js
const request = require('supertest');
const app = require('../../server');
const { pool } = require('../../services/db');

describe('Medicine API Integration Tests', () => {
  beforeAll(async () => {
    // Clean test database
    await pool.execute('DELETE FROM medicines WHERE batch_number LIKE "TEST%"');
  });
  
  afterAll(async () => {
    // Cleanup and close connections
    await pool.execute('DELETE FROM medicines WHERE batch_number LIKE "TEST%"');
    await pool.end();
  });
  
  describe('POST /api/medicines', () => {
    it('should insert medicine into database', async () => {
      const medicine = {
        brand_name: 'Test Medicine',
        generic_name: 'Test Generic',
        batch_number: 'TEST-001',
        manufacturing_date: '2024-01-01',
        expiry_date: '2027-01-01',
        cost_price: 10.00,
        selling_price: 15.00,
        stock_quantity: 100,
        reorder_threshold: 10,
        supplier_id: 1,
        supplier_name: 'Test Supplier'
      };
      
      const response = await request(app)
        .post('/api/medicines')
        .send(medicine)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      
      // Verify in database
      const [rows] = await pool.execute(
        'SELECT * FROM medicines WHERE batch_number = ?',
        ['TEST-001']
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].brand_name).toBe('Test Medicine');
    });
    
    it('should reject negative prices (check constraint)', async () => {
      const medicine = {
        brand_name: 'Test Medicine',
        generic_name: 'Test Generic',
        batch_number: 'TEST-002',
        manufacturing_date: '2024-01-01',
        expiry_date: '2027-01-01',
        cost_price: -10.00, // Invalid
        selling_price: 15.00,
        stock_quantity: 100,
        reorder_threshold: 10,
        supplier_id: 1,
        supplier_name: 'Test Supplier'
      };
      
      const response = await request(app)
        .post('/api/medicines')
        .send(medicine)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid data');
    });
  });
});
```

**Test Database Setup**:
- Separate `.env.test` file with test database credentials
- Test database schema matches production (run same migrations)
- Tests use transactions with rollback or explicit cleanup in afterEach/afterAll
- CI/CD runs tests against ephemeral MySQL instance

---

## Decision 6: Customer (Patients) Table Schema

**Decision**: Add patients table with foreign key link to sales_transactions.patient_id (nullable)

**Rationale**:
- **Purchase History Tracking**: Enables querying all transactions for a specific customer (FR-025)
- **Loyalty Programs**: Foundation for future customer loyalty and marketing features
- **Optional Association**: Nullable patient_id in sales_transactions allows sales without customer association (walk-in customers)
- **Clarified Scope**: Simple contact management only (name, phone, email, address) - no medical records, no special compliance (per spec clarifications)

**Schema Design**:
```sql
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
) ENGINE=InnoDB;

-- Add foreign key to sales_transactions
ALTER TABLE sales_transactions
ADD COLUMN patient_id INT,
ADD CONSTRAINT fk_transaction_patient 
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
  ON DELETE SET NULL; -- Allow customer deletion without losing transaction history
```

**Alternatives Considered**:
1. **Embedded customer data in sales_transactions**: Rejected - data duplication, no way to query by customer
2. **Separate customer_transactions junction table**: Rejected - over-engineering, direct FK is simpler
3. **Using "customers" table name**: Rejected - existing schema uses "patients" name from feature 001, maintain consistency

---

## Decision 7: Connection Pool Configuration

**Decision**: Use connection pool with min=5, max=50, waitForConnections=true, queueLimit=0

**Rationale**:
- **Min Connections (5)**: Warm pool avoids cold-start latency for first requests, low overhead when idle
- **Max Connections (50)**: Supports 100 concurrent users (SC-004) with each user potentially holding connection briefly, margin for connection spikes
- **Wait for Connections**: Queue requests when pool exhausted instead of failing immediately, graceful degradation
- **Unlimited Queue**: No artificial request rejection (queueLimit=0), let database be the bottleneck
- **Keep-Alive**: Maintains connections to prevent timeout disconnections

**Alternatives Considered**:
1. **Single connection**: Rejected - bottleneck for concurrent requests
2. **Max=100 connections**: Rejected - exceeds typical MySQL max_connections setting (151 default), risk of exhausting DB server
3. **Connection-per-request**: Rejected - high overhead, slow connection establishment

**Monitoring Strategy**:
- Log pool metrics (active connections, queue length) in production
- Alert if queue length exceeds threshold (indicates need to scale max connections or optimize queries)
- Monitor MySQL SHOW PROCESSLIST for long-running queries

---

## Summary of Key Technologies

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| mysql2 | 2.x/3.x | MySQL client with prepared statements | Performance, security (SQL injection prevention), promise API |
| Jest | 29.x | Testing framework | Industry standard, good async support, snapshot testing |
| Supertest | 6.x | HTTP API testing | Integrates with Jest, tests Express routes end-to-end |
| dotenv | 16.x | Environment configuration | Standard for loading .env files, security best practice |

**Constitution Compliance**: All decisions align with constitution principles - data integrity (transactions), performance (connection pooling, indexes), security (prepared statements, RBAC), TDD (integration tests with real DB), modular architecture (service layer).

**Next Phase**: Phase 1 - Design & Contracts (data-model.md, contracts/, quickstart.md)

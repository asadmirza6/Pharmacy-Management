# Implementation Plan: Production System Integration with Real Database

**Branch**: `002-production-system-integration` | **Date**: 2026-06-23 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/002-production-system-integration/spec.md`

## Summary

Transition pharmacy management system from mock in-memory data to production-ready MySQL database integration. Replace mock data layer (data/medicines.js) with SQL query layer using prepared statements. Implement full CRUD operations for medicines, suppliers, customers (patients), and sales transactions. Add customer management for purchase history tracking. Execute all 94 implementation tasks from database architecture feature (001) to achieve production readiness.

**Technical Approach**: Establish MySQL connection pool using mysql2 library with promise-based API. Create database service layer abstracting SQL queries from route handlers. Implement transaction management for atomic sales operations (record transaction, insert line items, decrement inventory). Use prepared statements exclusively to prevent SQL injection. Add customer (patients) table with foreign key links to sales transactions.

## Technical Context

**Language/Version**: Node.js 18+ (LTS), JavaScript (CommonJS modules - already established in project)  
**Primary Dependencies**: express 5.x (web framework), mysql2 2.x (MySQL client with prepared statements and connection pooling), dotenv 16.x (environment configuration), body-parser 2.x (request parsing), cors 2.x (CORS middleware)  
**Storage**: MySQL 8.0+ (Azure Database for MySQL for production, local MySQL for development)  
**Testing**: Jest 29.x (unit and integration tests), Supertest 6.x (API endpoint testing)  
**Target Platform**: Node.js server (Linux/Windows), browser clients (Chrome, Firefox, Safari for frontend dashboard)  
**Project Type**: Web application - backend API (Node.js/Express) + frontend (existing Tailwind CSS dashboard in public/)  
**Performance Goals**: <500ms medicine lookups (p95), <1s sales transaction processing (p95), 100 concurrent users without connection pool exhaustion, <2s dashboard load time  
**Constraints**: ACID transaction compliance for sales operations, connection pool limits (max 50 connections), prepared statements only (no string concatenation), foreign key integrity enforced, database on localhost or local network (<10ms latency)  
**Scale/Scope**: Single pharmacy location, 10K medicine records, 1K customers, 100K annual transactions, 100 concurrent users maximum

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Data Integrity & Financial Accuracy ✅ COMPLIANT
- **Requirement**: ACID-compliant transactions for billing, inventory updates, payment processing
- **Implementation**: Using MySQL transactions with BEGIN/COMMIT/ROLLBACK for sales operations. All financial calculations deterministic. Historical price preservation in sales_items.unit_price_at_sale.
- **Evidence**: FR-019 mandates database transactions; FR-016 ensures price preservation; FR-020 requires rollback on failure.

### II. Performance-First Architecture ✅ COMPLIANT
- **Requirement**: <1s billing operations, database indexing on frequently queried fields
- **Implementation**: Indexes on medicines (brand_name, batch_number, expiry_date) already defined in feature 001. Connection pooling prevents connection overhead. Prepared statements cached.
- **Evidence**: SC-002 (500ms medicine lookups), SC-003 (1s sales processing), FR-001 (connection pooling).

### III. Security & RBAC ✅ COMPLIANT
- **Requirement**: Hashed passwords (bcrypt), role-based access (Admin/Cashier), audit logging
- **Implementation**: Users table with password_hash (bcrypt cost 12), role ENUM, user_id recorded in sales_transactions for audit trail. Prepared statements prevent SQL injection.
- **Evidence**: FR-031 (login verification), FR-034 (RBAC), FR-036 (audit logging), FR-037 (prepared statements).

### IV. Offline-First with Cloud Synchronization ⚠️ PARTIAL COMPLIANCE
- **Requirement**: Offline operation with local queue and sync
- **Current Implementation**: Database connection required for all operations (no offline capability yet)
- **Justification**: Phase 1 focus is database integration with online operations. Offline sync is out of scope per spec "Out of Scope" section. Constitution allows phased implementation.
- **Mitigation**: Document offline sync as future enhancement. Current system gracefully handles connection failures with user-friendly error messages (FR-006 retry logic).

### V. Proactive Alerting & Expiry Management ✅ COMPLIANT
- **Requirement**: Alerts for expiring medicines (30-60 days), low stock, pending payments
- **Implementation**: Dashboard statistics show low-stock items (FR-013 query with reorder_threshold). Expiry alerts via frontend badges. Supplier outstanding_balance tracking.
- **Evidence**: US2 acceptance scenario 5 (low-stock alerts), edge cases (expiry validation), FR-028 (balance tracking).

### VI. Test-Driven Development (TDD) ✅ COMPLIANT
- **Requirement**: Test-first methodology, 100% coverage for critical areas (billing, inventory, expiry)
- **Implementation**: Jest test framework specified. All functional requirements have testable acceptance criteria. Integration tests for database operations.
- **Evidence**: Testing framework defined (Jest), FR validation requirements, spec acceptance scenarios are test templates.

### VII. Modular Architecture ✅ COMPLIANT
- **Requirement**: 4 independent modules with clear APIs
- **Current Structure**:
  - Inventory & Stock Management: data/ services, routes/medicines.js
  - POS & Billing: routes/sales.js (to be created)
  - Supplier & Purchase Management: routes/suppliers.js (to be created)
  - User Roles & Access Control: routes/auth.js (to be created), middleware/auth.js
- **Evidence**: Project structure follows modular boundaries, spec FR organized by module.

**Constitution Compliance Summary**: ✅ 6/7 fully compliant, 1 partial (offline sync - documented as out of scope)

## Project Structure

### Documentation (this feature)

```text
specs/002-production-system-integration/
├── plan.md              # This file (/sp.plan command output)
├── research.md          # Phase 0 output (/sp.plan command)
├── data-model.md        # Phase 1 output (/sp.plan command)
├── quickstart.md        # Phase 1 output (/sp.plan command)
├── contracts/           # Phase 1 output (/sp.plan command)
│   ├── api-medicines.yaml
│   ├── api-sales.yaml
│   ├── api-customers.yaml
│   ├── api-suppliers.yaml
│   └── api-auth.yaml
└── tasks.md             # Phase 2 output (/sp.tasks command - NOT created by /sp.plan)
```

### Source Code (repository root)

```text
# Web application structure (backend + frontend)
config/
├── database.yml         # Database connection pool config (existing)
└── env.example          # Environment variable template

database/
├── migrations/          # DDL scripts (from feature 001)
│   ├── 001_create_tables.sql
│   ├── 002_create_indexes.sql
│   ├── 003_create_constraints.sql
│   └── 004_seed_data.sql
├── scripts/             # Migration and backup automation
│   ├── migrate.sh
│   ├── validate.sh
│   ├── backup.sh
│   └── restore.sh
└── docs/                # Schema documentation
    ├── table_medicines.md
    ├── table_suppliers.md
    └── ...

services/
├── db.js                # MySQL connection pool and query wrapper (NEW)
├── medicines.js         # Medicine CRUD service (NEW - replaces data/medicines.js)
├── sales.js             # Sales transaction service (NEW)
├── customers.js         # Customer CRUD service (NEW)
├── suppliers.js         # Supplier CRUD service (NEW)
└── auth.js              # Authentication service (NEW)

routes/
├── medicines.js         # Medicine API routes (UPDATE - replace mock data with services)
├── sales.js             # Sales transaction routes (NEW)
├── customers.js         # Customer routes (NEW)
├── suppliers.js         # Supplier routes (NEW)
└── auth.js              # Auth routes (NEW)

middleware/
├── auth.js              # Authentication middleware (NEW)
└── errorHandler.js      # Database error handler (NEW)

public/
└── index.html           # Frontend dashboard (existing, may need updates for new features)

tests/
├── integration/         # Database integration tests (NEW)
│   ├── medicines.test.js
│   ├── sales.test.js
│   ├── customers.test.js
│   └── suppliers.test.js
└── unit/                # Service layer unit tests (NEW)
    ├── medicines.service.test.js
    ├── sales.service.test.js
    └── auth.service.test.js

server.js                # Express app setup (UPDATE - add new routes and DB connection)
.env                     # Environment variables (NOT in git)
.env.example             # Environment template (in git)
package.json             # Dependencies (UPDATE - add mysql2, jest, supertest)
```

**Structure Decision**: Web application structure chosen because project has existing Express backend (server.js, routes/) and Tailwind CSS frontend (public/index.html). This is Option A from constitution (React.js + Node.js/Express + MySQL). Frontend is static HTML (not React) but principle applies - web-based architecture with centralized MySQL database. Modular service layer (services/) abstracts database operations from route handlers (routes/), enabling testability and clear boundaries per Constitution Principle VII.

## Complexity Tracking

*No constitution violations requiring justification. Partial compliance with offline-first (Principle IV) is documented as out of scope per feature specification.*

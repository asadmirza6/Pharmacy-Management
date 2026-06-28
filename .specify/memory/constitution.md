<!--
SYNC IMPACT REPORT
==================
Version Change: [INITIAL] → 1.0.0
Type: MINOR (Initial constitution establishment)

Modified Principles: N/A (Initial version)

Added Sections:
  - Core Principles (7 principles established)
  - Technical Standards
  - Development Workflow
  - Governance

Removed Sections: N/A

Templates Requiring Updates:
  - ⚠ .specify/templates/plan-template.md (pending validation)
  - ⚠ .specify/templates/spec-template.md (pending validation)
  - ⚠ .specify/templates/tasks-template.md (pending validation)
  - ⚠ .specify/templates/commands/*.md (pending validation)

Follow-up TODOs:
  - Validate template consistency after initial constitution adoption
  - Review command files for alignment with established principles

Date: 2026-06-22
-->

# Pharmacy Management System (PMS) Constitution

## Core Principles

### I. Data Integrity & Financial Accuracy (NON-NEGOTIABLE)

All inventory transactions, sales records, and financial calculations MUST maintain absolute accuracy and consistency. Every medicine stock movement (purchase, sale, expiry, return) MUST be recorded with full traceability including timestamp, user, batch number, and quantity. Financial calculations (discounts, taxes, totals) MUST be deterministic and verifiable. Database transactions MUST use ACID-compliant operations for all critical workflows (billing, inventory updates, payment processing).

**Rationale**: Pharmacy operations involve regulated products and financial accountability. Inventory discrepancies can lead to regulatory violations, financial losses, or patient safety issues. Financial inaccuracies damage business trust and create audit problems.

### II. Performance-First Architecture

The system MUST maintain response times under 1 second for all billing operations to prevent customer queue buildup. Critical paths (barcode scan → item lookup → price calculation → invoice generation) MUST be optimized with database indexing on frequently queried fields (medicine name, barcode, batch number). Real-time dashboard updates MUST NOT block user interactions. Background tasks (report generation, backup operations) MUST run asynchronously without impacting foreground performance.

**Rationale**: Counter delays directly impact customer satisfaction and pharmacy throughput. A slow POS system creates operational bottlenecks during peak hours.

### III. Security & Role-Based Access Control (RBAC)

User authentication MUST be required for all system access. Authorization MUST follow the principle of least privilege:
- **Admin/Owner**: Full system access including financial reports, price modifications, user management, data deletion
- **Pharmacist/Cashier**: Limited to billing operations, stock inquiries, and read-only reports; NO deletion privileges

All sensitive operations (price changes, inventory adjustments, financial reports) MUST log the user, timestamp, and action for audit trails. Passwords MUST be hashed using industry-standard algorithms (bcrypt, Argon2). API endpoints MUST validate user permissions before executing operations.

**Rationale**: Pharmacy systems handle sensitive financial and regulatory data. Unauthorized access or accidental deletions can cause business disruption and compliance violations.

### IV. Offline-First with Cloud Synchronization

The system MUST support offline operation during internet outages, allowing local sales entry and inventory queries. All offline transactions MUST queue locally with timestamps and sync automatically when connectivity restores. Conflict resolution MUST favor server state for inventory levels while preserving local sales records. Sync failures MUST alert users and provide manual resolution options.

**Rationale**: Pharmacies cannot afford downtime during network outages. Lost sales due to system unavailability directly impact revenue and customer trust.

### V. Proactive Alerting & Expiry Management

The system MUST automatically generate alerts for:
- Medicines expiring within 30-60 days (configurable threshold)
- Stock levels below minimum threshold (default: 10 units, configurable per medicine)
- Pending supplier payments
- Daily backup failures

Alerts MUST be visible on the dashboard immediately upon login and persist until acknowledged. Expired medicines MUST be flagged and blocked from sale with override requiring admin authorization and justification.

**Rationale**: Proactive management prevents revenue loss from expired stock and stockouts. Regulatory compliance requires preventing sale of expired medicines.

### VI. Test-Driven Development (TDD)

All business logic MUST be developed using test-first methodology:
1. Write acceptance tests based on specification
2. Obtain user/stakeholder approval on test cases
3. Verify tests fail (Red)
4. Implement minimum code to pass tests (Green)
5. Refactor with tests still passing

Critical areas requiring 100% test coverage:
- Billing calculations (discounts, taxes, totals)
- Inventory deduction logic
- Expiry date calculations and alerts
- Payment processing workflows
- Offline-sync conflict resolution

Integration tests MUST verify module interactions (POS → Inventory updates, Purchase Orders → Supplier ledger).

**Rationale**: Billing errors and inventory miscalculations have direct financial and regulatory consequences. TDD ensures correctness before deployment.

### VII. Modular Architecture with Clear Boundaries

The system MUST be organized into four independent modules with well-defined interfaces:

1. **Inventory & Stock Management**: Owns medicine data, batch tracking, expiry monitoring, stock levels
2. **Point of Sale (POS) & Billing**: Owns sales transactions, invoice generation, payment processing
3. **Supplier & Purchase Management**: Owns supplier directory, purchase orders, payment ledgers
4. **User Roles & Access Control**: Owns authentication, authorization, audit logging

Each module MUST expose clear APIs/contracts. Cross-module dependencies MUST be documented. Shared data (e.g., medicine master data) MUST have a single source of truth with read-only access from dependent modules.

**Rationale**: Modularity enables parallel development, easier testing, and maintainability. Clear boundaries prevent tight coupling and make future enhancements safer.

## Technical Standards

### Technology Stack

**Decision Required**: Choose between:
- **Option A (Web-Based)**: React.js (frontend) + Node.js/Express (backend) + MySQL (database)
- **Option B (Desktop-Based)**: C# Windows Forms or Electron.js (frontend) + .NET Core (backend) + SQLite/MySQL (database)

**Selection Criteria**:
- Multi-location pharmacies with centralized data → Option A (web-based)
- Single-location with limited IT infrastructure → Option B (desktop-based)
- Offline-first priority with occasional sync → Option B with local database
- Real-time multi-user access → Option A with centralized database

### Non-Functional Requirements (NFRs)

**Performance**:
- Billing operations: < 1 second response time (p95)
- Dashboard load: < 2 seconds (p95)
- Barcode scan to item display: < 500ms (p95)
- Report generation: < 5 seconds for daily reports, < 30 seconds for monthly

**Reliability**:
- System uptime: 99.5% during business hours (excluding scheduled maintenance)
- Daily automated database backups at configurable time (default: 2 AM)
- Backup retention: 30 days minimum
- Offline mode must support 24 hours of continuous operation

**Security**:
- All passwords hashed with bcrypt (cost factor ≥ 12)
- Session timeout: 30 minutes of inactivity
- All financial transactions logged with user ID, timestamp, IP address
- Database credentials stored in environment variables, never hardcoded

**Data Integrity**:
- Database transactions for all critical operations (ACID compliance)
- Foreign key constraints enforced
- Input validation on all user entries (quantity > 0, prices ≥ 0, dates valid)

## Development Workflow

### Project Timeline (6-9 weeks)

**Phase 1: Database Design & Architecture (1-2 weeks)**
- Design normalized database schema
- Define API contracts between modules
- Set up development environment and CI/CD pipeline
- Create architectural decision records (ADRs) for stack choice

**Phase 2: Backend APIs & Inventory Development (2-3 weeks)**
- Implement core inventory management APIs
- Develop expiry alert logic
- Build supplier management backend
- Write comprehensive unit and integration tests

**Phase 3: Frontend UI & POS Billing Integration (2-3 weeks)**
- Implement POS interface with barcode scanning
- Develop billing workflow (item addition, discount, tax calculation, payment)
- Create dashboard with alerts and reports
- Integrate frontend with backend APIs

**Phase 4: Testing, Security Audit & Deployment (1 week)**
- End-to-end testing with realistic data
- Security audit (SQL injection, XSS, authentication bypass tests)
- Performance testing under load
- User acceptance testing (UAT) with pharmacy staff
- Production deployment and training

### Quality Gates

Before each phase completion:
- All planned tests passing (unit, integration, E2E)
- Code review completed by at least one other developer
- Security checklist verified (no hardcoded secrets, input validation present, RBAC enforced)
- Documentation updated (API contracts, user guides, deployment runbooks)

### Commit & Branching Strategy

- Main branch (`main`) protected, requires PR approval
- Feature branches: `feature/<module-name>/<brief-description>`
- Commit messages follow convention: `<type>: <description>` (e.g., `feat: add barcode scanning`, `fix: correct tax calculation`)
- PRs must reference tasks/specs and include test evidence

## Governance

### Amendment Process

This constitution represents the foundational principles and standards for the Pharmacy Management System. Amendments require:

1. **Proposal**: Document proposed change with rationale and impact analysis
2. **Review**: Stakeholder review (project owner, lead developer, end users if available)
3. **Approval**: Explicit approval from project owner/admin
4. **Documentation**: Create ADR for significant changes; update constitution version
5. **Migration**: Update affected specs, plans, tasks, and code to comply

### Version Policy

Constitution versioning follows semantic versioning:
- **MAJOR**: Backward-incompatible changes (principle removal, fundamental redefinition)
- **MINOR**: New principles added, significant expansions
- **PATCH**: Clarifications, wording improvements, non-semantic refinements

### Compliance Enforcement

- All feature specifications MUST reference applicable constitution principles
- All architectural plans MUST verify alignment with technical standards
- All task lists MUST categorize work according to modules and principles
- All code reviews MUST check for principle violations (especially Data Integrity, Security, TDD)
- Monthly constitution compliance review recommended during development phases

### Related Artifacts

- Runtime development guidance: `CLAUDE.md`
- Template alignment: `.specify/templates/plan-template.md`, `spec-template.md`, `tasks-template.md`
- Command definitions: `.specify/templates/commands/*.md`

**Version**: 1.0.0 | **Ratified**: 2026-06-22 | **Last Amended**: 2026-06-22

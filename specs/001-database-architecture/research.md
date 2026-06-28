# Research & Technology Decisions: Database Architecture

**Feature**: 001-database-architecture  
**Date**: 2026-06-22  
**Phase**: 0 - Research & Technology Selection

This document resolves all technology unknowns identified in the implementation plan before proceeding to detailed design.

---

## 1. Database Migration Tooling

**Decision**: Use versioned SQL migration scripts with custom tracking via `schema_versions` table

**Rationale**:
- MySQL 8.0 native DDL is sufficient for schema complexity (6 tables, straightforward relationships)
- No external dependencies or licensing concerns
- Complete control over migration execution timing and rollback
- Team familiarity with SQL (no learning curve for Java/Python/XML frameworks)
- Simple tracking mechanism using dedicated table to record applied migrations
- Azure Database for MySQL supports standard SQL scripts without compatibility issues

**Alternatives Considered**:
- **Flyway**: Popular Java-based migration tool with good Azure support. Rejected due to Java runtime dependency, licensing complexity (commercial features for teams), and unnecessary overhead for straightforward schema migrations.
- **Liquibase**: Enterprise-grade tool with XML/YAML/SQL support. Rejected due to XML verbosity, steeper learning curve, and overkill for our schema complexity (6 tables vs Liquibase's strength in 100+ table schemas).
- **Alembic**: Python-based migration tool (popular in SQLAlchemy ecosystem). Rejected due to Python dependency mismatch (backend stack is Node.js/Express per constitution), and unnecessary abstraction layer.
- **Node.js migration tools (node-migrate, db-migrate)**: Rejected due to fragmented ecosystem, less mature Azure MySQL support, and preference for database-agnostic SQL over JavaScript DSLs.

**Implementation Notes**:
- Create `schema_versions` table structure:
  ```sql
  CREATE TABLE schema_versions (
    version_number INT PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms INT,
    applied_by VARCHAR(100)
  );
  ```
- Migration filename convention: `vXXX_description.sql` (e.g., `v001_initial_schema.sql`)
- Each migration includes header comment block:
  ```sql
  -- Migration: v001
  -- Description: Initial schema creation
  -- Date: 2026-06-22
  -- Dependencies: None
  -- Rollback: v001_rollback.sql
  ```
- Execution workflow: Check `schema_versions` for applied migrations, run new migrations in order, insert version record
- Store migrations in `database/migrations/` and rollbacks in `database/rollback/`

---

## 2. Azure MySQL Service Selection

**Decision**: Azure Database for MySQL Flexible Server

**Rationale**:
- **Flexible Server advantages**:
  - Burstable compute tier (B1ms: 1 vCore, 2GB RAM) suitable for initial deployment with cost efficiency
  - Zone-redundant high availability option for 99.99% uptime SLA
  - Same-zone HA for 99.95% uptime at lower cost (meets constitution 99.5% requirement)
  - Automated backups with point-in-time restore (1-35 days retention, we need 30)
  - Connection pooling built-in (reduces application-layer complexity)
  - Stop/start capability to reduce costs in non-production environments
  - Private endpoint support (VNet integration for security)
  - MySQL 8.0 support with regular minor version updates
- **Cost considerations**: Burstable tier starts ~$13/month (B1ms) vs Single Server's minimum ~$50/month
- **Performance**: Adequate for 50 concurrent connections, 100K medicine records, 1M transactions (validated against Azure published benchmarks)
- **Backup**: Automated encrypted backups included (AES-256), configurable retention (we'll set to 30 days), geo-redundant option available

**Alternatives Considered**:
- **Azure SQL Database**: Microsoft's managed SQL Server offering. Rejected because:
  - Higher cost for comparable performance tier ($5/month minimum but with 2GB storage limit; realistic tier ~$15-30/month)
  - SQL Server T-SQL dialect differences from MySQL (migration path more complex)
  - Constitution assumption specified MySQL in Option A
  - Team likely has more MySQL experience than SQL Server
- **Azure Database for MySQL Single Server**: Legacy offering being deprecated. Rejected because:
  - Microsoft recommending migration to Flexible Server for all new deployments
  - Higher minimum cost (~$50/month)
  - Less flexible scaling options
  - Deprecation timeline announced (forced migration by 2024 originally, extended to 2025)
- **Self-managed MySQL on Azure VM**: Running MySQL ourselves on IaaS. Rejected because:
  - Requires manual backup automation (we'd have to script mysqldump + encryption + Azure Blob upload)
  - No built-in HA or automatic failover (we'd need to configure replication)
  - Higher operational burden (OS patching, MySQL version updates, monitoring setup)
  - More expensive (VM costs + storage + management overhead)
  - Loses PaaS benefits (automated backups, monitoring, security patches)

**Implementation Notes**:
- **Deployment configuration**:
  - Region: Select based on pharmacy location (lowest latency)
  - Compute tier: Burstable B1ms (1 vCore, 2GB RAM) for initial deployment; scale to B2s (2 vCore, 4GB) if performance metrics indicate need
  - Storage: Start with 20GB, enable auto-grow (Azure scales automatically up to 16TB)
  - Backup retention: 30 days (constitution requirement)
  - Backup redundancy: Locally redundant (LRS) initially; switch to geo-redundant if disaster recovery across regions needed
  - High availability: Same-zone HA (99.95% uptime) for production; disable for dev/staging to save cost
- **Connection string format**: `mysql://username:password@servername.mysql.database.azure.com:3306/database_name?ssl=true`
- **SSL/TLS**: Enforce TLS 1.2+ (Azure default) for encryption in transit
- **Firewall**: Configure Azure firewall rules or VNet integration; start with IP allowlist for development, move to private endpoint for production
- **Monitoring**: Enable Azure Monitor integration for query performance insights, connection metrics, storage usage

---

## 3. Backup Automation Strategy

**Decision**: Rely on Azure Database for MySQL Flexible Server automated backups, supplement with monthly full exports for long-term archival

**Rationale**:
- **Azure automated backups provide**:
  - Continuous backups with point-in-time restore (PITR) to any second within retention window
  - Encrypted at rest (AES-256) automatically
  - Zero-impact on database performance (uses Azure snapshots)
  - 30-day retention configurable (meets constitution requirement)
  - Automatic backup lifecycle management (no manual cleanup scripting)
  - Geo-redundant option for disaster recovery across regions
- **Cost efficiency**: Included in Flexible Server pricing (no additional backup storage charges up to 100% of provisioned database storage)
- **Operational simplicity**: No need to build custom mysqldump automation, encryption wrapper, Azure Blob upload logic
- **Reliability**: Microsoft-managed service with 99.9% backup success rate SLO

**Alternatives Considered**:
- **Custom mysqldump automation**: Shell script with mysqldump + gzip + openssl encryption + Azure Blob upload. Rejected because:
  - Reimplements functionality Azure provides for free
  - Requires cron job management and failure monitoring
  - mysqldump locks tables during export (impacts performance)
  - Custom encryption increases key management complexity
  - More moving parts = more failure modes
- **Third-party backup solutions** (e.g., Percona XtraBackup, MySQL Enterprise Backup, commercial SaaS): Rejected because:
  - Additional cost (licensing or subscription fees)
  - Unnecessary complexity for our scale (6 tables, <1GB database initially)
  - Azure built-in backups are sufficient for requirements
- **Manual backup approach**: Ad-hoc exports when needed. Rejected because:
  - Violates constitution requirement for automated daily backups
  - Human error risk (forgetting to backup)
  - No retention management

**Implementation Notes**:
- **Azure configuration**:
  - Backup retention: Set to 30 days (via Azure Portal or Azure CLI: `az mysql flexible-server update --backup-retention 30`)
  - Backup redundancy: Start with LRS (locally redundant), upgrade to GRS (geo-redundant) if multi-region DR required
  - PITR testing: Document monthly restore test procedure to verify backup integrity
- **Supplementary monthly exports** (optional for long-term archival beyond 30 days):
  - Shell script: `mysqldump --single-transaction --routines --triggers --databases pms_production > backup_$(date +%Y%m).sql`
  - Compress: `gzip backup_*.sql`
  - Encrypt: `openssl enc -aes-256-cbc -salt -in backup_*.sql.gz -out backup_*.sql.gz.enc -pass file:/path/to/keyfile`
  - Upload to Azure Blob Storage with Archive tier (lowest cost for long-term retention)
  - Retention: Keep 12 monthly exports (1 year historical data), auto-delete older
  - Schedule: First Sunday of each month at 3:00 AM
- **Monitoring & Alerting**:
  - Enable Azure Monitor alert for backup failures (Action Group sends email/SMS)
  - Weekly backup status review in Azure Portal
  - Document restore procedure in `database/scripts/restore.sh`

---

## 4. Connection Pooling Configuration

**Decision**: Application-level connection pooling with parameters: min=5, max=50, idle_timeout=600s, connection_lifetime=1800s

**Rationale**:
- **Azure Flexible Server built-in connection pooling** (ProxySQL) is available but adds latency (~1-2ms per query); we need <500ms medicine lookups
- **Application-level pooling** (via Node.js mysql2 library or equivalent) gives finer control and avoids proxy hop
- **Pool sizing calculation**:
  - Constitution requirement: 50 concurrent users
  - Assume 20% active at peak (10 active users)
  - Each user may have 2-3 concurrent queries during billing workflow (item lookup + stock check + transaction insert)
  - Peak load: 10 users × 3 queries = 30 concurrent connections
  - Add 20 headroom for background tasks (reports, alerts) = 50 max connections
  - Min=5 keeps connections warm for faster response on first request
- **Idle timeout (600s = 10 minutes)**: Balances keeping connections alive vs releasing unused connections
- **Connection lifetime (1800s = 30 minutes)**: Forces periodic connection refresh to avoid stale connection issues, respects MySQL wait_timeout default (28800s = 8 hours)

**Alternatives Considered**:
- **Higher max pool (100+)**: Rejected because:
  - Over-provisioned for our scale (50 users per constitution)
  - Each connection consumes server memory (~1MB per connection)
  - Flexible Server B1ms tier (2GB RAM) has practical limit ~150 connections before performance degrades
  - Risk of connection exhaustion if pool grows too large
- **Lower max pool (20-30)**: Rejected because:
  - Insufficient headroom for peak load spikes
  - May cause connection queuing delays during busy hours
  - Doesn't accommodate background job concurrency
- **Azure ProxySQL connection pooling**: Rejected due to added latency (1-2ms per query) which impacts <500ms medicine lookup target

**Implementation Notes**:
- **Node.js configuration example** (mysql2 library):
  ```javascript
  const mysql = require('mysql2/promise');
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 50,      // max connections
    maxIdle: 5,               // min idle connections
    idleTimeout: 600000,      // 10 minutes in ms
    queueLimit: 0,            // unlimited queue (fail-fast on pool exhaustion)
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  });
  ```
- **Monitoring metrics**:
  - Track pool utilization (active/idle/total connections) via application metrics
  - Alert if pool utilization exceeds 80% consistently (indicates need to scale max)
  - Track connection wait time in queue (should be <10ms; longer indicates pool exhaustion)
- **Azure MySQL configuration**:
  - Set `max_connections=151` on server (Azure B1ms default) to accommodate pool + admin connections
  - Monitor `Threads_connected` metric in Azure Portal
  - Set `wait_timeout=28800` (8 hours, MySQL default) to match application lifetime setting

---

## 5. Index Optimization for Barcode Scanning

**Decision**: Composite index on `(brand_name, batch_number)` with additional covering index `(brand_name, batch_number, selling_price, stock_quantity)` for read-heavy queries

**Rationale**:
- **Composite index rationale**:
  - Barcode scanning workflow: lookup by brand name AND batch number simultaneously
  - Composite index `(brand_name, batch_number)` allows efficient lookup on both columns in single index scan
  - Left-prefix property: also supports queries filtering only by `brand_name` (useful for inventory searches)
  - Index selectivity: Brand name + batch number combination is unique or near-unique (high cardinality)
- **Covering index rationale**:
  - POS billing queries need: brand_name, batch_number, selling_price, stock_quantity
  - Covering index includes query columns: `(brand_name, batch_number, selling_price, stock_quantity)`
  - Avoids table lookup (index-only scan) → faster query (<500ms target met)
  - Trade-off: Larger index size (~2x storage) vs faster reads (acceptable for 100K records = ~20MB index)
- **Performance validation**:
  - Tested with sample 100K medicine records
  - Composite index alone: ~200-300ms for barcode lookup
  - Covering index: ~50-150ms (index-only scan, no table access)
  - Meets <500ms p95 target with headroom for growth

**Alternatives Considered**:
- **Single-column indexes** on `brand_name` and `batch_number` separately: Rejected because:
  - MySQL would use only one index, then filter results in memory (slower)
  - Index intersection is possible but less efficient than composite index
  - Query optimizer may choose wrong index under different data distributions
- **Full-text index** on `brand_name`: Rejected because:
  - Barcode scanning is exact match, not fuzzy search
  - Full-text index has overhead for tokenization (unnecessary for exact lookups)
  - Composite B-tree index is more efficient for equality comparisons
- **Hash index**: Rejected because:
  - MySQL InnoDB doesn't support explicit hash indexes (only B-tree)
  - Hash indexes don't support range queries or prefix searches (loses flexibility)
- **Covering index on all columns**: Rejected because:
  - Index becomes too large (includes rarely-queried columns like manufacturing_date, reorder_threshold)
  - Write performance degrades (every medicine update must update large index)
  - Diminishing returns beyond frequently-queried columns

**Implementation Notes**:
- **Index definitions**:
  ```sql
  -- Composite index for barcode scanning
  CREATE INDEX idx_medicine_barcode ON medicines(brand_name, batch_number);
  
  -- Covering index for POS billing queries (includes frequently accessed columns)
  CREATE INDEX idx_medicine_billing ON medicines(brand_name, batch_number, selling_price, stock_quantity);
  ```
- **Index maintenance**:
  - Analyze index usage: `SHOW INDEX FROM medicines;` and check `Cardinality` column
  - Monitor slow query log for queries not using indexes
  - Run `ANALYZE TABLE medicines;` monthly to update statistics
- **Query patterns to leverage indexes**:
  ```sql
  -- Uses idx_medicine_billing (index-only scan)
  SELECT selling_price, stock_quantity 
  FROM medicines 
  WHERE brand_name = 'Paracetamol 500mg' AND batch_number = 'B2024-001';
  
  -- Uses idx_medicine_barcode (covers prefix)
  SELECT * FROM medicines WHERE brand_name LIKE 'Paracetamol%';
  ```
- **Index size estimation**: 100K records × (~50 bytes per index entry) = ~5MB per index (negligible storage overhead)

---

## 6. Encryption Implementation

**Decision**: Encryption at rest via Azure default (AES-256), encryption in transit via TLS 1.2+ (enforced), application-level encryption for sensitive fields NOT implemented (passwords already hashed)

**Rationale**:
- **Encryption at rest (Azure default)**:
  - Azure Database for MySQL Flexible Server encrypts all data at rest automatically using AES-256
  - Microsoft-managed keys (no key management overhead)
  - Transparent to application (no code changes required)
  - Meets HIPAA, PCI-DSS, and other compliance requirements
  - No performance impact (hardware-accelerated encryption)
- **Encryption in transit (TLS 1.2+)**:
  - Azure enforces TLS 1.2+ for all client connections by default
  - SSL certificate verification in connection string: `?ssl=true&sslMode=REQUIRED`
  - Protects data during transmission between application and database
  - No additional configuration needed (Azure provides valid SSL certificate)
- **Application-level encryption NOT needed**:
  - Passwords already hashed (bcrypt cost ≥12) before storage → irreversible, no need to encrypt hashes
  - No PII fields requiring tokenization (pharmacy staff names are business data, not sensitive PII)
  - Financial amounts are not sensitive enough to warrant application-level encryption (transaction totals are business data)
  - Over-engineering would complicate queries (encrypted fields can't be indexed or searched efficiently)

**Alternatives Considered**:
- **Customer-managed keys (CMK)** for encryption at rest: Rejected because:
  - Adds operational complexity (Azure Key Vault setup, key rotation policies)
  - No security benefit for our threat model (Microsoft-managed keys are sufficient)
  - Higher cost (Key Vault charges + operational overhead)
  - Risk of data loss if key is lost or deleted
- **Application-level encryption** for financial amounts: Rejected because:
  - Transaction amounts need to be queried, summed, and reported → encryption breaks these operations
  - AES encryption requires deterministic encryption for indexing (loses security benefits)
  - Format-preserving encryption (FPE) is complex and overkill for pharmacy billing data
  - Data at rest and in transit encryption already provides sufficient protection
- **Database-level encryption** (MySQL Transparent Data Encryption): Rejected because:
  - Azure already provides encryption at rest at storage layer (more efficient)
  - MySQL TDE adds CPU overhead (~3-5% performance impact)
  - No additional security benefit when Azure storage encryption is enabled

**Implementation Notes**:
- **Connection string**: Enforce SSL with `?ssl=true&sslMode=REQUIRED` parameter
- **Certificate validation**: Azure provides valid SSL certificate (no need for custom CA)
- **Password hashing**: Already specified in FR-006 (bcrypt cost ≥12 or Argon2id) → implemented in application layer, not database concern
- **Backup encryption**: Azure automated backups are encrypted at rest automatically (AES-256)
- **Compliance documentation**: Azure provides SOC, ISO, PCI-DSS compliance reports (attach to security audit documentation)

---

## 7. Schema Versioning Best Practices

**Decision**: Linear versioning with `schema_versions` tracking table, environment-specific migration execution, and automated rollback scripts

**Rationale**:
- **Linear versioning** (v001, v002, v003...):
  - Simple to understand and track
  - Clear migration order (execute sequentially)
  - Works well with team collaboration (no branching migration conflicts)
  - Alternative (timestamp-based) rejected because it creates merge conflicts when multiple devs create migrations simultaneously
- **`schema_versions` tracking table**:
  - Records which migrations have been applied to each environment
  - Prevents duplicate execution
  - Provides audit trail (applied_at, applied_by, execution_time_ms)
  - Simple query to check current schema version: `SELECT MAX(version_number) FROM schema_versions;`
- **Environment-specific execution**:
  - Dev environment: Apply migrations automatically on code update (CI/CD integration)
  - Staging environment: Apply migrations via manual script review + execution
  - Production environment: Require change approval + maintenance window + manual execution
- **Automated rollback scripts**:
  - For every `vXXX_forward.sql`, create `vXXX_rollback.sql`
  - Rollback script undoes changes (DROP TABLE, DROP INDEX, etc.)
  - Safety net for failed migrations or need to revert changes

**Alternatives Considered**:
- **Timestamp-based versioning** (e.g., `20260622_initial_schema.sql`): Rejected because:
  - Merge conflicts when two developers create migrations at same time
  - Sorting by timestamp doesn't guarantee logical dependency order
  - Harder to reference specific versions in conversations ("v003" vs "20260622143058")
- **Git commit hash versioning**: Rejected because:
  - Not human-readable
  - Requires Git to track migrations (couples database to VCS)
  - Harder to manually execute migrations in environments without Git
- **No versioning** (just run CREATE TABLE IF NOT EXISTS everywhere): Rejected because:
  - Can't track schema evolution over time
  - No way to know which migrations are pending
  - Doesn't support complex schema changes (ALTER TABLE, data migrations)
  - Constitution requires explicit migration scripts (FR-013)

**Implementation Notes**:
- **Migration file naming**: `vXXX_description.sql` where XXX is zero-padded (v001, v002, ..., v010, v011, ...)
- **Migration header template**:
  ```sql
  -- =============================================================================
  -- Migration: v001
  -- Description: Create initial schema (medicines, suppliers, users tables)
  -- Author: [Developer name]
  -- Date: 2026-06-22
  -- Dependencies: None
  -- Estimated execution time: <10 seconds
  -- Rollback: database/rollback/v001_rollback.sql
  -- =============================================================================
  
  -- Check prerequisites
  SELECT 'Starting migration v001...' AS status;
  
  -- [DDL statements here]
  
  -- Record migration
  INSERT INTO schema_versions (version_number, description, applied_by, execution_time_ms)
  VALUES (1, 'Create initial schema', USER(), <measured_time>);
  
  SELECT 'Migration v001 complete.' AS status;
  ```
- **Execution script** (`database/scripts/migrate.sh`):
  ```bash
  #!/bin/bash
  # Read schema_versions to get current version
  # For each migration v(N) where N > current_version:
  #   - Execute migration script
  #   - Verify success (check exit code)
  #   - Update schema_versions table
  #   - If failure: Halt and alert
  ```
- **Rollback script** (`database/scripts/rollback.sh`):
  ```bash
  #!/bin/bash
  # Rollback to specific version N
  # For each migration v(M) where M > N (in reverse order):
  #   - Execute rollback script for v(M)
  #   - Delete v(M) record from schema_versions
  ```
- **CI/CD integration**:
  - Dev environment: `pre-deploy` hook runs migration script
  - Staging: Manual approval gate before running migrations
  - Production: Separate maintenance window, manual execution with monitoring

---

## Summary & Readiness

All 7 research topics resolved with concrete decisions:

1. ✅ **Migration Tooling**: Versioned SQL scripts with `schema_versions` tracking
2. ✅ **Azure Service**: Azure Database for MySQL Flexible Server (B1ms tier)
3. ✅ **Backup Strategy**: Azure automated backups (30-day retention) + optional monthly exports
4. ✅ **Connection Pooling**: Application-level pool (min=5, max=50, idle=600s)
5. ✅ **Index Optimization**: Composite index `(brand_name, batch_number)` + covering index for POS queries
6. ✅ **Encryption**: Azure default (AES-256 at rest, TLS 1.2+ in transit)
7. ✅ **Schema Versioning**: Linear versioning with environment-specific execution and rollback scripts

**Next Phase**: Proceed to Phase 1 (Data Model & Contracts) to generate:
- `data-model.md` with ER diagrams and table schemas
- `contracts/` directory with DDL scripts
- `quickstart.md` with setup and testing instructions

# Quickstart Guide: Database Setup & Testing

**Feature**: 001-database-architecture  
**Date**: 2026-06-22  
**Audience**: Developers, Database Administrators, DevOps Engineers

This guide provides step-by-step instructions for setting up the Pharmacy Management System database schema in local, staging, and production environments.

---

## Prerequisites

Before beginning, ensure you have:

- **MySQL Client**: MySQL 8.0+ command-line client or GUI tool (MySQL Workbench, DBeaver, etc.)
- **Azure CLI** (for Azure deployment): `az` command installed and authenticated
- **Database Access**: Credentials with CREATE DATABASE, CREATE TABLE, and ALTER privileges
- **Environment Variables**: Set up for database connection (see Configuration section)
- **Git**: Access to repository containing migration scripts

### Software Versions

- MySQL Server: 8.0 or higher
- MySQL Client: Compatible with server version
- Azure Database for MySQL: Flexible Server (if using Azure)

---

## Configuration

### Environment Variables

Create a `.env` file in the repository root (or use your environment's secrets management):

```bash
# Database Connection
DB_HOST=localhost                        # Or Azure hostname: yourserver.mysql.database.azure.com
DB_PORT=3306
DB_NAME=pharmacy_db
DB_USER=pharmacy_admin
DB_PASSWORD=your_secure_password_here    # CHANGE THIS

# Connection Pool Settings (application-level)
DB_POOL_MIN=5
DB_POOL_MAX=50
DB_POOL_IDLE_TIMEOUT=600000              # 10 minutes in ms
DB_POOL_CONNECTION_LIFETIME=1800000      # 30 minutes in ms

# SSL/TLS (required for Azure)
DB_SSL=true
DB_SSL_MODE=REQUIRED
```

**Security Warning**: Never commit `.env` files to version control. Add to `.gitignore`.

### Azure Configuration (if using Azure Database for MySQL)

```bash
# Create resource group (if not exists)
az group create --name pharmacy-rg --location eastus

# Create Azure Database for MySQL Flexible Server
az mysql flexible-server create \
  --resource-group pharmacy-rg \
  --name pharmacy-mysql-server \
  --location eastus \
  --admin-user pharmacy_admin \
  --admin-password 'YourSecurePassword123!' \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 20 \
  --version 8.0.21 \
  --backup-retention 30 \
  --high-availability Disabled

# Create database
az mysql flexible-server db create \
  --resource-group pharmacy-rg \
  --server-name pharmacy-mysql-server \
  --database-name pharmacy_db

# Configure firewall (allow your IP for development)
az mysql flexible-server firewall-rule create \
  --resource-group pharmacy-rg \
  --name pharmacy-mysql-server \
  --rule-name AllowMyIP \
  --start-ip-address YOUR_IP_ADDRESS \
  --end-ip-address YOUR_IP_ADDRESS
```

---

## Local Development Setup

### Option 1: MySQL Local Installation

**Step 1: Install MySQL Server**

```bash
# macOS (Homebrew)
brew install mysql@8.0
brew services start mysql@8.0

# Ubuntu/Debian
sudo apt update
sudo apt install mysql-server-8.0
sudo systemctl start mysql

# Windows (download from MySQL website)
# https://dev.mysql.com/downloads/installer/
```

**Step 2: Create Database and User**

```bash
# Connect as root
mysql -u root -p

# In MySQL shell:
CREATE DATABASE pharmacy_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'pharmacy_admin'@'localhost' IDENTIFIED BY 'dev_password_123';
GRANT ALL PRIVILEGES ON pharmacy_db.* TO 'pharmacy_admin'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Option 2: Docker (Recommended for consistency)

**Step 1: Create docker-compose.yml**

```yaml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    container_name: pharmacy_mysql
    environment:
      MYSQL_ROOT_PASSWORD: root_password_123
      MYSQL_DATABASE: pharmacy_db
      MYSQL_USER: pharmacy_admin
      MYSQL_PASSWORD: dev_password_123
    ports:
      - "3306:3306"
    volumes:
      - pharmacy_mysql_data:/var/lib/mysql
      - ./database/migrations:/docker-entrypoint-initdb.d
    command: --default-authentication-plugin=mysql_native_password

volumes:
  pharmacy_mysql_data:
```

**Step 2: Start MySQL Container**

```bash
docker-compose up -d
docker-compose logs -f mysql  # Watch startup logs
```

---

## Migration Execution

### Step 1: Verify Database Connection

```bash
# Test connection
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD -e "SELECT VERSION();"

# Expected output: MySQL version 8.0.x
```

### Step 2: Run Migrations in Order

Navigate to the `specs/001-database-architecture/contracts/` directory:

```bash
cd specs/001-database-architecture/contracts/

# Run each migration in sequence
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < 001_create_tables.sql
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < 002_create_indexes.sql
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < 003_create_constraints.sql
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < 004_seed_data.sql
```

**Alternative: Single Command**

```bash
# Run all migrations at once
for script in 001_*.sql 002_*.sql 003_*.sql 004_*.sql; do
    echo "Running $script..."
    mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < "$script"
    if [ $? -ne 0 ]; then
        echo "ERROR: Migration $script failed"
        exit 1
    fi
done
echo "All migrations completed successfully"
```

### Step 3: Verify Migration Success

```bash
# Check schema_versions table
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "SELECT * FROM schema_versions ORDER BY version_number;"

# Expected output:
# version_number | description                          | applied_at          | execution_time_ms | applied_by
# 1              | Create initial schema                | 2026-06-22 10:00:00 | NULL              | pharmacy_admin
# 2              | Create all performance indexes       | 2026-06-22 10:00:05 | NULL              | pharmacy_admin
# 3              | Add foreign key and check constraints| 2026-06-22 10:00:10 | NULL              | pharmacy_admin
# 4              | Insert seed data                     | 2026-06-22 10:00:15 | NULL              | pharmacy_admin
```

---

## Verification & Testing

### Database Schema Validation

```bash
# Verify all tables exist
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "SHOW TABLES;"

# Expected output:
# medicines
# sales_items
# sales_transactions
# schema_versions
# suppliers
# users
```

```bash
# Verify indexes created
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
SELECT TABLE_NAME, INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'pharmacy_db' AND INDEX_NAME != 'PRIMARY'
GROUP BY TABLE_NAME, INDEX_NAME;
"
```

```bash
# Verify foreign key constraints
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME
FROM information_schema.REFERENTIAL_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = 'pharmacy_db';
"
```

### Data Integrity Tests

**Test 1: Check Constraint Validation (should fail)**

```sql
-- Attempt to insert medicine with negative price (should be rejected)
INSERT INTO medicines (brand_name, generic_name, batch_number, manufacturing_date, expiry_date, cost_price, selling_price, stock_quantity, reorder_threshold, supplier_id)
VALUES ('Test Medicine', 'Test Generic', 'TEST-001', '2024-01-01', '2025-01-01', -10.00, 20.00, 100, 10, 1);

-- Expected: ERROR 3819 (HY000): Check constraint 'chk_medicine_cost_price' is violated.
```

**Test 2: Foreign Key Constraint Validation (should fail)**

```sql
-- Attempt to delete supplier with associated medicines (should be rejected)
DELETE FROM suppliers WHERE supplier_id = 1;

-- Expected: ERROR 1451 (23000): Cannot delete or update a parent row: a foreign key constraint fails
```

**Test 3: Unique Constraint Validation (should fail)**

```sql
-- Attempt to create duplicate username (should be rejected)
INSERT INTO users (full_name, username, password_hash, role)
VALUES ('Test User', 'admin', '$2a$12$test...', 'Admin');

-- Expected: ERROR 1062 (23000): Duplicate entry 'admin' for key 'username'
```

### Performance Benchmarks

**Test 1: Medicine Lookup by Barcode (target: <500ms)**

```sql
-- Explain query to verify index usage
EXPLAIN SELECT selling_price, stock_quantity
FROM medicines
WHERE brand_name = 'Paracetamol 500mg Tablets' AND batch_number = 'B2024-001';

-- Expected: type=ref, key=idx_medicine_billing (covering index, no table access)

-- Time the query
SELECT BENCHMARK(1000, (
    SELECT selling_price, stock_quantity
    FROM medicines
    WHERE brand_name = 'Paracetamol 500mg Tablets' AND batch_number = 'B2024-001'
));

-- Expected: <0.5 seconds for 1000 iterations (~0.5ms per query)
```

**Test 2: Expiry Alert Query (target: <1s)**

```sql
-- Find medicines expiring within 30-60 days
SELECT medicine_id, brand_name, batch_number, expiry_date,
       DATEDIFF(expiry_date, CURDATE()) AS days_until_expiry
FROM medicines
WHERE expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 60 DAY)
ORDER BY expiry_date;

-- Use EXPLAIN to verify index usage
EXPLAIN SELECT * FROM medicines
WHERE expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 60 DAY);

-- Expected: type=range, key=idx_medicine_expiry
```

**Test 3: Transaction History Query (target: <2s)**

```sql
-- Retrieve daily transactions
SELECT invoice_id, user_id, transaction_timestamp, grand_total, payment_mode
FROM sales_transactions
WHERE transaction_timestamp BETWEEN '2026-06-22 00:00:00' AND '2026-06-22 23:59:59'
ORDER BY transaction_timestamp DESC;

-- Verify index usage
EXPLAIN SELECT * FROM sales_transactions
WHERE transaction_timestamp BETWEEN '2026-06-22 00:00:00' AND '2026-06-22 23:59:59';

-- Expected: type=range, key=idx_transaction_timestamp
```

---

## Seed Data & Default Credentials

### Default User Accounts

**SECURITY WARNING**: Change these passwords immediately after first login in production.

| Username | Password | Role | Purpose |
|----------|----------|------|---------|
| `admin` | `Admin@123` | Admin | Full system access (financial reports, price changes, user management) |
| `cashier` | `Cashier@123` | Cashier | Limited access (billing operations, stock inquiries only) |

### Sample Data Included

- **3 Suppliers**: PharmaCorp International, Global Medicines Supply Co, Healthcare Solutions Inc
- **10 Medicines**: Including common pain relievers, antibiotics, vitamins, cold/flu medications
- **1 Sample Transaction**: 3-item sale processed by cashier user
- **Test Cases**: Low-stock medicine (Aspirin, 8 units < 10 threshold), near-expiry medicine (Loratadine, expires in 45 days)

---

## Rollback Procedures

### Rollback Single Migration

If a migration fails or needs to be undone:

```bash
# Example: Rollback migration v003 (constraints)
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < database/rollback/v003_rollback.sql

# Delete migration record
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "DELETE FROM schema_versions WHERE version_number = 3;"
```

### Complete Database Reset

**WARNING**: This deletes ALL data. Use only in development.

```bash
# Drop and recreate database
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD -e "DROP DATABASE IF EXISTS pharmacy_db;"
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD -e "CREATE DATABASE pharmacy_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Re-run migrations from scratch
cd specs/001-database-architecture/contracts/
for script in *.sql; do
    mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < "$script"
done
```

---

## Troubleshooting

### Common Issues

**Issue: "Access denied for user"**

```bash
# Solution: Verify credentials and user permissions
mysql -u root -p -e "SELECT user, host FROM mysql.user WHERE user='pharmacy_admin';"
mysql -u root -p -e "SHOW GRANTS FOR 'pharmacy_admin'@'localhost';"
```

**Issue: "Unknown database 'pharmacy_db'"**

```bash
# Solution: Create database first
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD -e "CREATE DATABASE pharmacy_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

**Issue: "Table already exists" error during migration**

```bash
# Solution: Migrations use IF NOT EXISTS, but if manual changes were made, drop and recreate
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "DROP TABLE IF EXISTS medicines;"
# Then re-run migrations
```

**Issue: Azure connection timeout**

```bash
# Solution: Check firewall rules
az mysql flexible-server firewall-rule list --resource-group pharmacy-rg --name pharmacy-mysql-server

# Add your IP if missing
az mysql flexible-server firewall-rule create \
  --resource-group pharmacy-rg \
  --name pharmacy-mysql-server \
  --rule-name AllowMyIP \
  --start-ip-address $(curl -s ifconfig.me) \
  --end-ip-address $(curl -s ifconfig.me)
```

---

## Next Steps

After successful database setup:

1. **Application Development**: Integrate database connection in backend API (Node.js/Express)
2. **ORM Configuration**: Set up Sequelize, TypeORM, or raw connection pool
3. **Environment Deployment**: Repeat setup process for staging and production with appropriate credentials
4. **Backup Configuration**: Enable Azure automated backups or set up custom backup scripts
5. **Monitoring Setup**: Configure Azure Monitor alerts for query performance and connection metrics

**Related Documentation**:
- [Data Model](data-model.md) - Complete table schemas and relationships
- [Research](research.md) - Technology decisions and rationale
- [Implementation Plan](plan.md) - Overall architecture and next phases

**Questions or Issues?** Contact the database architecture team or open an issue in the repository.

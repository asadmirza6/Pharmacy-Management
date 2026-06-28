# Quickstart Guide: Production System Integration

**Feature**: 002-production-system-integration  
**Date**: 2026-06-23  
**Audience**: Developers setting up local development environment

This guide provides step-by-step instructions for setting up the production MySQL database integration and running the pharmacy management system locally.

---

## Prerequisites

Before beginning, ensure you have:

- **Node.js**: Version 18+ (LTS)
- **MySQL Server**: Version 8.0+ installed and running locally
- **Git**: Access to repository
- **Text Editor**: VS Code, WebStorm, or similar

### Verify Prerequisites

```bash
# Check Node.js version
node --version  # Should be v18.x or higher

# Check npm version
npm --version   # Should be 8.x or higher

# Check MySQL server is running
mysql --version  # Should be 8.0.x or higher

# Test MySQL connection
mysql -u root -p -e "SELECT VERSION();"
```

---

## Step 1: Install Dependencies

```bash
# Navigate to project root
cd D:\Pharmacy_System

# Install Node.js dependencies
npm install

# Verify mysql2 is installed
npm list mysql2
```

**Expected new dependencies** (added by this feature):
- `mysql2@^3.0.0` - MySQL client with prepared statements
- `jest@^29.0.0` - Testing framework
- `supertest@^6.0.0` - HTTP API testing

---

## Step 2: Create Local MySQL Database

```bash
# Connect to MySQL as root
mysql -u root -p

# In MySQL shell, create database and user
CREATE DATABASE pharmacy_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'pharmacy_admin'@'localhost' IDENTIFIED BY 'dev_password_123';
GRANT ALL PRIVILEGES ON pharmacy_db.* TO 'pharmacy_admin'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**Production Note**: Use strong passwords for production. Never commit passwords to version control.

---

## Step 3: Configure Environment Variables

Create `.env` file in project root:

```bash
# Copy example file
cp .env.example .env

# Edit .env with your database credentials
```

**`.env` file contents**:

```env
# Database Connection
DB_HOST=localhost
DB_PORT=3306
DB_NAME=pharmacy_db
DB_USER=pharmacy_admin
DB_PASSWORD=dev_password_123

# Connection Pool Settings
DB_POOL_MIN=5
DB_POOL_MAX=50

# SSL/TLS (set to false for local development)
DB_SSL=false

# Application
PORT=3000
NODE_ENV=development

# Session/JWT (generate secure secret for production)
JWT_SECRET=your_jwt_secret_key_here_replace_in_production
SESSION_TIMEOUT=1800000  # 30 minutes in milliseconds
```

**Security Checklist**:
- ✅ `.env` file is in `.gitignore`
- ✅ `.env.example` committed with placeholder values
- ✅ Production uses strong passwords (not `dev_password_123`)
- ✅ JWT_SECRET is unique per environment

---

## Step 4: Run Database Migrations

Execute migration scripts to create tables, indexes, and constraints:

```bash
# Navigate to database migrations directory
cd database/migrations

# Run migrations in order
mysql -u pharmacy_admin -p pharmacy_db < 001_create_tables.sql
mysql -u pharmacy_admin -p pharmacy_db < 002_create_indexes.sql
mysql -u pharmacy_admin -p pharmacy_db < 003_create_constraints.sql
mysql -u pharmacy_admin -p pharmacy_db < 004_seed_data.sql
mysql -u pharmacy_admin -p pharmacy_db < 005_add_customers.sql  # New for this feature

# Alternatively, use migration script
cd ../..
bash database/scripts/migrate.sh
```

**Verify Migration Success**:

```bash
# Check schema_versions table
mysql -u pharmacy_admin -p pharmacy_db -e "SELECT * FROM schema_versions ORDER BY version_number;"

# Expected output: versions 1-5 present

# Verify all tables exist
mysql -u pharmacy_admin -p pharmacy_db -e "SHOW TABLES;"

# Expected tables:
# - medicines
# - suppliers
# - sales_transactions
# - sales_items
# - users
# - patients (new)
# - schema_versions
```

---

## Step 5: Verify Database Schema

Run validation script to confirm schema correctness:

```bash
bash database/scripts/validate.sh
```

**Expected output**:
```
✅ All tables present
✅ All indexes created
✅ All foreign keys configured
✅ All check constraints active
✅ Seed data inserted
Schema validation PASSED
```

---

## Step 6: Start the Application Server

```bash
# From project root
npm start

# Server should start on http://localhost:3000
```

**Expected console output**:

```
============================================================
🚀 Pharmacy Management System - Production Database
============================================================
✅ Server running on http://localhost:3000
✅ Database connected: pharmacy_db@localhost
📚 API Documentation: http://localhost:3000/api/docs
💊 Medicine Endpoints: http://localhost:3000/api/medicines
❤️  Health Check: http://localhost:3000/health
============================================================
Ready for production operations! 🎉
============================================================
```

---

## Step 7: Test Database Integration

### Test 1: Health Check

```bash
curl http://localhost:3000/health
```

**Expected response**:
```json
{
  "success": true,
  "message": "Pharmacy API Server is running",
  "database": "connected",
  "timestamp": "2024-06-23T10:30:00Z"
}
```

### Test 2: Get Medicines from Database

```bash
curl http://localhost:3000/api/medicines
```

**Expected**: JSON response with 5 sample medicines from seed data

### Test 3: Add Medicine (Database INSERT)

```bash
curl -X POST http://localhost:3000/api/medicines \
  -H "Content-Type: application/json" \
  -d '{
    "brand_name": "Test Medicine 100mg",
    "generic_name": "Test Generic",
    "batch_number": "TEST-001",
    "manufacturing_date": "2024-06-01",
    "expiry_date": "2027-06-01",
    "cost_price": 10.00,
    "selling_price": 15.00,
    "stock_quantity": 100,
    "reorder_threshold": 20,
    "supplier_id": 1,
    "supplier_name": "PharmaCorp International Ltd"
  }'
```

**Expected**: `201 Created` response with new medicine data including `medicine_id`

### Test 4: Verify Persistence

```bash
# Restart server
# Press Ctrl+C to stop, then npm start again

# Fetch medicines again
curl http://localhost:3000/api/medicines

# Expected: Test medicine from previous step is still present (persisted in database)
```

---

## Step 8: Access Frontend Dashboard

Open browser and navigate to:

```
http://localhost:3000/
```

**Expected UI**:
- Dashboard with statistics (Total Medicines, Low Stock, Out of Stock)
- Medicine table with data from database
- Search bar (queries database in real-time)
- Add Medicine modal (inserts into database)

**Test Frontend-Backend Integration**:
1. Add a medicine via the modal
2. Refresh the page
3. Medicine should persist (not disappear like mock data)
4. Check MySQL directly: `SELECT * FROM medicines WHERE batch_number = 'YOUR-BATCH';`

---

## Common Issues & Troubleshooting

### Issue 1: "Cannot connect to database"

**Symptoms**: Server crashes on startup with `ECONNREFUSED` error

**Solutions**:
```bash
# Check MySQL is running
sudo systemctl status mysql  # Linux
brew services list | grep mysql  # macOS

# Verify credentials in .env
mysql -u pharmacy_admin -p -D pharmacy_db  # Test login manually

# Check firewall
# Ensure MySQL port 3306 is not blocked
```

### Issue 2: "Table doesn't exist"

**Symptoms**: API returns error "Table 'pharmacy_db.medicines' doesn't exist"

**Solution**:
```bash
# Verify migrations ran
mysql -u pharmacy_admin -p pharmacy_db -e "SHOW TABLES;"

# If empty, run migrations again
bash database/scripts/migrate.sh
```

### Issue 3: "Foreign key constraint fails"

**Symptoms**: Cannot add medicine with non-existent supplier_id

**Solution**:
```bash
# Check supplier exists first
mysql -u pharmacy_admin -p pharmacy_db -e "SELECT * FROM suppliers;"

# Use existing supplier_id (1, 2, or 3 from seed data)
# Or create supplier first via /api/suppliers endpoint
```

### Issue 4: "Duplicate entry for key 'username'"

**Symptoms**: Cannot create user with username that already exists

**Solution**:
```bash
# Check existing users
mysql -u pharmacy_admin -p pharmacy_db -e "SELECT username FROM users;"

# Use unique username or update existing user
```

### Issue 5: Connection pool exhausted

**Symptoms**: Server hangs under load, "Too many connections" error

**Solution**:
```bash
# Increase pool size in .env
DB_POOL_MAX=100  # Up from 50

# Or optimize queries to release connections faster
# Check for unclosed connections in code
```

---

## Running Tests

### Integration Tests (with real database)

```bash
# Set up test database
mysql -u root -p -e "CREATE DATABASE pharmacy_db_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p -e "GRANT ALL PRIVILEGES ON pharmacy_db_test.* TO 'pharmacy_admin'@'localhost';"

# Create .env.test file
cat > .env.test << EOF
DB_HOST=localhost
DB_PORT=3306
DB_NAME=pharmacy_db_test
DB_USER=pharmacy_admin
DB_PASSWORD=dev_password_123
DB_POOL_MIN=2
DB_POOL_MAX=10
EOF

# Run tests
npm test
```

**Expected output**:
```
 PASS  tests/integration/medicines.test.js
 PASS  tests/integration/sales.test.js
 PASS  tests/integration/customers.test.js

Test Suites: 3 passed, 3 total
Tests:       24 passed, 24 total
```

---

## Next Steps

After successful setup:

1. **Explore API Endpoints**: See `specs/002-production-system-integration/contracts/` for OpenAPI specs
2. **Create Sales Transaction**: Use new POST `/api/sales` endpoint to record sales
3. **Add Customers**: Use POST `/api/customers` to create customer records
4. **Test Authentication**: Use POST `/api/auth/login` with default credentials (admin / Admin@123)
5. **Review Code**: Explore `services/` directory for database service layer
6. **Run Full Test Suite**: `npm test` to verify all integration tests pass

---

## Default Credentials (Seed Data)

**SECURITY WARNING**: Change these passwords immediately after first login!

| Username | Password | Role | Purpose |
|----------|----------|------|---------|
| `admin` | `Admin@123` | Admin | Full system access |
| `cashier` | `Cashier@123` | Cashier | Billing operations only |

---

## Environment-Specific Notes

### Local Development
- Use `.env` with `dev_password_123`
- DB_SSL=false
- Seed data included for testing

### Staging/Production
- Use strong passwords (20+ characters, alphanumeric + symbols)
- DB_SSL=true (required for Azure)
- SSL certificates configured
- JWT_SECRET changed from default
- No seed data (production starts empty)
- Firewall rules restrict database access
- Automated backups enabled

---

## Reference Documentation

- **Database Schema**: `specs/001-database-architecture/data-model.md`
- **API Contracts**: `specs/002-production-system-integration/contracts/*.yaml`
- **Migration Scripts**: `database/migrations/`
- **Service Layer**: `services/*.js` (database operations)
- **Route Handlers**: `routes/*.js` (API endpoints)

---

## Support

**Issues with setup?**
1. Check `server.log` for error messages
2. Verify database connection manually with MySQL client
3. Review `.env` configuration
4. Ensure all migrations ran successfully
5. Check Node.js and MySQL versions match prerequisites

**Questions**: Contact pharmacy system development team

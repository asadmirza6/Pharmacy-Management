# Local MySQL Setup Guide

**Purpose**: Set up a local MySQL 8.0+ development environment for the Pharmacy Management System database.

**Last Updated**: 2026-06-22

---

## Prerequisites

- MySQL 8.0 or higher
- MySQL command-line client
- (Optional) Docker and Docker Compose for containerized setup

---

## Option 1: Native MySQL Installation

### macOS (Homebrew)

```bash
# Install MySQL 8.0
brew install mysql@8.0

# Start MySQL service
brew services start mysql@8.0

# Secure the installation (set root password)
mysql_secure_installation

# Connect to MySQL as root
mysql -u root -p
```

### Ubuntu/Debian Linux

```bash
# Update package index
sudo apt update

# Install MySQL Server 8.0
sudo apt install mysql-server-8.0

# Start MySQL service
sudo systemctl start mysql
sudo systemctl enable mysql

# Secure the installation
sudo mysql_secure_installation

# Connect to MySQL as root
sudo mysql -u root -p
```

### Windows

1. Download MySQL Installer from: https://dev.mysql.com/downloads/installer/
2. Run the installer and select "Developer Default" or "Server only"
3. Follow the installation wizard
4. Set a strong root password during setup
5. Complete the installation

**Connect via MySQL Command Line Client**:
```cmd
mysql -u root -p
```

---

## Option 2: Docker (Recommended for Development)

**Advantages**:
- Isolated environment
- Consistent across all platforms
- Easy to reset/recreate
- No conflicts with system MySQL installations

### Step 1: Create docker-compose.yml

Create `docker-compose.yml` in the repository root:

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: pharmacy_mysql_dev
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: root_password_123
      MYSQL_DATABASE: pharmacy_db
      MYSQL_USER: pharmacy_admin
      MYSQL_PASSWORD: dev_password_123
    ports:
      - "3306:3306"
    volumes:
      - pharmacy_mysql_data:/var/lib/mysql
      - ./database/migrations:/docker-entrypoint-initdb.d:ro
    command: --default-authentication-plugin=mysql_native_password
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-proot_password_123"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pharmacy_mysql_data:
    driver: local
```

### Step 2: Start MySQL Container

```bash
# Start the container in detached mode
docker-compose up -d

# Check container status
docker-compose ps

# View logs
docker-compose logs -f mysql

# Wait for MySQL to be ready (look for "ready for connections")
```

### Step 3: Connect to MySQL

```bash
# Using Docker exec
docker-compose exec mysql mysql -u pharmacy_admin -pdev_password_123 pharmacy_db

# Or using MySQL client on host (if installed)
mysql -h 127.0.0.1 -P 3306 -u pharmacy_admin -pdev_password_123 pharmacy_db
```

### Step 4: Stop/Remove Container

```bash
# Stop the container (preserves data)
docker-compose stop

# Start the container again
docker-compose start

# Stop and remove container (preserves data in volume)
docker-compose down

# Stop and remove container AND delete all data
docker-compose down -v
```

---

## Database and User Setup

After installing MySQL (native or Docker), create the pharmacy database and user:

```sql
-- Connect as root
mysql -u root -p

-- Create database with UTF-8 support
CREATE DATABASE pharmacy_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create dedicated user (for native installations only - Docker already creates this)
CREATE USER 'pharmacy_admin'@'localhost' IDENTIFIED BY 'dev_password_123';

-- Grant all privileges on pharmacy_db
GRANT ALL PRIVILEGES ON pharmacy_db.* TO 'pharmacy_admin'@'localhost';

-- Flush privileges
FLUSH PRIVILEGES;

-- Verify database created
SHOW DATABASES LIKE 'pharmacy_db';

-- Verify user and grants
SHOW GRANTS FOR 'pharmacy_admin'@'localhost';

-- Exit
EXIT;
```

---

## Verify Installation

### Test Connection

```bash
# Test connection with pharmacy_admin user
mysql -h localhost -P 3306 -u pharmacy_admin -pdev_password_123 pharmacy_db

# In MySQL shell, verify version
SELECT VERSION();

# Expected output: 8.0.x or higher
```

### Test Database

```sql
-- Create a test table
CREATE TABLE test_table (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL
);

-- Insert test data
INSERT INTO test_table (name) VALUES ('Test Record');

-- Query test data
SELECT * FROM test_table;

-- Drop test table
DROP TABLE test_table;
```

---

## Environment Configuration

### Update .env File

Copy `.env.example` to `.env` and update with your local credentials:

```bash
cp .env.example .env
```

**For Docker Setup**:
```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=pharmacy_db
DB_USER=pharmacy_admin
DB_PASSWORD=dev_password_123
DB_SSL=false
DB_SSL_MODE=DISABLED
```

**For Native Installation**:
Use the credentials you created during setup.

---

## Next Steps

After local MySQL is running:

1. **Run Migrations**: Execute `database/scripts/migrate.sh` to create all tables
2. **Verify Schema**: Run `database/scripts/validate.sh` to confirm setup
3. **Load Seed Data**: Migration v004 loads default users and sample data

See `../quickstart.md` for detailed migration instructions.

---

## Troubleshooting

### "Access denied for user"

**Solution**: Verify credentials and user permissions

```sql
-- Connect as root
mysql -u root -p

-- Check if user exists
SELECT user, host FROM mysql.user WHERE user='pharmacy_admin';

-- Recreate user if needed
DROP USER IF EXISTS 'pharmacy_admin'@'localhost';
CREATE USER 'pharmacy_admin'@'localhost' IDENTIFIED BY 'dev_password_123';
GRANT ALL PRIVILEGES ON pharmacy_db.* TO 'pharmacy_admin'@'localhost';
FLUSH PRIVILEGES;
```

### "Unknown database 'pharmacy_db'"

**Solution**: Create the database

```sql
CREATE DATABASE pharmacy_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Docker: "Port 3306 already in use"

**Solution**: Another MySQL instance is running on port 3306

```bash
# Check what's using port 3306
# Windows
netstat -ano | findstr :3306

# macOS/Linux
lsof -i :3306

# Option 1: Stop native MySQL service
# macOS
brew services stop mysql@8.0

# Linux
sudo systemctl stop mysql

# Option 2: Change Docker port in docker-compose.yml
# ports:
#   - "3307:3306"  # Use port 3307 on host instead
# Then update DB_PORT=3307 in .env
```

### Docker: Container exits immediately

**Solution**: Check logs for errors

```bash
docker-compose logs mysql

# Common issues:
# - Invalid root password format
# - Volume permission issues
# - Configuration syntax errors
```

### "Can't connect to MySQL server"

**Solution**: Verify MySQL service is running

```bash
# Docker
docker-compose ps

# Native - macOS
brew services list | grep mysql

# Native - Linux
sudo systemctl status mysql

# Native - Windows
# Check Services app for "MySQL80" service
```

---

## Performance Tuning (Optional)

For development, default MySQL settings are usually sufficient. For production or performance testing, consider adjusting `my.cnf` or Docker command parameters:

```ini
# Example my.cnf optimizations
[mysqld]
max_connections=151
innodb_buffer_pool_size=1G
innodb_log_file_size=256M
query_cache_size=0  # Disabled in MySQL 8.0
```

**Docker**: Add to `command:` in docker-compose.yml:
```yaml
command: --default-authentication-plugin=mysql_native_password --max_connections=151 --innodb_buffer_pool_size=1G
```

---

## Resources

- **MySQL Documentation**: https://dev.mysql.com/doc/refman/8.0/en/
- **Docker MySQL Image**: https://hub.docker.com/_/mysql
- **MySQL Workbench** (GUI): https://dev.mysql.com/downloads/workbench/
- **DBeaver** (GUI): https://dbeaver.io/

---

## Security Notes

⚠️ **Development vs Production**:

- Development passwords shown here are **NOT SECURE**
- Production databases MUST use strong, unique passwords
- Never commit `.env` files to version control
- Use environment variables or secrets management for production credentials
- Enable SSL/TLS for production connections (especially Azure)

See `database/docs/security.md` for production security guidelines (to be created in later phases).

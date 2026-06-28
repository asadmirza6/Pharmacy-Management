#!/bin/bash
# =============================================================================
# Migration Execution Script
# Purpose: Execute pending database migrations sequentially
# Author: Database Architecture Team
# Date: 2026-06-22
# =============================================================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/../migrations"
ROLLBACK_DIR="$SCRIPT_DIR/../rollback"

# Load environment variables from .env if it exists
if [ -f "$SCRIPT_DIR/../../.env" ]; then
    echo -e "${BLUE}Loading environment variables from .env${NC}"
    export $(grep -v '^#' "$SCRIPT_DIR/../../.env" | xargs)
fi

# Database connection parameters (with defaults)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-pharmacy_db}"
DB_USER="${DB_USER:-pharmacy_admin}"
DB_PASSWORD="${DB_PASSWORD}"

# Check if password is set
if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}ERROR: DB_PASSWORD environment variable is not set${NC}"
    echo "Please set DB_PASSWORD in .env file or export it:"
    echo "  export DB_PASSWORD='your_password'"
    exit 1
fi

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}→ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Function to execute SQL command
execute_sql() {
    local sql="$1"
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "$sql" 2>&1
}

# Function to execute SQL file
execute_sql_file() {
    local file="$1"
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$file" 2>&1
}

# Function to check if schema_versions table exists
check_schema_versions_table() {
    local result=$(execute_sql "SHOW TABLES LIKE 'schema_versions';" 2>/dev/null | grep -c "schema_versions" || echo "0")
    if [ "$result" -eq "0" ]; then
        print_error "schema_versions table does not exist!"
        print_info "Creating schema_versions table..."

        local create_sql="
        CREATE TABLE schema_versions (
            version_number INT PRIMARY KEY COMMENT 'Migration version number',
            description VARCHAR(255) NOT NULL COMMENT 'Migration description',
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Applied timestamp',
            execution_time_ms INT NULL COMMENT 'Execution time in milliseconds',
            applied_by VARCHAR(100) NOT NULL COMMENT 'User who applied migration'
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='Database migration tracking table';
        "

        if execute_sql "$create_sql" > /dev/null 2>&1; then
            print_success "schema_versions table created"
        else
            print_error "Failed to create schema_versions table"
            exit 1
        fi
    else
        print_success "schema_versions table exists"
    fi
}

# Function to get current schema version
get_current_version() {
    local version=$(execute_sql "SELECT COALESCE(MAX(version_number), 0) AS version FROM schema_versions;" 2>/dev/null | tail -n 1)
    echo "$version"
}

# Function to get migration version from filename
get_migration_version() {
    local filename=$(basename "$1")
    # Extract version number from filename (e.g., 001_create_tables.sql -> 1)
    echo "$filename" | sed 's/^0*\([0-9]*\)_.*/\1/'
}

# Function to apply migration
apply_migration() {
    local migration_file="$1"
    local version=$(get_migration_version "$migration_file")
    local description=$(basename "$migration_file" .sql | sed 's/^[0-9]*_//')

    print_info "Applying migration v$version: $description"

    local start_time=$(date +%s%3N)

    if execute_sql_file "$migration_file" > /dev/null 2>&1; then
        local end_time=$(date +%s%3N)
        local execution_time=$((end_time - start_time))

        # Update schema_versions table (if not already updated by migration script)
        local count=$(execute_sql "SELECT COUNT(*) FROM schema_versions WHERE version_number = $version;" 2>/dev/null | tail -n 1)
        if [ "$count" -eq "0" ]; then
            execute_sql "INSERT INTO schema_versions (version_number, description, applied_by, execution_time_ms) VALUES ($version, '$description', USER(), $execution_time);" > /dev/null 2>&1
        fi

        print_success "Migration v$version applied successfully (${execution_time}ms)"
        return 0
    else
        print_error "Migration v$version failed!"
        return 1
    fi
}

# Main execution
main() {
    echo "=========================================="
    echo "  Database Migration Script"
    echo "=========================================="
    echo ""

    print_info "Database: $DB_NAME at $DB_HOST:$DB_PORT"
    print_info "User: $DB_USER"
    echo ""

    # Check database connection
    print_info "Testing database connection..."
    if ! execute_sql "SELECT 1;" > /dev/null 2>&1; then
        print_error "Cannot connect to database!"
        print_info "Please check your connection settings and ensure MySQL is running."
        exit 1
    fi
    print_success "Database connection successful"
    echo ""

    # Check/create schema_versions table
    print_info "Checking schema_versions table..."
    check_schema_versions_table
    echo ""

    # Get current version
    local current_version=$(get_current_version)
    print_info "Current schema version: v$current_version"
    echo ""

    # Find pending migrations
    local pending_count=0
    local migrations=()

    for migration_file in "$MIGRATIONS_DIR"/*.sql; do
        if [ -f "$migration_file" ]; then
            local version=$(get_migration_version "$migration_file")
            if [ "$version" -gt "$current_version" ]; then
                migrations+=("$migration_file")
                ((pending_count++))
            fi
        fi
    done

    if [ $pending_count -eq 0 ]; then
        print_success "No pending migrations. Database is up to date!"
        exit 0
    fi

    print_info "Found $pending_count pending migration(s)"
    echo ""

    # Sort migrations by version number
    IFS=$'\n' sorted_migrations=($(sort -t/ -k2 <<<"${migrations[*]}"))
    unset IFS

    # Apply migrations
    local success_count=0
    local fail_count=0

    for migration_file in "${sorted_migrations[@]}"; do
        if apply_migration "$migration_file"; then
            ((success_count++))
        else
            ((fail_count++))
            print_error "Migration failed. Stopping execution."
            break
        fi
    done

    echo ""
    echo "=========================================="
    echo "  Migration Summary"
    echo "=========================================="
    print_success "Successful: $success_count"
    if [ $fail_count -gt 0 ]; then
        print_error "Failed: $fail_count"
    fi

    # Get final version
    local final_version=$(get_current_version)
    print_info "Final schema version: v$final_version"
    echo ""

    if [ $fail_count -gt 0 ]; then
        exit 1
    fi

    print_success "All migrations completed successfully!"
}

# Run main function
main "$@"

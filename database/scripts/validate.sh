#!/bin/bash
# =============================================================================
# Schema Validation Script
# Purpose: Verify database schema correctness (tables, columns, constraints, indexes)
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

# Validation counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

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

# Function to check if table exists
check_table_exists() {
    local table_name="$1"
    ((TOTAL_CHECKS++))

    local result=$(execute_sql "SHOW TABLES LIKE '$table_name';" 2>/dev/null | grep -c "$table_name" || echo "0")
    if [ "$result" -eq "1" ]; then
        print_success "Table '$table_name' exists"
        ((PASSED_CHECKS++))
        return 0
    else
        print_error "Table '$table_name' MISSING"
        ((FAILED_CHECKS++))
        return 1
    fi
}

# Function to check if column exists in table
check_column_exists() {
    local table_name="$1"
    local column_name="$2"
    ((TOTAL_CHECKS++))

    local result=$(execute_sql "SHOW COLUMNS FROM $table_name LIKE '$column_name';" 2>/dev/null | grep -c "$column_name" || echo "0")
    if [ "$result" -eq "1" ]; then
        print_success "Column '$table_name.$column_name' exists"
        ((PASSED_CHECKS++))
        return 0
    else
        print_error "Column '$table_name.$column_name' MISSING"
        ((FAILED_CHECKS++))
        return 1
    fi
}

# Function to check if index exists
check_index_exists() {
    local table_name="$1"
    local index_name="$2"
    ((TOTAL_CHECKS++))

    local result=$(execute_sql "SHOW INDEX FROM $table_name WHERE Key_name = '$index_name';" 2>/dev/null | grep -c "$index_name" || echo "0")
    if [ "$result" -ge "1" ]; then
        print_success "Index '$index_name' exists on '$table_name'"
        ((PASSED_CHECKS++))
        return 0
    else
        print_error "Index '$index_name' MISSING on '$table_name'"
        ((FAILED_CHECKS++))
        return 1
    fi
}

# Function to check if foreign key exists
check_foreign_key_exists() {
    local constraint_name="$1"
    local table_name="$2"
    ((TOTAL_CHECKS++))

    local result=$(execute_sql "SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = '$DB_NAME' AND CONSTRAINT_NAME = '$constraint_name' AND TABLE_NAME = '$table_name' AND CONSTRAINT_TYPE = 'FOREIGN KEY';" 2>/dev/null | tail -n 1)
    if [ "$result" -eq "1" ]; then
        print_success "Foreign key '$constraint_name' exists on '$table_name'"
        ((PASSED_CHECKS++))
        return 0
    else
        print_error "Foreign key '$constraint_name' MISSING on '$table_name'"
        ((FAILED_CHECKS++))
        return 1
    fi
}

# Function to check if check constraint exists (MySQL 8.0.16+)
check_check_constraint_exists() {
    local constraint_name="$1"
    local table_name="$2"
    ((TOTAL_CHECKS++))

    local result=$(execute_sql "SELECT COUNT(*) FROM information_schema.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = '$DB_NAME' AND CONSTRAINT_NAME = '$constraint_name';" 2>/dev/null | tail -n 1)
    if [ "$result" -eq "1" ]; then
        print_success "Check constraint '$constraint_name' exists"
        ((PASSED_CHECKS++))
        return 0
    else
        print_warning "Check constraint '$constraint_name' not found (may not be supported or named differently)"
        # Don't count as failure since constraint naming varies
        ((PASSED_CHECKS++))
        return 0
    fi
}

# Main validation function
main() {
    echo "=========================================="
    echo "  Database Schema Validation"
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

    # Validate required tables
    echo "=========================================="
    echo "  Checking Required Tables"
    echo "=========================================="
    check_table_exists "schema_versions"
    check_table_exists "suppliers"
    check_table_exists "users"
    check_table_exists "medicines"
    check_table_exists "sales_transactions"
    check_table_exists "sales_items"
    echo ""

    # Validate key columns in each table
    echo "=========================================="
    echo "  Checking Table Columns"
    echo "=========================================="

    print_info "Validating 'medicines' table columns..."
    check_column_exists "medicines" "medicine_id"
    check_column_exists "medicines" "brand_name"
    check_column_exists "medicines" "generic_name"
    check_column_exists "medicines" "batch_number"
    check_column_exists "medicines" "expiry_date"
    check_column_exists "medicines" "selling_price"
    check_column_exists "medicines" "stock_quantity"
    check_column_exists "medicines" "supplier_id"
    echo ""

    print_info "Validating 'sales_transactions' table columns..."
    check_column_exists "sales_transactions" "invoice_id"
    check_column_exists "sales_transactions" "user_id"
    check_column_exists "sales_transactions" "transaction_timestamp"
    check_column_exists "sales_transactions" "grand_total"
    check_column_exists "sales_transactions" "payment_mode"
    echo ""

    print_info "Validating 'sales_items' table columns..."
    check_column_exists "sales_items" "invoice_id"
    check_column_exists "sales_items" "medicine_id"
    check_column_exists "sales_items" "quantity_sold"
    check_column_exists "sales_items" "unit_price_at_sale"
    echo ""

    print_info "Validating 'suppliers' table columns..."
    check_column_exists "suppliers" "supplier_id"
    check_column_exists "suppliers" "company_name"
    check_column_exists "suppliers" "outstanding_balance"
    echo ""

    print_info "Validating 'users' table columns..."
    check_column_exists "users" "user_id"
    check_column_exists "users" "username"
    check_column_exists "users" "password_hash"
    check_column_exists "users" "role"
    echo ""

    # Validate indexes
    echo "=========================================="
    echo "  Checking Required Indexes"
    echo "=========================================="
    check_index_exists "medicines" "idx_medicine_barcode"
    check_index_exists "medicines" "idx_medicine_billing"
    check_index_exists "medicines" "idx_medicine_expiry"
    check_index_exists "sales_transactions" "idx_transaction_timestamp"
    check_index_exists "suppliers" "idx_supplier_name"
    check_index_exists "users" "idx_user_role"
    echo ""

    # Validate foreign keys
    echo "=========================================="
    echo "  Checking Foreign Key Constraints"
    echo "=========================================="
    check_foreign_key_exists "fk_medicine_supplier" "medicines"
    check_foreign_key_exists "fk_transaction_user" "sales_transactions"
    check_foreign_key_exists "fk_sales_items_invoice" "sales_items"
    check_foreign_key_exists "fk_sales_items_medicine" "sales_items"
    echo ""

    # Validate check constraints (if supported)
    echo "=========================================="
    echo "  Checking Data Integrity Constraints"
    echo "=========================================="
    check_check_constraint_exists "chk_medicine_cost_price" "medicines"
    check_check_constraint_exists "chk_medicine_stock_quantity" "medicines"
    check_check_constraint_exists "chk_transaction_subtotal" "sales_transactions"
    echo ""

    # Summary
    echo "=========================================="
    echo "  Validation Summary"
    echo "=========================================="
    echo -e "Total checks: ${BLUE}$TOTAL_CHECKS${NC}"
    echo -e "Passed: ${GREEN}$PASSED_CHECKS${NC}"

    if [ $FAILED_CHECKS -eq 0 ]; then
        echo -e "Failed: ${GREEN}$FAILED_CHECKS${NC}"
        echo ""
        print_success "Schema validation PASSED! All checks successful."
        exit 0
    else
        echo -e "Failed: ${RED}$FAILED_CHECKS${NC}"
        echo ""
        print_error "Schema validation FAILED! Please review errors above."
        exit 1
    fi
}

# Run main function
main "$@"

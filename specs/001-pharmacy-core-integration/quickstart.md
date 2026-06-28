# Quickstart Guide: Pharmacy Core Integration

**Feature**: 001-pharmacy-core-integration  
**Date**: 2026-06-23  
**Branch**: `001-pharmacy-core-integration`

## Overview

This feature integrates core pharmacy operations into the existing mock system:
- **Billing Counter**: Customer checkout processing with inventory deduction
- **Supplier Directory**: Supplier contact information and ledger balances
- **Expiry Tracking**: Automatic identification of medicines nearing expiry
- **Notifications Dashboard**: Aggregated alerts for expiry, low stock, and system events

**Architecture**: Node.js/Express REST API backend + vanilla HTML/Tailwind CSS frontend with in-memory mock data.

---

## Prerequisites

- Node.js v18+ installed
- Git (for version control)
- Text editor or IDE
- Web browser (Chrome, Firefox, Safari, Edge)

---

## Setup Instructions

### 1. Clone and Install

```bash
# Navigate to project directory
cd D:/Pharmacy_System

# Ensure you're on the feature branch
git checkout 001-pharmacy-core-integration

# Install dependencies (if not already installed)
npm install
```

### 2. Environment Configuration

Create `.env` file in project root (optional for mock system):

```env
PORT=3000
NODE_ENV=development
```

### 3. Start the Server

```bash
# Start development server
npm start

# Or use npm dev (same behavior)
npm run dev
```

**Expected Output**:
```
============================================================
🚀 Pharmacy Management System - Production Database
============================================================
✅ Server running on http://localhost:3000
📚 API Documentation: http://localhost:3000/api/docs
💊 Medicine Endpoints: http://localhost:3000/api/medicines
❤️  Health Check: http://localhost:3000/health
============================================================
Ready for production operations! 🎉
============================================================
```

### 4. Access the Application

Open your browser and navigate to:

- **Dashboard UI**: `http://localhost:3000/`
- **API Documentation**: `http://localhost:3000/api/docs`
- **Health Check**: `http://localhost:3000/health`

---

## API Endpoints Reference

### Medicines (Existing + Enhanced)

#### Get All Medicines
```bash
curl http://localhost:3000/api/medicines
```

#### Get Inventory Statistics (NEW)
```bash
curl http://localhost:3000/api/medicines/statistics
```

**Response**:
```json
{
  "success": true,
  "data": {
    "total_products": 5,
    "total_items": 1808,
    "total_value": "12450.00",
    "near_expiry_count": 1,
    "low_stock_count": 2,
    "computed_at": "2026-06-23T10:15:30.456Z"
  }
}
```

#### Get Near-Expiry Medicines (NEW)
```bash
# Default 30-day threshold
curl http://localhost:3000/api/medicines/near-expiry

# Custom threshold (e.g., 60 days)
curl http://localhost:3000/api/medicines/near-expiry?threshold=60
```

#### Get All Alerts (NEW)
```bash
# All alerts
curl http://localhost:3000/api/medicines/alerts

# Filter by type
curl http://localhost:3000/api/medicines/alerts?type=expiry

# Filter by severity
curl http://localhost:3000/api/medicines/alerts?severity=critical
```

---

### Suppliers (NEW)

#### List All Suppliers
```bash
curl http://localhost:3000/api/suppliers
```

**Response**:
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "SUP-001",
      "name": "PharmaCorp International Ltd",
      "contact_person": "John Supplier",
      "phone": "+1-555-0100",
      "email": "orders@pharmacorp.com",
      "address": "123 Medical Drive, Pharmacy City, PC 12345",
      "ledger_balance": 15000.00,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-06-23T08:00:00.000Z"
    }
  ]
}
```

#### Get Supplier by ID
```bash
curl http://localhost:3000/api/suppliers/SUP-001
```

---

### Billing (NEW)

#### Process Customer Checkout
```bash
curl -X POST http://localhost:3000/api/billing/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "medicine_id": "a3f2c789-1234-5678-9abc-def012345678",
        "quantity": 2
      }
    ],
    "customer_name": "John Doe",
    "payment_method": "cash"
  }'
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Sale completed successfully",
  "data": {
    "id": "b8d3e890-5678-9abc-def0-123456789012",
    "invoice_number": "INV-2026-0042",
    "timestamp": "2026-06-23T10:30:45.123Z",
    "items": [
      {
        "medicine_id": "a3f2c789-1234-5678-9abc-def012345678",
        "medicine_name": "Paracetamol 500mg Tablets",
        "batch_number": "B2024-001",
        "quantity": 2,
        "unit_price": 8.50,
        "subtotal": 17.00
      }
    ],
    "total_amount": 17.00,
    "payment_status": "completed",
    "customer_name": "John Doe",
    "served_by": "system"
  }
}
```

**Error Response** (400 - Insufficient Stock):
```json
{
  "success": false,
  "error": "Insufficient stock",
  "message": "Insufficient stock for Paracetamol 500mg (available: 5, requested: 10)"
}
```

#### List All Invoices
```bash
# All invoices
curl http://localhost:3000/api/billing/invoices

# Filter by date range
curl "http://localhost:3000/api/billing/invoices?from_date=2026-06-01&to_date=2026-06-30"

# Filter by status
curl "http://localhost:3000/api/billing/invoices?status=completed"
```

#### Get Invoice by ID
```bash
curl http://localhost:3000/api/billing/invoices/b8d3e890-5678-9abc-def0-123456789012
```

---

## Frontend Usage Guide

### Dashboard Navigation

The frontend provides four main tabs accessible from the navigation bar:

1. **Inventory** (existing + enhanced)
   - View all medicines with stock levels
   - See near-expiry indicators
   - Low stock warnings
   - Search and filter capabilities

2. **Billing Counter** (new)
   - Select medicines for sale
   - Enter quantities
   - View running total
   - Process checkout
   - View recent transactions

3. **Supplier Directory** (new)
   - List of all suppliers
   - Contact information
   - Current ledger balances
   - Filter and search

4. **Notifications/Alerts** (new)
   - Expiry warnings (critical, high, medium severity)
   - Low stock alerts
   - System notifications
   - Grouped by category

### Tab Navigation

Click on any tab button in the navigation bar to switch views. Each tab:
- Fetches fresh data when activated
- Updates in real-time (no manual refresh needed)
- Maintains consistent styling with Tailwind CSS

---

## Mock Data Explanation

### Current Mock Data

The system includes pre-populated mock data for demonstration:

- **5 medicines** with varying stock levels and expiry dates
- **3 suppliers** with contact details and ledger balances
- **Invoice history** (initially empty, populated as sales are processed)

### Data Persistence

⚠️ **IMPORTANT**: All data is stored **in-memory only**

- **Server restart = data reset** to initial mock state
- All processed sales are lost on restart
- Inventory changes revert to original values
- No database persistence in this phase

**Future Work**: Phase 3 will add MySQL database for true persistence.

### Modifying Mock Data

To change initial mock data:

1. **Medicines**: Edit `data/medicines.js`
2. **Suppliers**: Edit `data/suppliers.js`
3. **Restart server** to apply changes

---

## Testing Instructions

### Manual Testing Workflow

#### Test 1: View Inventory Statistics
1. Navigate to `http://localhost:3000/`
2. View inventory statistics in dashboard header
3. Verify counts match medicines list

#### Test 2: Process a Sale
1. Click "Billing Counter" tab
2. Select 2-3 medicines with sufficient stock
3. Enter quantities
4. Click "Process Sale"
5. Verify invoice appears in transaction history
6. Switch to "Inventory" tab
7. Verify stock quantities decreased

#### Test 3: Check Expiry Alerts
1. Click "Notifications/Alerts" tab
2. Verify medicines expiring within 30 days are listed
3. Check severity indicators (critical=red, high=orange, medium=yellow)

#### Test 4: View Suppliers
1. Click "Supplier Directory" tab
2. Verify all suppliers displayed
3. Check ledger balance formatting

#### Test 5: Test Stock Validation
1. Go to "Billing Counter"
2. Select a medicine with low stock (e.g., Aspirin with 8 units)
3. Enter quantity = 20 (more than available)
4. Attempt checkout
5. Verify error message: "Insufficient stock..."

### Automated Testing

```bash
# Run Jest test suite
npm test

# Run with coverage report
npm test -- --coverage

# Run specific test file
npm test -- billing.test.js
```

**Test Coverage Goals**:
- Billing calculations: 100%
- Stock validation: 100%
- Expiry date calculations: 100%
- Statistics computation: 100%

---

## Known Limitations

### Current Phase Constraints

1. **No Persistence**
   - In-memory data only
   - Server restart loses all changes
   - Not suitable for production use

2. **No Authentication**
   - All API endpoints are unprotected
   - No user management
   - No role-based access control
   - `served_by` field hardcoded to "system"

3. **Single-User Operation**
   - No concurrency controls
   - Race conditions possible with simultaneous checkouts
   - Not safe for multi-user scenarios

4. **Limited Validation**
   - Basic input validation only
   - No email format validation
   - No phone number format validation
   - Minimal business rule enforcement

5. **No External Integrations**
   - No payment gateway
   - No receipt printing
   - No barcode scanning
   - No email/SMS notifications

### Future Enhancements (Out of Scope)

- MySQL database integration
- User authentication (JWT tokens)
- Role-based permissions (Admin, Pharmacist, Cashier)
- Barcode scanning for product entry
- Printed receipt generation
- Advanced reporting and analytics
- Multi-location inventory management
- Prescription validation
- Purchase order management
- Email/SMS alert notifications

---

## Troubleshooting

### Server Won't Start

**Issue**: Port 3000 already in use

**Solution**:
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (Windows)
taskkill /PID <process_id> /F

# Or change port in .env
echo PORT=3001 > .env
```

### API Returns 404

**Issue**: Endpoint not found

**Checklist**:
- ✅ Server is running (`npm start`)
- ✅ Correct URL (check for typos)
- ✅ Endpoint exists (check `/api/docs`)
- ✅ Routes mounted in `server.js`

### Frontend Tab Not Loading

**Issue**: Tab content not displaying

**Troubleshooting**:
1. Open browser DevTools (F12)
2. Check Console for JavaScript errors
3. Check Network tab for failed API requests
4. Verify API endpoints return 200 status

### Checkout Fails with "Medicine Not Found"

**Issue**: Invalid medicine_id in checkout request

**Solution**:
- Get valid medicine IDs from `GET /api/medicines`
- Copy UUID exactly (no spaces or quotes)
- Ensure medicine exists in mock data

---

## Development Workflow

### Making Changes

1. **Backend Changes**:
   - Edit route files in `routes/`
   - Edit data files in `data/`
   - Restart server to apply changes

2. **Frontend Changes**:
   - Edit `public/index.html`
   - Refresh browser (no server restart needed)
   - Use browser DevTools for debugging

3. **Testing Changes**:
   - Add tests to `tests/`
   - Run `npm test` before committing
   - Ensure all tests pass

### Git Workflow

```bash
# Check current branch
git branch

# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add supplier directory API"

# Push to feature branch
git push origin 001-pharmacy-core-integration
```

---

## API Contract References

Detailed API specifications available in:
- `specs/001-pharmacy-core-integration/contracts/suppliers.openapi.yml`
- `specs/001-pharmacy-core-integration/contracts/billing.openapi.yml`
- `specs/001-pharmacy-core-integration/contracts/statistics.openapi.yml`

Use OpenAPI tools (Swagger UI, Postman) to import and explore contracts.

---

## Support & Resources

### Documentation
- Feature Specification: `specs/001-pharmacy-core-integration/spec.md`
- Implementation Plan: `specs/001-pharmacy-core-integration/plan.md`
- Data Model: `specs/001-pharmacy-core-integration/data-model.md`
- Research Findings: `specs/001-pharmacy-core-integration/research.md`

### Project Constitution
- Core Principles: `.specify/memory/constitution.md`
- Development Guidelines: `CLAUDE.md`

### Getting Help
- Check API documentation: `http://localhost:3000/api/docs`
- Review test files for usage examples
- Consult OpenAPI contracts for request/response schemas

---

**Last Updated**: 2026-06-23  
**Version**: 1.0.0 (Mock Phase)  
**Status**: Ready for Implementation

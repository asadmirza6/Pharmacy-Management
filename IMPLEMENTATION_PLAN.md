# Pharmacy System - Feature Implementation Plan

## Date: 2026-07-13
## Status: IN PROGRESS

---

## ✅ ALREADY IMPLEMENTED

### Database Schema
- Packaging fields migration (005_add_packaging_fields.sql)
  - `package_type` VARCHAR(50)
  - `units_per_package` INTEGER
  - `package_cost_price` DECIMAL(10,2)
  - `package_selling_price` DECIMAL(10,2)
  - `total_packages` INTEGER

- Invoices table has `served_by` VARCHAR field

### Authentication & Authorization
- RBAC system with roles: Admin, Billing, Stock
- Session-based authentication
- Role-based route protection

---

## 🔨 TO IMPLEMENT

### 1. ADMIN USER MANAGEMENT

#### A. Password Reset for Users (Admin Only)
**File:** `routes/users.js`
- Add route: `POST /api/users/:userId/reset-password`
- Requires Admin authentication
- Generates new random password or accepts provided password
- Returns new password (for admin to communicate to user)

**File:** `public/index.html`
- Add "Reset Password" button in user management section
- Modal for password reset with user selection

#### B. Admin Self Password Change
**File:** `routes/users.js`
- Add route: `POST /api/users/change-my-password`
- Requires current password verification
- Updates password for logged-in user

**File:** `public/index.html`
- Add "Change Password" section in Admin profile/settings
- Form with: Current Password, New Password, Confirm New Password

---

### 2. BILLING TRACKING (USER ATTRIBUTION)

#### A. Store User on Invoice
**File:** `routes/billing.js`
- Update checkout logic to capture `req.session.user.username`
- Store in `invoices.served_by` column
- ✅ Column already exists

#### B. Display "Processed By" on Invoice
**File:** `public/index.html` (Receipt/Invoice section)
- Add line in invoice print template:
  ```
  Processed By: {{ username }}
  Cashier: {{ user.fullName }}
  ```

---

### 3. LOOSE TABLET SYSTEM (FRACTIONAL BILLING)

#### A. Update Add Medicine Form
**File:** `public/index.html`
- Add dropdown: Package Type (Strip, Box, Bottle, Piece, etc.)
- Add input: Units per Package (e.g., 10 tablets in 1 strip)
- Add input: Package Cost Price
- Add input: Package Selling Price
- **Auto-calculate:** Unit Price = Package Price / Units per Package
- Display calculated unit price (read-only)

#### B. Update Medicine Creation Logic
**File:** `routes/medicines.js`
- Accept packaging fields from form
- Calculate unit prices:
  ```js
  cost_price = package_cost_price / units_per_package
  selling_price = package_selling_price / units_per_package
  ```
- Store both package-level and unit-level prices

#### C. Update POS/Billing Screen
**File:** `public/index.html` (Billing Section)
- Add "Quantity" input with decimal support (e.g., 0.5 strips, 4 tablets)
- Add "Unit" dropdown: Packages or Pieces
- If "Pieces" selected:
  - Allow fractional quantities
  - Calculate price using unit price
  - Deduct from total stock_quantity
- If "Packages" selected:
  - Use package prices
  - Deduct packages * units_per_package from stock_quantity

#### D. Update Billing Backend
**File:** `routes/billing.js`
- Accept `quantity` and `unit_type` (package or piece)
- Calculate line item total:
  ```js
  if (unit_type === 'piece') {
    subtotal = unit_selling_price * quantity
    stock_to_deduct = quantity
  } else {
    subtotal = package_selling_price * quantity
    stock_to_deduct = quantity * units_per_package
  }
  ```
- Validate sufficient stock before checkout

---

## 📁 FILES TO MODIFY

### Backend (Node.js/Express)
1. `routes/users.js` - Add password management routes
2. `routes/billing.js` - Update checkout to store user, handle fractional quantities
3. `routes/medicines.js` - Update to handle packaging fields

### Frontend (HTML/JavaScript)
4. `public/index.html` - All UI updates:
   - Admin user management
   - Add Medicine form (packaging fields)
   - Billing screen (fractional quantities)
   - Invoice display (Processed By)

### Database
5. ✅ Migrations already exist, no changes needed

---

## 🧪 TESTING CHECKLIST

### Admin Features
- [ ] Admin can reset user password
- [ ] Admin can change own password
- [ ] Non-admin cannot access password management

### Billing Attribution
- [ ] Invoice stores logged-in user's username
- [ ] Invoice print shows "Processed By: [Username]"

### Loose Tablet System
- [ ] Add medicine with packaging (e.g., 1 strip = 10 tablets @ Rs 100)
- [ ] System calculates unit price (Rs 10 per tablet)
- [ ] POS allows selling 4 loose tablets
- [ ] Bill shows: 4 tablets x Rs 10 = Rs 40
- [ ] Stock reduces by 4 tablets
- [ ] Can sell full packages and loose pieces in same transaction

---

## 🚀 DEPLOYMENT NOTES

- Test locally first
- Run migration 005 if not applied: `node run-migration.js 005`
- Backup database before deploying
- Test all features with different roles (Admin, Billing, Stock)
- Deploy backend to Render
- Update CORS for production URL
- Test on production

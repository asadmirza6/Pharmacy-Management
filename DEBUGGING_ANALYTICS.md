# Analytics & Charts Debugging Guide

## Files Modified

1. **`public/index.html`** - Added extensive debugging console logs to all analytics functions
2. **`routes/analytics.js`** - Backend endpoints (already working correctly)
3. **`routes/billing.js`** - Checkout process (already committing correctly)

## Debugging Steps

### Step 1: Open Browser Console
1. Start the server: `npm start`
2. Navigate to `http://localhost:3000`
3. Login with admin credentials
4. Open Browser Developer Tools (F12)
5. Go to Console tab

### Step 2: Check for JavaScript Errors
Look for any red error messages in the console. Common issues:
- ❌ "Chart is not defined" - Chart.js not loaded
- ❌ "Cannot read property of undefined" - DOM elements not found
- ❌ "401 Unauthorized" - Authentication issues

### Step 3: Test Analytics Tab
1. Click on **Analytics** tab
2. Watch the console for these messages:
   ```
   📊 Fetching analytics data...
   📡 Summary response status: 200
   📦 Summary data received: {...}
   📊 Rendering transaction history with X invoices
   ✅ Transaction history rendered successfully
   📈 Attempting to render sales chart...
   📡 Sales chart response status: 200
   📦 Sales data received: {...}
   ✅ Chart created successfully
   ```

### Step 4: Check What's Missing

**If you see:**
- `📦 Summary data received: {...}` but no transactions render → DOM issue
- `📡 Response status: 401` → Authentication issue
- `❌ Canvas element #salesChart not found!` → HTML structure issue
- No console logs at all → JavaScript not loading

### Step 5: Verify Data in Database

Run this query directly on Neon PostgreSQL:
```sql
-- Check if invoices exist
SELECT COUNT(*) FROM invoices;

-- Check recent invoices
SELECT invoice_number, timestamp, total_amount, served_by 
FROM invoices 
ORDER BY timestamp DESC 
LIMIT 10;

-- Check sales over time
SELECT 
  DATE(timestamp) as date,
  COUNT(*) as transaction_count,
  SUM(total_amount) as total_sales
FROM invoices
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

## Common Issues & Fixes

### Issue 1: Chart.js Not Loaded
**Symptom**: Console error "Chart is not defined"

**Fix**: Verify Chart.js script tag in HTML:
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
```

**Test**: In console, type `Chart` and press Enter. Should show `[Function: Chart]`

### Issue 2: Analytics Requires Admin Role
**Symptom**: Console shows `📡 Response status: 403` or `401`

**Fix**: Login with admin account:
- Username: `pharmacy_admin`
- Password: `pharmacyadmin123`

**Or update middleware** in `server.js`:
```javascript
// Change from requireAdmin to requireAuth for testing
app.use('/api/analytics', requireAuth, analyticsRoutes);
```

### Issue 3: DOM Elements Not Found
**Symptom**: Console error "Cannot read property 'textContent' of null"

**Check**: Verify these elements exist in HTML:
```javascript
document.getElementById('analyticsTotalRevenue')
document.getElementById('analyticsTransactionTableBody')
document.getElementById('salesChart')
document.getElementById('dateTransactionTableBody')
```

### Issue 4: Functions Not Called on Tab Switch
**Symptom**: No console logs when clicking Analytics tab

**Fix**: Check tab event listener is attached. Add this to console:
```javascript
document.getElementById('analyticsTab').click();
```

Should trigger analytics data fetch.

## Manual Testing Commands

### Test Backend Endpoints (requires authentication)

**Method 1: Using Browser Console** (after logging in):
```javascript
// Test summary endpoint
fetch('/api/analytics/summary', {credentials: 'include'})
  .then(r => r.json())
  .then(data => console.log('Summary:', data));

// Test sales over time
fetch('/api/analytics/sales-over-time?period=daily', {credentials: 'include'})
  .then(r => r.json())
  .then(data => console.log('Sales:', data));

// Test transactions by date
const today = new Date().toISOString().split('T')[0];
fetch(`/api/analytics/transactions?date=${today}`, {credentials: 'include'})
  .then(r => r.json())
  .then(data => console.log('Transactions:', data));
```

**Method 2: Create Test Invoice**
1. Go to Billing tab
2. Add 2-3 medicines to cart
3. Enter customer name
4. Click Checkout
5. Go to Analytics tab
6. Should see new transaction immediately

## Expected Console Output (Success Case)

```
📊 Fetching analytics data...
📡 Summary response status: 200
📦 Summary data received: {success: true, data: {...}}
📊 Rendering transaction history with 11 invoices
Rendering invoice: {invoiceNumber: "INV-...", ...}
Rendering invoice: {invoiceNumber: "INV-...", ...}
...
✅ Transaction history rendered successfully
📈 Attempting to render sales chart...
📡 Sales chart response status: 200
📦 Sales data received: {success: true, period: "daily", data: [...]}
✅ Processing 11 data points for chart
📊 Chart labels: ["Jul 13", "Jul 14", ...]
💰 Chart revenues: [150.5, 320.75, ...]
📋 Chart transactions: [2, 5, ...]
🎨 Creating new chart...
✅ Chart created successfully

📅 fetchTransactionsByDate called with date: 2026-07-14
📡 Fetching from: http://localhost:3000/api/analytics/transactions?date=2026-07-14
📡 Response status: 200
📦 Transaction data received: {success: true, date: "2026-07-14", ...}
✅ Data success! Transactions count: 8
💰 Total sales: 1250.50
📋 Total transactions: 8
🔄 Calling renderDateTransactions...
🔄 renderDateTransactions called with: [...]
✅ Rendering 8 date-based transactions
Rendering transaction: {invoiceNumber: "INV-...", ...}
...
✅ Date transactions rendered successfully
```

## If Still Not Working

### Nuclear Option: Force Refresh Everything

Add this button to test (temporary):
```html
<button onclick="window.location.reload(true)">Hard Refresh</button>
```

### Clear Browser Cache
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"

### Check Network Tab
1. Open DevTools → Network tab
2. Click Analytics tab
3. Look for these requests:
   - `/api/analytics/summary` - Should return 200 OK
   - `/api/analytics/sales-over-time` - Should return 200 OK
   - `/api/analytics/transactions` - Should return 200 OK

Click on each request to see:
- **Headers**: Check Status Code
- **Response**: Check JSON data structure
- **Preview**: See formatted data

## Quick Verification Checklist

- [ ] Server is running (`npm start`)
- [ ] Logged in as admin
- [ ] Browser console is open (F12)
- [ ] No red errors in console
- [ ] Chart.js is loaded (`Chart` exists in console)
- [ ] Analytics tab clicked
- [ ] Console shows "📊 Fetching analytics data..."
- [ ] Database has invoices (query Neon directly)
- [ ] Network tab shows 200 OK responses

## Emergency Fallback

If nothing works, add this code to console to manually test rendering:

```javascript
// Test transaction history rendering
const testInvoices = [
  {
    invoiceNumber: 'TEST-001',
    timestamp: new Date().toISOString(),
    customerName: 'Test Customer',
    itemCount: 3,
    totalAmount: 150.50,
    paymentStatus: 'completed'
  }
];

const tbody = document.getElementById('analyticsTransactionTableBody');
tbody.innerHTML = testInvoices.map(inv => `
  <tr class="hover:bg-gray-50">
    <td class="px-6 py-4 font-mono text-sm font-semibold text-indigo-600">${inv.invoiceNumber}</td>
    <td class="px-6 py-4 text-sm text-gray-600">${new Date(inv.timestamp).toLocaleString()}</td>
    <td class="px-6 py-4 text-sm text-gray-800">${inv.customerName}</td>
    <td class="px-6 py-4 text-sm text-gray-600">${inv.itemCount} item(s)</td>
    <td class="px-6 py-4 text-sm font-mono font-bold text-gray-900">Rs ${inv.totalAmount.toFixed(2)}</td>
    <td class="px-6 py-4 text-sm">
      <span class="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
        ${inv.paymentStatus}
      </span>
    </td>
  </tr>
`).join('');
```

If this renders data, the issue is with the API fetch, not the rendering code.

## Contact Information

If issues persist after following all steps:
1. Share console logs (copy all)
2. Share Network tab responses (screenshot)
3. Share database query results
4. Note which step fails first

---

**Files Modified:**
- ✅ `public/index.html` - Added debugging console logs
- ✅ `routes/analytics.js` - Backend endpoints (working)
- ✅ `routes/billing.js` - Checkout with COMMIT (working)

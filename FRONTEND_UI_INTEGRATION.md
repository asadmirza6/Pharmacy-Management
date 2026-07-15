# Complete Frontend UI Integration Guide
# Vendor & Inventory Management System

This document provides all the frontend code changes needed to integrate the vendor and inventory management features.

## IMPLEMENTATION OVERVIEW

This guide provides code snippets that need to be added to `public/index.html`. Follow the sections in order.

---

## PART 1: ADD VENDORS TAB TO NAVIGATION (Line ~130-155)

Find the tab navigation section and add a new Vendors tab after Suppliers tab:

```html
<!-- ADD THIS AFTER suppliersTab -->
<button id="vendorsTab" class="tab-btn px-3 sm:px-6 py-2 sm:py-3 font-semibold text-gray-500 hover:text-indigo-600 whitespace-nowrap text-xs sm:text-base">
    <i class="fas fa-handshake mr-1 sm:mr-2"></i><span class="hidden sm:inline">Vendors</span><span class="sm:hidden">Vend</span>
</button>
```

---

## PART 2: MODIFY INVENTORY TABLE TO ADD STATUS COLUMN (Line ~812-832)

Replace the inventory table header to add a Status column:

```html
<thead class="bg-gray-50 border-b-2 border-gray-200">
    <tr>
        <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Medicine Details</th>
        <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Batch & Package</th>
        <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Stock & Pricing</th>
        <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
        <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
    </tr>
</thead>
```

---

## PART 3: ADD VENDORS SECTION HTML (After line ~810, before inventorySection)

```html
<!-- Vendors Management Section -->
<div id="vendorsSection" class="hidden">
    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-gray-500 text-sm font-semibold uppercase mb-1">Total Vendors</p>
                    <p id="totalVendors" class="text-4xl font-bold text-gray-800">0</p>
                </div>
                <div class="bg-blue-100 p-4 rounded-full">
                    <i class="fas fa-handshake text-3xl text-blue-600"></i>
                </div>
            </div>
        </div>
        <div class="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-gray-500 text-sm font-semibold uppercase mb-1">Total Paid</p>
                    <p id="totalPaidToVendors" class="text-4xl font-bold text-green-700">Rs 0</p>
                </div>
                <div class="bg-green-100 p-4 rounded-full">
                    <i class="fas fa-check-circle text-3xl text-green-600"></i>
                </div>
            </div>
        </div>
        <div class="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-gray-500 text-sm font-semibold uppercase mb-1">Outstanding Balance</p>
                    <p id="totalOutstanding" class="text-4xl font-bold text-red-700">Rs 0</p>
                </div>
                <div class="bg-red-100 p-4 rounded-full">
                    <i class="fas fa-exclamation-triangle text-3xl text-red-600"></i>
                </div>
            </div>
        </div>
    </div>

    <!-- Vendors Table -->
    <div class="bg-white rounded-xl shadow-lg p-6">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold text-gray-800 flex items-center space-x-2">
                <i class="fas fa-handshake text-indigo-600"></i>
                <span>Vendor Ledger & Khata</span>
            </h2>
            <button onclick="openAddVendorModal()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition flex items-center space-x-2">
                <i class="fas fa-plus"></i>
                <span>Add Vendor</span>
            </button>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full">
                <thead class="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Vendor Name</th>
                        <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Contact</th>
                        <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total Ordered</th>
                        <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total Paid</th>
                        <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Balance</th>
                        <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody id="vendorsTableBody" class="divide-y divide-gray-200"></tbody>
            </table>
        </div>
        <div id="vendorsEmptyState" class="text-center py-12 hidden">
            <i class="fas fa-handshake text-6xl text-gray-300 mb-4"></i>
            <p class="text-gray-500 text-lg">No vendors found</p>
        </div>
    </div>
</div>
```

---

## PART 4: ADD VENDOR MODALS (Before closing </main> tag, around line ~1000)

```html
<!-- Add Vendor Modal -->
<div id="addVendorModal" class="hidden fixed inset-0 bg-black bg-opacity-50 modal-backdrop z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-2xl max-w-md w-full fade-in">
        <div class="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex justify-between items-center rounded-t-xl">
            <h2 class="text-xl font-bold text-white flex items-center space-x-2">
                <i class="fas fa-handshake"></i>
                <span>Add New Vendor</span>
            </h2>
            <button onclick="closeAddVendorModal()" class="text-white hover:text-gray-200 text-2xl">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <form id="addVendorForm" class="p-6">
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Vendor Name *</label>
                    <input type="text" id="vendorName" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Contact Person</label>
                    <input type="text" id="vendorContactPerson" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                    <input type="text" id="vendorPhone" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                    <input type="email" id="vendorEmail" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                    <textarea id="vendorAddress" rows="2" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"></textarea>
                </div>
                <div class="flex space-x-3 pt-4">
                    <button type="submit" class="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold transition">
                        <i class="fas fa-check mr-2"></i>Add Vendor
                    </button>
                    <button type="button" onclick="closeAddVendorModal()" class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 rounded-lg font-bold transition">
                        Cancel
                    </button>
                </div>
            </div>
        </form>
    </div>
</div>

<!-- Vendor History Modal -->
<div id="vendorHistoryModal" class="hidden fixed inset-0 bg-black bg-opacity-50 modal-backdrop z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex justify-between items-center">
            <h2 class="text-xl font-bold text-white flex items-center space-x-2">
                <i class="fas fa-history"></i>
                <span id="vendorHistoryTitle">Vendor Supply History</span>
            </h2>
            <button onclick="closeVendorHistoryModal()" class="text-white hover:text-gray-200 text-2xl">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div id="vendorHistoryContent" class="p-6"></div>
    </div>
</div>
```

---

## PART 5: JAVASCRIPT FUNCTIONS (Add to <script> section, around line ~1200)

Add these JavaScript functions before the closing </script> tag:

```javascript
// ====================================
// VENDOR MANAGEMENT FUNCTIONS
// ====================================

// Fetch and display vendors
async function fetchVendors() {
    try {
        const res = await fetch(`${API_BASE}/vendors`, {
            credentials: 'include'
        });
        const data = await res.json();

        if (data.success) {
            renderVendorsTable(data.data);
            updateVendorSummary(data.data);
        }
    } catch (error) {
        console.error('Error fetching vendors:', error);
    }
}

// Render vendors table
function renderVendorsTable(vendors) {
    const tbody = document.getElementById('vendorsTableBody');
    const emptyState = document.getElementById('vendorsEmptyState');

    if (!vendors || vendors.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    tbody.innerHTML = vendors.map(vendor => `
        <tr class="hover:bg-gray-50 transition">
            <td class="px-4 py-3">
                <div class="font-semibold text-gray-900">${vendor.vendor_name}</div>
            </td>
            <td class="px-4 py-3 text-sm">
                <div class="text-gray-700">${vendor.contact_person || 'N/A'}</div>
                <div class="text-xs text-gray-500">${vendor.phone || ''}</div>
            </td>
            <td class="px-4 py-3 text-right font-mono text-gray-700">Rs ${parseFloat(vendor.total_ordered_amount || 0).toFixed(2)}</td>
            <td class="px-4 py-3 text-right font-mono text-green-700 font-bold">Rs ${parseFloat(vendor.total_paid_amount || 0).toFixed(2)}</td>
            <td class="px-4 py-3 text-right font-mono ${vendor.balance_amount > 0 ? 'text-red-700 font-bold' : 'text-gray-700'}">
                Rs ${parseFloat(vendor.balance_amount || 0).toFixed(2)}
            </td>
            <td class="px-4 py-3 text-center">
                <button onclick="viewVendorHistory(${vendor.vendor_id})" 
                        class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm font-semibold transition">
                    <i class="fas fa-history mr-1"></i>History
                </button>
            </td>
        </tr>
    `).join('');
}

// Update vendor summary cards
function updateVendorSummary(vendors) {
    const totalVendors = vendors.length;
    const totalPaid = vendors.reduce((sum, v) => sum + parseFloat(v.total_paid_amount || 0), 0);
    const totalOutstanding = vendors.reduce((sum, v) => sum + parseFloat(v.balance_amount || 0), 0);

    document.getElementById('totalVendors').textContent = totalVendors;
    document.getElementById('totalPaidToVendors').textContent = `Rs ${totalPaid.toFixed(2)}`;
    document.getElementById('totalOutstanding').textContent = `Rs ${totalOutstanding.toFixed(2)}`;
}

// View vendor history
window.viewVendorHistory = async function(vendorId) {
    try {
        const res = await fetch(`${API_BASE}/vendors/${vendorId}`, {
            credentials: 'include'
        });
        const data = await res.json();

        if (data.success) {
            const vendor = data.data.vendor;
            const history = data.data.supplyHistory;

            document.getElementById('vendorHistoryTitle').textContent = `${vendor.vendor_name} - Supply History`;

            let historyHtml = `
                <div class="mb-6 p-4 bg-indigo-50 rounded-lg">
                    <h3 class="font-bold text-gray-800 mb-2">Ledger Summary</h3>
                    <div class="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p class="text-sm text-gray-600">Total Ordered</p>
                            <p class="text-xl font-bold text-gray-900">Rs ${parseFloat(vendor.total_ordered_amount).toFixed(2)}</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">Total Paid</p>
                            <p class="text-xl font-bold text-green-700">Rs ${parseFloat(vendor.total_paid_amount).toFixed(2)}</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">Balance Due</p>
                            <p class="text-xl font-bold text-red-700">Rs ${parseFloat(vendor.balance_amount).toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            `;

            if (history.length === 0) {
                historyHtml += '<p class="text-center text-gray-500">No supply history yet</p>';
            } else {
                historyHtml += `
                    <table class="w-full">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="px-4 py-2 text-left text-xs font-semibold text-gray-600">Date</th>
                                <th class="px-4 py-2 text-left text-xs font-semibold text-gray-600">Medicine</th>
                                <th class="px-4 py-2 text-right text-xs font-semibold text-gray-600">Qty</th>
                                <th class="px-4 py-2 text-right text-xs font-semibold text-gray-600">Total Cost</th>
                                <th class="px-4 py-2 text-right text-xs font-semibold text-gray-600">Paid</th>
                                <th class="px-4 py-2 text-right text-xs font-semibold text-gray-600">Balance</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            ${history.map(h => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-4 py-2 text-sm text-gray-600">${new Date(h.supply_date).toLocaleDateString()}</td>
                                    <td class="px-4 py-2 text-sm text-gray-900">${h.medicine_name}</td>
                                    <td class="px-4 py-2 text-sm text-right font-mono">${h.quantity_added}</td>
                                    <td class="px-4 py-2 text-sm text-right font-mono text-gray-700">Rs ${parseFloat(h.total_cost).toFixed(2)}</td>
                                    <td class="px-4 py-2 text-sm text-right font-mono text-green-700">Rs ${parseFloat(h.amount_paid_this_batch).toFixed(2)}</td>
                                    <td class="px-4 py-2 text-sm text-right font-mono text-red-700">Rs ${parseFloat(h.balance_remaining).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }

            document.getElementById('vendorHistoryContent').innerHTML = historyHtml;
            document.getElementById('vendorHistoryModal').classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error fetching vendor history:', error);
        alert('Failed to load vendor history');
    }
};

// Modal controls
window.openAddVendorModal = function() {
    document.getElementById('addVendorModal').classList.remove('hidden');
};

window.closeAddVendorModal = function() {
    document.getElementById('addVendorModal').classList.add('hidden');
    document.getElementById('addVendorForm').reset();
};

window.closeVendorHistoryModal = function() {
    document.getElementById('vendorHistoryModal').classList.add('hidden');
};

// Add vendor form submission
document.addEventListener('DOMContentLoaded', () => {
    const addVendorForm = document.getElementById('addVendorForm');
    if (addVendorForm) {
        addVendorForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const vendorData = {
                vendor_name: document.getElementById('vendorName').value,
                contact_person: document.getElementById('vendorContactPerson').value,
                phone: document.getElementById('vendorPhone').value,
                email: document.getElementById('vendorEmail').value,
                address: document.getElementById('vendorAddress').value
            };

            try {
                const res = await fetch(`${API_BASE}/vendors`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    credentials: 'include',
                    body: JSON.stringify(vendorData)
                });

                const data = await res.json();

                if (data.success) {
                    alert('✅ Vendor added successfully!');
                    closeAddVendorModal();
                    fetchVendors();
                } else {
                    alert('❌ Error: ' + data.error);
                }
            } catch (error) {
                console.error('Error adding vendor:', error);
                alert('❌ Failed to add vendor');
            }
        });
    }
});

// ====================================
// INVENTORY TOGGLE STATUS FUNCTION
// ====================================

window.toggleMedicineStatus = async function(medicineId, currentStatus) {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this medicine?`)) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/inventory/toggle-status?id=${medicineId}`, {
            method: 'POST',
            credentials: 'include'
        });

        const data = await res.json();

        if (data.success) {
            alert(`✅ ${data.message}`);
            fetchInventoryLogData(); // Refresh inventory table
        } else {
            alert('❌ Error: ' + data.error);
        }
    } catch (error) {
        console.error('Error toggling status:', error);
        alert('❌ Failed to toggle medicine status');
    }
};
```

---

## PART 6: UPDATE TABS CONFIGURATION (Around line ~1190)

Add vendorsTab to the tabs object:

```javascript
const tabs = {
    dashboardTab: 'dashboardSection',
    medicinesTab: 'medicinesSection',
    billingTab: 'billingSection',
    analyticsTab: 'analyticsSection',
    suppliersTab: 'suppliersSection',
    vendorsTab: 'vendorsSection',  // ADD THIS LINE
    inventoryTab: 'inventorySection',
    alertsTab: 'alertsSection',
    settingsTab: 'settingsSection'
};
```

Add fetch call for vendors tab:

```javascript
if (tabId === 'vendorsTab') {
    console.log('💰 Loading vendors...');
    fetchVendors();
}
```

---

## PART 7: UPDATE INVENTORY TABLE RENDERING (Around line ~1370)

Modify `fetchInventoryLogData()` function to add Status column:

Find the row rendering code and add status toggle button before actions column:

```javascript
<td class="px-4 py-3 text-center">
    <button onclick="toggleMedicineStatus('${med.id}', ${med.is_live || true})"
            class="px-3 py-1 rounded-full text-xs font-semibold transition ${
                (med.is_live !== false) ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }">
        ${(med.is_live !== false) ? '✓ Live' : '○ Draft'}
    </button>
</td>
```

---

## PART 8: UPDATE BILLING TO USE LIVE MEDICINES ONLY (Around line ~2190)

Find `loadMedicinesForBilling()` function and update the endpoint:

```javascript
async function loadMedicinesForBilling() {
    try {
        // CHANGE THIS LINE - use live-medicines endpoint
        const res = await fetch(`${API_BASE}/inventory/live-medicines`, {
            credentials: 'include'
        });
        const data = await res.json();
        const medicines = data.success ? (data.data || data) : [];

        const medicineSelect = document.getElementById('medicineSelect');
        medicineSelect.innerHTML = '<option value="">-- Select a medicine --</option>';

        medicines.forEach(med => {
            if (med.stock_quantity > 0) { // Only in-stock medicines
                const option = document.createElement('option');
                option.value = med.id;
                option.textContent = `${med.brand_name} (${med.generic_name}) - Stock: ${med.stock_quantity} - Rs ${parseFloat(med.selling_price).toFixed(2)}`;
                option.dataset.medicine = JSON.stringify(med);
                medicineSelect.appendChild(option);
            }
        });
    } catch (err) {
        console.error('Error loading medicines for billing:', err);
    }
}
```

---

## TESTING CHECKLIST

After implementing all changes:

1. ✅ Restart server: `npm start`
2. ✅ Login as Admin
3. ✅ Check new "Vendors" tab appears
4. ✅ Go to Vendors tab - should show 3 pre-loaded vendors
5. ✅ Go to Inventory tab - should see Live/Draft toggle buttons
6. ✅ Click toggle button - medicine status should change
7. ✅ Go to Billing tab - should only show Live medicines
8. ✅ Test adding a new vendor
9. ✅ Test viewing vendor history

---

**NEXT STEP**: Apply these changes to your `public/index.html` file and test!

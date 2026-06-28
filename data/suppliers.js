// Mock Supplier Data for Demo
// Based on data-model.md Supplier schema

let suppliers = [
  {
    id: "SUP-001",
    name: "PharmaCorp International Ltd",
    contact_person: "John Supplier",
    phone: "+1-555-0100",
    email: "orders@pharmacorp.com",
    address: "123 Medical Drive, Pharmacy City, PC 12345",
    ledger_balance: 15000.00,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: new Date().toISOString()
  },
  {
    id: "SUP-002",
    name: "Global Medicines Supply Co",
    contact_person: "Sarah Chen",
    phone: "+1-555-0200",
    email: "contact@globalmeds.com",
    address: "456 Pharma Avenue, Medical District, MD 67890",
    ledger_balance: 8500.50,
    created_at: "2026-02-15T00:00:00.000Z",
    updated_at: new Date().toISOString()
  },
  {
    id: "SUP-003",
    name: "Healthcare Solutions Inc",
    contact_person: "Michael Roberts",
    phone: "+1-555-0300",
    email: "sales@healthcaresolutions.com",
    address: "789 Wellness Road, Health City, HC 13579",
    ledger_balance: -2000.00, // Negative = credit (supplier owes pharmacy)
    created_at: "2026-03-20T00:00:00.000Z",
    updated_at: new Date().toISOString()
  }
];

/**
 * Get all suppliers from the mock data store
 * @returns {Array} Array of supplier objects
 */
const getAllSuppliers = () => suppliers;

/**
 * Find a supplier by ID
 * @param {string} id - Supplier ID (e.g., SUP-001)
 * @returns {Object|undefined} Supplier object or undefined if not found
 */
const getSupplierById = (id) => suppliers.find(s => s.id === id);

/**
 * Add a new supplier to the mock data store
 * @param {Object} supplierData - Supplier data without timestamps
 * @returns {Object} The newly created supplier with timestamps
 */
const addSupplier = (supplierData) => {
  const newSupplier = {
    ...supplierData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  suppliers.push(newSupplier);
  return newSupplier;
};

/**
 * Update an existing supplier's information
 * @param {string} id - Supplier ID to update
 * @param {Object} updates - Fields to update
 * @returns {Object|null} Updated supplier or null if not found
 */
const updateSupplier = (id, updates) => {
  const index = suppliers.findIndex(s => s.id === id);
  if (index === -1) return null;

  suppliers[index] = {
    ...suppliers[index],
    ...updates,
    id: suppliers[index].id, // Preserve original ID
    created_at: suppliers[index].created_at, // Preserve creation date
    updated_at: new Date().toISOString()
  };
  return suppliers[index];
};

module.exports = {
  getAllSuppliers,
  getSupplierById,
  addSupplier,
  updateSupplier
};

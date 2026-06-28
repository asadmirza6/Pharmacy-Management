// Mock Medicine Data for Demo
// Based on database schema from data-model.md

const { randomUUID } = require('crypto');

let medicines = [
  {
    id: randomUUID(),
    brand_name: "Paracetamol 500mg Tablets",
    generic_name: "Acetaminophen",
    batch_number: "B2024-001",
    manufacturing_date: "2024-01-15",
    expiry_date: "2027-01-14",
    cost_price: 5.00,
    selling_price: 8.50,
    stock_quantity: 500,
    reorder_threshold: 50,
    supplier_id: "SUP-001",
    supplier_name: "PharmaCorp International Ltd",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: randomUUID(),
    brand_name: "Ibuprofen 400mg Tablets",
    generic_name: "Ibuprofen",
    batch_number: "B2024-002",
    manufacturing_date: "2024-02-20",
    expiry_date: "2027-02-19",
    cost_price: 6.50,
    selling_price: 10.00,
    stock_quantity: 300,
    reorder_threshold: 40,
    supplier_id: "SUP-001",
    supplier_name: "PharmaCorp International Ltd",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: randomUUID(),
    brand_name: "Amoxicillin 500mg Capsules",
    generic_name: "Amoxicillin",
    batch_number: "B2024-003",
    manufacturing_date: "2024-03-10",
    expiry_date: "2026-03-09",
    cost_price: 12.00,
    selling_price: 18.00,
    stock_quantity: 200,
    reorder_threshold: 30,
    supplier_id: "SUP-002",
    supplier_name: "Global Medicines Supply Co",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: randomUUID(),
    brand_name: "Vitamin C 1000mg Tablets",
    generic_name: "Ascorbic Acid",
    batch_number: "B2024-005",
    manufacturing_date: "2024-05-12",
    expiry_date: "2027-05-11",
    cost_price: 3.50,
    selling_price: 6.00,
    stock_quantity: 800,
    reorder_threshold: 100,
    supplier_id: "SUP-003",
    supplier_name: "Healthcare Solutions Inc",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: randomUUID(),
    brand_name: "Aspirin 100mg Tablets",
    generic_name: "Acetylsalicylic Acid",
    batch_number: "B2024-008",
    manufacturing_date: "2024-08-22",
    expiry_date: "2027-08-21",
    cost_price: 2.50,
    selling_price: 4.50,
    stock_quantity: 8,
    reorder_threshold: 10,
    supplier_id: "SUP-002",
    supplier_name: "Global Medicines Supply Co",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

module.exports = {
  getAllMedicines: () => medicines,
  getMedicineById: (id) => medicines.find(m => m.id === id),
  addMedicine: (medicineData) => {
    const newMedicine = {
      id: randomUUID(),
      ...medicineData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    medicines.push(newMedicine);
    return newMedicine;
  },
  updateMedicine: (id, updates) => {
    const index = medicines.findIndex(m => m.id === id);
    if (index === -1) return null;

    medicines[index] = {
      ...medicines[index],
      ...updates,
      id: medicines[index].id, // Preserve original ID
      created_at: medicines[index].created_at, // Preserve creation date
      updated_at: new Date().toISOString()
    };
    return medicines[index];
  },
  deleteMedicine: (id) => {
    const index = medicines.findIndex(m => m.id === id);
    if (index === -1) return false;
    medicines.splice(index, 1);
    return true;
  },
  searchMedicines: (query) => {
    if (!query) return medicines;

    const lowerQuery = query.toLowerCase();
    return medicines.filter(m =>
      m.brand_name.toLowerCase().includes(lowerQuery) ||
      m.generic_name.toLowerCase().includes(lowerQuery) ||
      m.batch_number.toLowerCase().includes(lowerQuery)
    );
  },
  getLowStockMedicines: () => {
    return medicines.filter(m => m.stock_quantity <= m.reorder_threshold);
  },

  // T003: Calculate days until expiry
  getDaysUntilExpiry: (expiryDateString) => {
    const expiry = new Date(expiryDateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  },

  // T004: Get medicines nearing expiry within threshold
  getNearExpiryMedicines: (threshold = 30) => {
    return medicines.filter(m => {
      const days = module.exports.getDaysUntilExpiry(m.expiry_date);
      return days > 0 && days <= threshold;
    }).map(m => ({
      ...m,
      days_until_expiry: module.exports.getDaysUntilExpiry(m.expiry_date),
      severity: module.exports.getSeverity(module.exports.getDaysUntilExpiry(m.expiry_date))
    }));
  },

  // T005: Calculate severity based on days until expiry
  getSeverity: (daysUntilExpiry) => {
    if (daysUntilExpiry <= 7) return 'critical';
    if (daysUntilExpiry <= 14) return 'high';
    if (daysUntilExpiry <= 30) return 'medium';
    return 'low';
  },

  // T006: Get inventory statistics
  getInventoryStatistics: () => {
    const all = medicines;
    return {
      total_products: all.length,
      total_items: all.reduce((sum, m) => sum + m.stock_quantity, 0),
      total_value: all.reduce((sum, m) => sum + (m.stock_quantity * m.cost_price), 0).toFixed(2),
      near_expiry_count: module.exports.getNearExpiryMedicines(30).length,
      low_stock_count: all.filter(m => m.stock_quantity <= m.reorder_threshold).length,
      computed_at: new Date().toISOString()
    };
  },

  // T007: Get all alerts (expiry + low stock)
  getAllAlerts: () => {
    const alerts = [];

    // Expiry alerts
    module.exports.getNearExpiryMedicines(30).forEach(med => {
      alerts.push({
        id: `expiry-${med.id}`,
        type: 'expiry',
        severity: med.severity,
        message: `${med.brand_name} expires in ${med.days_until_expiry} days (Batch: ${med.batch_number})`,
        timestamp: new Date().toISOString(),
        medicine_id: med.id,
        details: {
          days_until_expiry: med.days_until_expiry,
          batch_number: med.batch_number
        }
      });
    });

    // Low stock alerts
    module.exports.getLowStockMedicines().forEach(med => {
      const severity = med.stock_quantity === 0 ? 'high' : 'medium';
      alerts.push({
        id: `stock-${med.id}`,
        type: 'low_stock',
        severity: severity,
        message: `${med.brand_name} below reorder threshold (${med.stock_quantity} units remaining)`,
        timestamp: new Date().toISOString(),
        medicine_id: med.id,
        details: {
          current_stock: med.stock_quantity,
          reorder_threshold: med.reorder_threshold
        }
      });
    });

    // Sort by severity (critical → high → medium → low)
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }
};

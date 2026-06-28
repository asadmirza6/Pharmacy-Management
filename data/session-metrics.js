// In-memory session metrics tracker
// Tracks aggregate business metrics for the current server session

let sessionMetrics = null;

/**
 * Initialize session metrics
 * Called once on server startup
 */
function initialize() {
  sessionMetrics = {
    sessionStartTime: new Date(),
    totalRevenue: 0,
    transactionCount: 0,
    salesByMedicine: new Map()
  };
  console.log('Session metrics initialized at:', sessionMetrics.sessionStartTime);
}

/**
 * Record a transaction in session metrics
 * Called after successful invoice creation in billing checkout
 * @param {Object} invoice - Invoice object with total_amount and items array
 */
function recordTransaction(invoice) {
  if (!sessionMetrics) initialize();

  sessionMetrics.totalRevenue += invoice.total_amount;
  sessionMetrics.transactionCount += 1;

  invoice.items.forEach(item => {
    const existing = sessionMetrics.salesByMedicine.get(item.medicine_id);
    if (existing) {
      existing.quantitySold += item.quantity;
      existing.revenue += item.subtotal;
    } else {
      sessionMetrics.salesByMedicine.set(item.medicine_id, {
        medicineId: item.medicine_id,
        medicineName: item.medicine_name,
        quantitySold: item.quantity,
        revenue: item.subtotal
      });
    }
  });
}

/**
 * Get current session metrics
 * @returns {Object} Session metrics object
 */
function getMetrics() {
  if (!sessionMetrics) initialize();
  return sessionMetrics;
}

/**
 * Get top selling medicines ranked by quantity sold
 * @param {Number} limit - Maximum number of top sellers to return (default 10)
 * @returns {Array} Array of top seller objects
 */
function getTopSellers(limit = 10) {
  if (!sessionMetrics) initialize();
  const salesArray = Array.from(sessionMetrics.salesByMedicine.values());
  return salesArray
    .sort((a, b) => {
      // Primary: quantity sold (descending)
      if (b.quantitySold !== a.quantitySold) return b.quantitySold - a.quantitySold;
      // Secondary: revenue (descending)
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      // Tertiary: alphabetical by name
      return a.medicineName.localeCompare(b.medicineName);
    })
    .slice(0, limit);
}

/**
 * Reset session metrics (mainly for testing)
 */
function reset() {
  initialize();
}

module.exports = {
  initialize,
  recordTransaction,
  getMetrics,
  getTopSellers,
  reset
};

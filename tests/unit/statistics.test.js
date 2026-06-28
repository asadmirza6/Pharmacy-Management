// T034: Unit tests for statistics computation

const medicineData = require('../../data/medicines');

describe('Statistics Computation Functions', () => {
  describe('getInventoryStatistics', () => {
    test('should calculate correct inventory totals', () => {
      const stats = medicineData.getInventoryStatistics();

      expect(stats).toHaveProperty('total_products');
      expect(stats).toHaveProperty('total_items');
      expect(stats).toHaveProperty('total_value');
      expect(stats.total_products).toBeGreaterThan(0);
      expect(stats.total_items).toBeGreaterThan(0);
      expect(parseFloat(stats.total_value)).toBeGreaterThan(0);
    });

    test('should return computed timestamp', () => {
      const stats = medicineData.getInventoryStatistics();
      expect(stats.computed_at).toBeDefined();
      expect(new Date(stats.computed_at).toString()).not.toBe('Invalid Date');
    });
  });

  describe('getDaysUntilExpiry', () => {
    test('should calculate positive days for future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);
      const dateString = futureDate.toISOString().split('T')[0];

      const days = medicineData.getDaysUntilExpiry(dateString);
      expect(days).toBeGreaterThan(0);
      expect(days).toBeLessThanOrEqual(15);
    });

    test('should calculate negative days for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      const dateString = pastDate.toISOString().split('T')[0];

      const days = medicineData.getDaysUntilExpiry(dateString);
      expect(days).toBeLessThan(0);
    });
  });

  describe('getSeverity', () => {
    test('should return critical for 0-7 days', () => {
      expect(medicineData.getSeverity(1)).toBe('critical');
      expect(medicineData.getSeverity(7)).toBe('critical');
    });

    test('should return high for 8-14 days', () => {
      expect(medicineData.getSeverity(8)).toBe('high');
      expect(medicineData.getSeverity(14)).toBe('high');
    });

    test('should return medium for 15-30 days', () => {
      expect(medicineData.getSeverity(15)).toBe('medium');
      expect(medicineData.getSeverity(30)).toBe('medium');
    });

    test('should return low for 31+ days', () => {
      expect(medicineData.getSeverity(31)).toBe('low');
      expect(medicineData.getSeverity(100)).toBe('low');
    });
  });

  describe('getNearExpiryMedicines', () => {
    test('should filter medicines within threshold', () => {
      const nearExpiry = medicineData.getNearExpiryMedicines(365);
      nearExpiry.forEach(med => {
        expect(med.days_until_expiry).toBeGreaterThan(0);
        expect(med.days_until_expiry).toBeLessThanOrEqual(365);
      });
    });

    test('should include severity in results', () => {
      const nearExpiry = medicineData.getNearExpiryMedicines(30);
      nearExpiry.forEach(med => {
        expect(med).toHaveProperty('severity');
        expect(['critical', 'high', 'medium', 'low']).toContain(med.severity);
      });
    });
  });

  describe('getAllAlerts', () => {
    test('should aggregate expiry and low stock alerts', () => {
      const alerts = medicineData.getAllAlerts();
      expect(Array.isArray(alerts)).toBe(true);

      const types = [...new Set(alerts.map(a => a.type))];
      expect(types.length).toBeGreaterThan(0);
    });

    test('should sort alerts by severity', () => {
      const alerts = medicineData.getAllAlerts();
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

      for (let i = 0; i < alerts.length - 1; i++) {
        const currentOrder = severityOrder[alerts[i].severity];
        const nextOrder = severityOrder[alerts[i + 1].severity];
        expect(currentOrder).toBeLessThanOrEqual(nextOrder);
      }
    });
  });
});

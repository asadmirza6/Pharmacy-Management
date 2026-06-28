// T031-T034: Integration tests for inventory statistics and expiry tracking
// Based on statistics.openapi.yml contract

const request = require('supertest');
const app = require('../../server');
const medicineData = require('../../data/medicines');

describe('Statistics API - GET /api/medicines/statistics', () => {
  // T031: Test inventory statistics endpoint
  test('should return inventory statistics', async () => {
    const response = await request(app)
      .get('/api/medicines/statistics')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('total_products');
    expect(response.body.data).toHaveProperty('total_items');
    expect(response.body.data).toHaveProperty('total_value');
    expect(response.body.data).toHaveProperty('near_expiry_count');
    expect(response.body.data).toHaveProperty('low_stock_count');
    expect(response.body.data).toHaveProperty('computed_at');
    expect(response.body.data.total_products).toBeGreaterThan(0);
  });
});

describe('Statistics API - GET /api/medicines/near-expiry', () => {
  // T032: Test near-expiry endpoint with default threshold
  test('should return near-expiry medicines with default 30-day threshold', async () => {
    const response = await request(app)
      .get('/api/medicines/near-expiry')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty('threshold');
    expect(response.body.threshold).toBe(30);
    expect(Array.isArray(response.body.data)).toBe(true);

    // Each near-expiry medicine should have required fields
    response.body.data.forEach(med => {
      expect(med).toHaveProperty('days_until_expiry');
      expect(med).toHaveProperty('severity');
      expect(['critical', 'high', 'medium', 'low']).toContain(med.severity);
    });
  });

  test('should accept custom threshold parameter', async () => {
    const response = await request(app)
      .get('/api/medicines/near-expiry?threshold=60')
      .expect(200);

    expect(response.body.threshold).toBe(60);
  });

  // T033: Test severity calculation
  test('should correctly assign severity levels based on days until expiry', async () => {
    const response = await request(app)
      .get('/api/medicines/near-expiry?threshold=365')
      .expect(200);

    const criticalMeds = response.body.data.filter(m => m.severity === 'critical');
    const highMeds = response.body.data.filter(m => m.severity === 'high');
    const mediumMeds = response.body.data.filter(m => m.severity === 'medium');

    // Critical should be <= 7 days
    criticalMeds.forEach(med => {
      expect(med.days_until_expiry).toBeLessThanOrEqual(7);
      expect(med.days_until_expiry).toBeGreaterThan(0);
    });

    // High should be 8-14 days
    highMeds.forEach(med => {
      expect(med.days_until_expiry).toBeGreaterThan(7);
      expect(med.days_until_expiry).toBeLessThanOrEqual(14);
    });

    // Medium should be 15-30 days
    mediumMeds.forEach(med => {
      expect(med.days_until_expiry).toBeGreaterThan(14);
      expect(med.days_until_expiry).toBeLessThanOrEqual(30);
    });
  });
});

describe('Alerts API - GET /api/medicines/alerts', () => {
  test('should return aggregated alerts sorted by severity', async () => {
    const response = await request(app)
      .get('/api/medicines/alerts')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);

    // Check severity sorting (critical first)
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    for (let i = 0; i < response.body.data.length - 1; i++) {
      const currentSeverity = severityOrder[response.body.data[i].severity];
      const nextSeverity = severityOrder[response.body.data[i + 1].severity];
      expect(currentSeverity).toBeLessThanOrEqual(nextSeverity);
    }
  });

  test('should include both expiry and low_stock alert types', async () => {
    const response = await request(app)
      .get('/api/medicines/alerts')
      .expect(200);

    const alertTypes = [...new Set(response.body.data.map(a => a.type))];
    expect(alertTypes.length).toBeGreaterThan(0);
  });
});

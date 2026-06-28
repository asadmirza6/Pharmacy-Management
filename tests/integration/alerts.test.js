// T056-T059: Integration tests for alerts API
// Tests for GET /api/medicines/alerts endpoint

const request = require('supertest');
const app = require('../../server');

describe('Alerts API - GET /api/medicines/alerts', () => {
  // T056: Test get all alerts
  test('should return all alerts sorted by severity', async () => {
    const response = await request(app)
      .get('/api/medicines/alerts')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty('count');
    expect(Array.isArray(response.body.data)).toBe(true);

    // Verify alerts are sorted by severity (critical -> high -> medium -> low)
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    for (let i = 0; i < response.body.data.length - 1; i++) {
      const currentSeverity = severityOrder[response.body.data[i].severity];
      const nextSeverity = severityOrder[response.body.data[i + 1].severity];
      expect(currentSeverity).toBeLessThanOrEqual(nextSeverity);
    }

    // Verify alert structure
    response.body.data.forEach(alert => {
      expect(alert).toHaveProperty('id');
      expect(alert).toHaveProperty('type');
      expect(alert).toHaveProperty('severity');
      expect(alert).toHaveProperty('message');
      expect(alert).toHaveProperty('timestamp');
      expect(['expiry', 'low_stock']).toContain(alert.type);
      expect(['critical', 'high', 'medium', 'low']).toContain(alert.severity);
    });
  });

  // T057: Test alert type filtering
  test('should filter alerts by type=expiry', async () => {
    const response = await request(app)
      .get('/api/medicines/alerts?type=expiry')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);

    // All returned alerts should be expiry type
    response.body.data.forEach(alert => {
      expect(alert.type).toBe('expiry');
    });
  });

  test('should filter alerts by type=low_stock', async () => {
    const response = await request(app)
      .get('/api/medicines/alerts?type=low_stock')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);

    // All returned alerts should be low_stock type
    response.body.data.forEach(alert => {
      expect(alert.type).toBe('low_stock');
    });
  });

  // T058: Test alert severity filtering
  test('should filter alerts by severity=critical', async () => {
    const response = await request(app)
      .get('/api/medicines/alerts?severity=critical')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);

    // All returned alerts should be critical severity or higher priority
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    response.body.data.forEach(alert => {
      expect(severityOrder[alert.severity]).toBeLessThanOrEqual(severityOrder['critical']);
    });
  });

  test('should filter alerts by severity=high', async () => {
    const response = await request(app)
      .get('/api/medicines/alerts?severity=high')
      .expect(200);

    expect(response.body.success).toBe(true);

    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    response.body.data.forEach(alert => {
      expect(severityOrder[alert.severity]).toBeLessThanOrEqual(severityOrder['high']);
    });
  });

  test('should filter alerts by severity=medium', async () => {
    const response = await request(app)
      .get('/api/medicines/alerts?severity=medium')
      .expect(200);

    expect(response.body.success).toBe(true);

    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    response.body.data.forEach(alert => {
      expect(severityOrder[alert.severity]).toBeLessThanOrEqual(severityOrder['medium']);
    });
  });

  // T059: Test combined filtering
  test('should filter alerts by both type and severity', async () => {
    const response = await request(app)
      .get('/api/medicines/alerts?type=expiry&severity=high')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);

    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    response.body.data.forEach(alert => {
      expect(alert.type).toBe('expiry');
      expect(severityOrder[alert.severity]).toBeLessThanOrEqual(severityOrder['high']);
    });
  });

  // T059: Test sorting verification
  test('should maintain severity sorting after filtering', async () => {
    const response = await request(app)
      .get('/api/medicines/alerts?type=expiry')
      .expect(200);

    expect(response.body.success).toBe(true);

    // Verify sorting is maintained
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    for (let i = 0; i < response.body.data.length - 1; i++) {
      const currentSeverity = severityOrder[response.body.data[i].severity];
      const nextSeverity = severityOrder[response.body.data[i + 1].severity];
      expect(currentSeverity).toBeLessThanOrEqual(nextSeverity);
    }
  });
});

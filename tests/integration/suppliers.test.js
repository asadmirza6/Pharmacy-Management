// T042-T044: Supplier API integration tests

const request = require('supertest');
const app = require('../../server');

describe('Suppliers API - GET /api/suppliers', () => {
  // T042: Test get all suppliers
  test('should return all suppliers', async () => {
    const response = await request(app)
      .get('/api/suppliers')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty('count');
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.count).toBeGreaterThan(0);

    // Verify supplier structure
    response.body.data.forEach(supplier => {
      expect(supplier).toHaveProperty('id');
      expect(supplier).toHaveProperty('name');
      expect(supplier).toHaveProperty('ledger_balance');
    });
  });
});

describe('Suppliers API - GET /api/suppliers/:id', () => {
  // T043: Test get supplier by ID
  test('should return supplier by ID', async () => {
    const response = await request(app)
      .get('/api/suppliers/SUP-001')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe('SUP-001');
    expect(response.body.data).toHaveProperty('name');
  });

  // T044: Test 404 for non-existent supplier
  test('should return 404 for non-existent supplier', async () => {
    const response = await request(app)
      .get('/api/suppliers/SUP-999')
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('not found');
  });
});

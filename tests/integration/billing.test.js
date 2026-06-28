// T011-T014: Integration tests for billing API
// Based on billing.openapi.yml contract

const request = require('supertest');
const app = require('../../server');
const medicineData = require('../../data/medicines');
const invoiceData = require('../../data/invoices');

describe('Billing API - POST /api/billing/checkout', () => {
  // T012: Successful checkout with 2 items
  test('should process checkout with 2 items and return invoice', async () => {
    const medicines = medicineData.getAllMedicines();
    const med1 = medicines[0];
    const med2 = medicines[1];

    const checkoutRequest = {
      items: [
        { medicine_id: med1.id, quantity: 2 },
        { medicine_id: med2.id, quantity: 1 }
      ],
      customer_name: 'Test Customer',
      payment_method: 'cash'
    };

    const response = await request(app)
      .post('/api/billing/checkout')
      .send(checkoutRequest)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('Sale completed');
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data).toHaveProperty('invoice_number');
    expect(response.body.data.items).toHaveLength(2);
    expect(response.body.data.payment_status).toBe('completed');
    expect(response.body.data.total_amount).toBeGreaterThan(0);

    // Verify inventory was deducted
    const updatedMed1 = medicineData.getMedicineById(med1.id);
    expect(updatedMed1.stock_quantity).toBe(med1.stock_quantity - 2);
  });

  // T013: Insufficient stock validation
  test('should reject checkout when stock is insufficient', async () => {
    const medicines = medicineData.getAllMedicines();
    const lowStockMed = medicines.find(m => m.stock_quantity < 10);

    const checkoutRequest = {
      items: [
        { medicine_id: lowStockMed.id, quantity: 999 }
      ]
    };

    const response = await request(app)
      .post('/api/billing/checkout')
      .send(checkoutRequest)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Insufficient stock');
  });

  // T014: Invoice number generation
  test('should generate sequential invoice numbers', async () => {
    const medicines = medicineData.getAllMedicines();
    const med = medicines[0];

    const checkoutRequest = {
      items: [{ medicine_id: med.id, quantity: 1 }]
    };

    const response1 = await request(app)
      .post('/api/billing/checkout')
      .send(checkoutRequest)
      .expect(201);

    const response2 = await request(app)
      .post('/api/billing/checkout')
      .send(checkoutRequest)
      .expect(201);

    expect(response1.body.data.invoice_number).toMatch(/^INV-\d{4}-\d{4}$/);
    expect(response2.body.data.invoice_number).toMatch(/^INV-\d{4}-\d{4}$/);
    expect(response1.body.data.invoice_number).not.toBe(response2.body.data.invoice_number);
  });
});

describe('Billing API - GET /api/billing/invoices', () => {
  test('should retrieve all invoices', async () => {
    const response = await request(app)
      .get('/api/billing/invoices')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty('count');
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('should filter invoices by status', async () => {
    const response = await request(app)
      .get('/api/billing/invoices?status=completed')
      .expect(200);

    expect(response.body.success).toBe(true);
    response.body.data.forEach(invoice => {
      expect(invoice.payment_status).toBe('completed');
    });
  });
});

describe('Billing API - GET /api/billing/invoices/:id', () => {
  test('should retrieve invoice by ID', async () => {
    const invoices = invoiceData.getAllInvoices();
    if (invoices.length === 0) {
      // Skip if no invoices exist yet
      return;
    }

    const invoiceId = invoices[0].id;
    const response = await request(app)
      .get(`/api/billing/invoices/${invoiceId}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(invoiceId);
  });

  test('should return 404 for non-existent invoice', async () => {
    const response = await request(app)
      .get('/api/billing/invoices/non-existent-id')
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('not found');
  });
});

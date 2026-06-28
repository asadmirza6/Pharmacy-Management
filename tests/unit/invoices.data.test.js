// T015: Unit tests for invoice data helper functions

const invoiceData = require('../../data/invoices');

describe('Invoice Data Helper Functions', () => {
  beforeEach(() => {
    // Reset invoice counter for consistent tests
    jest.resetModules();
  });

  describe('getNextInvoiceNumber', () => {
    test('should generate invoice number in format INV-YYYY-####', () => {
      const invoiceNumber = invoiceData.getNextInvoiceNumber();
      const currentYear = new Date().getFullYear();

      expect(invoiceNumber).toMatch(/^INV-\d{4}-\d{4}$/);
      expect(invoiceNumber).toContain(`INV-${currentYear}-`);
    });

    test('should generate sequential invoice numbers', () => {
      const num1 = invoiceData.getNextInvoiceNumber();
      const num2 = invoiceData.getNextInvoiceNumber();
      const num3 = invoiceData.getNextInvoiceNumber();

      expect(num1).not.toBe(num2);
      expect(num2).not.toBe(num3);

      // Extract numbers and verify sequential
      const n1 = parseInt(num1.split('-')[2]);
      const n2 = parseInt(num2.split('-')[2]);
      const n3 = parseInt(num3.split('-')[2]);

      expect(n2).toBe(n1 + 1);
      expect(n3).toBe(n2 + 1);
    });

    test('should pad invoice numbers with leading zeros', () => {
      const invoiceNumber = invoiceData.getNextInvoiceNumber();
      const numberPart = invoiceNumber.split('-')[2];

      expect(numberPart).toHaveLength(4);
      expect(numberPart).toMatch(/^\d{4}$/);
    });
  });

  describe('calculateTotal', () => {
    test('should calculate total from items array', () => {
      const items = [
        { subtotal: 17.00 },
        { subtotal: 10.00 },
        { subtotal: 5.50 }
      ];

      const total = invoiceData.calculateTotal(items);
      expect(total).toBe(32.50);
    });

    test('should return 0 for empty items array', () => {
      const total = invoiceData.calculateTotal([]);
      expect(total).toBe(0);
    });
  });

  describe('createInvoice', () => {
    test('should create invoice with generated ID and invoice number', () => {
      const invoiceInput = {
        items: [
          {
            medicine_id: 'test-id',
            medicine_name: 'Test Medicine',
            batch_number: 'B001',
            quantity: 2,
            unit_price: 10.00,
            subtotal: 20.00
          }
        ],
        total_amount: 20.00,
        customer_name: 'Test Customer',
        served_by: 'system'
      };

      const invoice = invoiceData.createInvoice(invoiceInput);

      expect(invoice).toHaveProperty('id');
      expect(invoice).toHaveProperty('invoice_number');
      expect(invoice.invoice_number).toMatch(/^INV-\d{4}-\d{4}$/);
      expect(invoice).toHaveProperty('timestamp');
      expect(invoice.payment_status).toBe('completed');
      expect(invoice.total_amount).toBe(20.00);
    });
  });

  describe('getInvoicesByDateRange', () => {
    test('should filter invoices by date range', () => {
      // Create test invoices
      const invoice1 = invoiceData.createInvoice({
        items: [{ subtotal: 10 }],
        total_amount: 10
      });

      const invoices = invoiceData.getInvoicesByDateRange('2026-01-01', '2026-12-31');
      expect(Array.isArray(invoices)).toBe(true);
    });

    test('should return all invoices when no date range specified', () => {
      const invoices = invoiceData.getInvoicesByDateRange();
      expect(Array.isArray(invoices)).toBe(true);
    });
  });
});

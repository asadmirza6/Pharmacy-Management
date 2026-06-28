// Mock Invoice Data for Demo
// Based on data-model.md Invoice schema

const { randomUUID } = require('crypto');

let invoices = [];
let invoiceCounter = 1; // Sequential counter for invoice numbers

// T010: Generate next invoice number in format INV-YYYY-####
const getNextInvoiceNumber = () => {
  const year = new Date().getFullYear();
  const paddedNumber = String(invoiceCounter).padStart(4, '0');
  invoiceCounter++;
  return `INV-${year}-${paddedNumber}`;
};

module.exports = {
  // T010: Export getNextInvoiceNumber
  getNextInvoiceNumber,

  getAllInvoices: () => invoices,

  getInvoiceById: (id) => invoices.find(inv => inv.id === id),

  getInvoicesByDateRange: (fromDate, toDate) => {
    if (!fromDate && !toDate) return invoices;

    return invoices.filter(inv => {
      const invDate = new Date(inv.timestamp);
      const from = fromDate ? new Date(fromDate) : new Date('1970-01-01');
      const to = toDate ? new Date(toDate) : new Date('2100-12-31');
      return invDate >= from && invDate <= to;
    });
  },

  getInvoicesByStatus: (status) => {
    return invoices.filter(inv => inv.payment_status === status);
  },

  createInvoice: (invoiceData) => {
    const newInvoice = {
      id: randomUUID(),
      invoice_number: getNextInvoiceNumber(),
      timestamp: new Date().toISOString(),
      ...invoiceData,
      payment_status: invoiceData.payment_status || 'completed'
    };

    invoices.push(newInvoice);
    return newInvoice;
  },

  // Helper function to calculate total from items
  calculateTotal: (items) => {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  }
};

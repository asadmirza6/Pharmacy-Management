-- Pharmacy Management System Database Schema
-- Neon PostgreSQL Database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS medicines CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS patients CASCADE;

-- Suppliers Table
CREATE TABLE suppliers (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    ledger_balance DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Medicines Table
CREATE TABLE medicines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255) NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    manufacturing_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    cost_price DECIMAL(10, 2) NOT NULL,
    selling_price DECIMAL(10, 2) NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    reorder_threshold INTEGER NOT NULL DEFAULT 10,
    supplier_id VARCHAR(20) NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT
);

-- Patients Table
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    contact_number VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices Table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(255) DEFAULT 'Walk-in Customer',
    customer_phone VARCHAR(50),
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cash',
    payment_status VARCHAR(50) DEFAULT 'completed',
    served_by VARCHAR(100),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoice Items Table
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL,
    medicine_id UUID NOT NULL,
    medicine_name VARCHAR(255) NOT NULL,
    batch_number VARCHAR(100),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE RESTRICT
);

-- Create Indexes for Performance
CREATE INDEX idx_medicines_supplier ON medicines(supplier_id);
CREATE INDEX idx_medicines_expiry ON medicines(expiry_date);
CREATE INDEX idx_medicines_stock ON medicines(stock_quantity);
CREATE INDEX idx_medicines_brand ON medicines(brand_name);
CREATE INDEX idx_invoices_timestamp ON invoices(timestamp);
CREATE INDEX idx_invoices_customer ON invoices(customer_name);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_medicine ON invoice_items(medicine_id);

-- Insert Sample Suppliers
INSERT INTO suppliers (id, name, contact_person, phone, email, address, ledger_balance) VALUES
('SUP-001', 'PharmaCorp International Ltd', 'John Supplier', '+1-555-0100', 'orders@pharmacorp.com', '123 Medical Drive, Pharmacy City, PC 12345', 0.00),
('SUP-002', 'Global Medicines Supply Co', 'Sarah Chen', '+1-555-0200', 'contact@globalmeds.com', '456 Pharma Avenue, Medical District, MD 67890', 0.00),
('SUP-003', 'Healthcare Solutions Inc', 'Michael Roberts', '+1-555-0300', 'sales@healthcaresolutions.com', '789 Wellness Road, Health City, HC 13579', 0.00);

-- Insert Sample Medicines
INSERT INTO medicines (brand_name, generic_name, batch_number, manufacturing_date, expiry_date, cost_price, selling_price, stock_quantity, reorder_threshold, supplier_id, supplier_name) VALUES
('Paracetamol 500mg', 'Acetaminophen', 'B2024-001', '2024-01-15', '2027-01-14', 5.00, 8.50, 500, 50, 'SUP-001', 'PharmaCorp International Ltd'),
('Amoxicillin 250mg', 'Amoxicillin', 'B2024-002', '2024-02-20', '2026-02-19', 12.00, 18.00, 300, 30, 'SUP-002', 'Global Medicines Supply Co'),
('Ibuprofen 400mg', 'Ibuprofen', 'B2024-003', '2024-03-10', '2027-03-09', 8.00, 12.50, 400, 40, 'SUP-001', 'PharmaCorp International Ltd'),
('Cetirizine 10mg', 'Cetirizine HCl', 'B2024-004', '2024-01-25', '2026-01-24', 6.50, 10.00, 250, 25, 'SUP-003', 'Healthcare Solutions Inc'),
('Omeprazole 20mg', 'Omeprazole', 'B2024-005', '2024-04-05', '2027-04-04', 15.00, 22.00, 200, 20, 'SUP-002', 'Global Medicines Supply Co');

-- Insert Sample Patients
INSERT INTO patients (full_name, contact_number, email, address) VALUES
('John Doe', '+1-555-1001', 'john.doe@example.com', '123 Main Street, Anytown, AT 12345'),
('Jane Smith', '+1-555-1002', 'jane.smith@example.com', '456 Oak Avenue, Springfield, SF 67890'),
('Robert Johnson', '+1-555-1003', 'robert.j@example.com', '789 Pine Road, Riverside, RS 13579');

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for auto-updating timestamps
CREATE TRIGGER update_medicines_updated_at BEFORE UPDATE ON medicines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

# 💊 Pharmacy Management System

A comprehensive, modern pharmacy management system built with Node.js, Express, and PostgreSQL (Neon). Features full inventory management, POS billing, supplier tracking, and analytics.

## 🌟 Features

### Core Functionality
- **📊 Dashboard** - Real-time metrics and analytics
- **💊 Medicine Inventory** - Complete stock management with expiry tracking
- **🏥 Patient Records** - Customer database management
- **💰 POS Billing** - Quick add-to-cart with checkout verification
- **🚚 Supplier Management** - Add suppliers and track ledgers
- **📦 Inventory Management** - Add new medicines or stock to existing ones
- **📈 Analytics & Reports** - Transaction history and insights
- **🔔 Smart Alerts** - Low stock and expiry warnings

### Technical Features
- ✅ **Fully Responsive** - Mobile, tablet, and desktop optimized
- ✅ **PostgreSQL Database** - Robust data persistence with Neon
- ✅ **Real-time Updates** - Live cart and metrics updates
- ✅ **Professional UI** - Modern Tailwind CSS design
- ✅ **Production Ready** - Deployed on Render with Neon DB

## 🚀 Quick Start

### Prerequisites
- Node.js 14+ 
- PostgreSQL database (Neon recommended)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/pharmacy-management-system.git
cd pharmacy-management-system
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. **Setup database**
```bash
node setup-database.js
```

5. **Start the server**
```bash
npm start
```

6. **Visit the application**
```
http://localhost:3000
```

## 🗄️ Database Schema

- **suppliers** - Supplier information and ledger balances
- **medicines** - Medicine inventory with batch tracking
- **patients** - Customer records
- **invoices** - Sales transactions
- **invoice_items** - Line items for each invoice

## 📱 User Guide

### Inventory Management Workflow

**Option 1: Add Stock to Existing Medicine**
1. Go to **Inventory Management** tab
2. Select medicine from dropdown
3. Select supplier
4. Enter quantity and cost price
5. Submit to update stock

**Option 2: Add New Medicine**
1. Go to **Inventory Management** tab
2. Click **"Add New Medicine"** tab
3. Fill in all medicine details
4. Select supplier
5. Submit to add to inventory

### POS Workflow

1. Browse medicines in **Medicines** tab
2. Click **"Add"** button on any medicine
3. Cart badge updates automatically
4. Click cart badge to go to **Billing Counter**
5. Review cart items
6. Click **"Process Checkout"**
7. Verification modal appears with customer form
8. Enter customer details
9. Review itemized bill
10. Click **"Verify & Checkout"** to complete

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (Neon)
- **Frontend**: Vanilla JavaScript, Tailwind CSS
- **Icons**: Font Awesome
- **Deployment**: Render

## 📂 Project Structure

```
pharmacy-management-system/
├── data/               # In-memory data (legacy)
├── database/           # SQL schemas
├── middleware/         # Express middleware
├── public/             # Frontend files
│   └── index.html     # Main application
├── routes/             # API routes
│   ├── medicines.js
│   ├── suppliers.js
│   ├── patients.js
│   ├── billing.js
│   └── analytics.js
├── services/           # Database connection
├── .env               # Environment variables (not in git)
├── server.js          # Express server
└── package.json       # Dependencies
```

## 🌐 API Endpoints

### Medicines
- `GET /api/medicines` - List all medicines
- `POST /api/medicines` - Add new medicine
- `PUT /api/medicines/:id` - Update medicine
- `GET /api/medicines/statistics` - Inventory stats

### Suppliers
- `GET /api/suppliers` - List all suppliers
- `POST /api/suppliers` - Add new supplier
- `POST /api/suppliers/:id/purchase` - Add stock

### Billing
- `POST /api/billing/checkout` - Process sale
- `GET /api/billing/invoices` - Invoice history

### Analytics
- `GET /api/analytics/dashboard` - Dashboard metrics
- `GET /api/analytics/summary` - Detailed analytics

## 🔐 Environment Variables

```env
DATABASE_URL=postgresql://...
PORT=3000
NODE_ENV=production
SESSION_SECRET=your_secret_key
```

## 🚢 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment guide to Render with Neon DB.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this project for your needs.

## 👨‍💻 Author

Built with ❤️ for modern pharmacy management

## 🙏 Acknowledgments

- Tailwind CSS for beautiful styling
- Neon for serverless PostgreSQL
- Render for easy deployment
- Font Awesome for icons

---

**Status**: ✅ Production Ready | 🚀 Deployed on Render | 💾 Neon PostgreSQL

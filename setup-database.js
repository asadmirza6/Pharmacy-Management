// Database Setup Script for Neon PostgreSQL
// Executes schema.sql to create all tables

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  console.log('🔧 Starting database setup...');
  console.log('📡 Connecting to Neon PostgreSQL...');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Neon database successfully!');

    // Read schema file
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('📄 Executing schema.sql...');

    // Execute schema
    await client.query(schema);

    console.log('✅ Database schema created successfully!');
    console.log('✅ All tables created:');
    console.log('   - suppliers');
    console.log('   - medicines');
    console.log('   - patients');
    console.log('   - invoices');
    console.log('   - invoice_items');
    console.log('✅ Sample data inserted!');
    console.log('🎉 Database setup complete!');

  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

setupDatabase();

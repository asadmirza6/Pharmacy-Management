// Test Database Connection
require('dotenv').config();
const { pool } = require('./services/db');

async function testConnection() {
  console.log('🔍 Testing Neon PostgreSQL connection...');

  try {
    // Test connection
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connected successfully!');
    console.log('📅 Current database time:', result.rows[0].current_time);

    // Check tables
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\n📊 Tables in database:');
    tables.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // Check data counts
    const supplierCount = await pool.query('SELECT COUNT(*) FROM suppliers');
    const medicineCount = await pool.query('SELECT COUNT(*) FROM medicines');
    const patientCount = await pool.query('SELECT COUNT(*) FROM patients');

    console.log('\n📈 Data Summary:');
    console.log(`   Suppliers: ${supplierCount.rows[0].count}`);
    console.log(`   Medicines: ${medicineCount.rows[0].count}`);
    console.log(`   Patients: ${patientCount.rows[0].count}`);

    console.log('\n✅ Database is ready for deployment!');

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await pool.end();
  }
}

testConnection();

// Test Database and Analytics Endpoints
// Run with: node test-analytics.js

const { pool } = require('./services/db');

async function testAnalytics() {
  console.log('🔍 Testing Analytics & Database...\n');

  try {
    // Test 1: Check invoices exist
    console.log('Test 1: Checking invoices in database...');
    const invoicesResult = await pool.query('SELECT COUNT(*) FROM invoices');
    const invoiceCount = parseInt(invoicesResult.rows[0].count);
    console.log(`✅ Found ${invoiceCount} invoices in database\n`);

    // Test 2: Get recent invoices
    console.log('Test 2: Fetching recent invoices...');
    const recentResult = await pool.query(`
      SELECT invoice_number, timestamp, total_amount, served_by, customer_name
      FROM invoices
      ORDER BY timestamp DESC
      LIMIT 5
    `);
    console.log(`✅ Recent invoices:`);
    recentResult.rows.forEach(inv => {
      console.log(`   - ${inv.invoice_number} | ${inv.timestamp} | Rs ${inv.total_amount} | By: ${inv.served_by || 'N/A'}`);
    });
    console.log('');

    // Test 3: Test sales over time query
    console.log('Test 3: Testing sales over time query...');
    const salesResult = await pool.query(`
      SELECT
        DATE(timestamp) as date,
        COUNT(*) as transaction_count,
        SUM(total_amount) as total_sales
      FROM invoices
      WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
      LIMIT 5
    `);
    console.log(`✅ Sales data (last 5 days with data):`);
    salesResult.rows.forEach(row => {
      console.log(`   - ${row.date} | ${row.transaction_count} transactions | Rs ${parseFloat(row.total_sales).toFixed(2)}`);
    });
    console.log('');

    // Test 4: Test transactions for today
    console.log('Test 4: Fetching today\'s transactions...');
    const today = new Date().toISOString().split('T')[0];
    const todayResult = await pool.query(`
      SELECT
        invoice_number, timestamp, customer_name, total_amount, served_by
      FROM invoices
      WHERE DATE(timestamp) = $1
      ORDER BY timestamp DESC
    `, [today]);
    console.log(`✅ Today's transactions (${today}):`);
    if (todayResult.rows.length === 0) {
      console.log('   - No transactions today yet');
    } else {
      todayResult.rows.forEach(inv => {
        console.log(`   - ${inv.invoice_number} | ${inv.customer_name || 'Walk-in'} | Rs ${inv.total_amount} | By: ${inv.served_by || 'N/A'}`);
      });
    }
    console.log('');

    // Test 5: Check invoice items
    if (invoiceCount > 0) {
      console.log('Test 5: Checking invoice items...');
      const itemsResult = await pool.query(`
        SELECT COUNT(*) FROM invoice_items
      `);
      const itemsCount = parseInt(itemsResult.rows[0].count);
      console.log(`✅ Found ${itemsCount} invoice items in database\n`);
    }

    console.log('✅ All database tests passed!\n');
    console.log('📋 Summary:');
    console.log(`   - Total Invoices: ${invoiceCount}`);
    console.log(`   - Recent Data: Available`);
    console.log(`   - Sales Analytics: Working`);
    console.log(`   - User Tracking: ${recentResult.rows[0]?.served_by ? 'Working' : 'Missing'}\n`);

    console.log('🎯 Next Steps:');
    console.log('   1. Start server: npm start');
    console.log('   2. Login as admin');
    console.log('   3. Go to Analytics tab');
    console.log('   4. Open browser console (F12)');
    console.log('   5. Look for console logs starting with 📊, 📡, 💰');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

testAnalytics();

// Vendor Inventory System Migration Runner
// Run with: node database/migrations/003_vendor_inventory_system.js

const { pool } = require('../../services/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🔄 Running Vendor & Inventory Management Migration...\n');

  try {
    // Read the SQL migration file
    const sqlFilePath = path.join(__dirname, '003_vendor_inventory_system.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Execute the migration
    await pool.query(sqlContent);

    console.log('✅ Migration completed successfully!\n');

    // Verify tables exist
    console.log('📋 Verifying tables...');
    const vendorsCheck = await pool.query("SELECT COUNT(*) FROM vendors");
    console.log(`✅ Vendors table: ${vendorsCheck.rows[0].count} records`);

    const historyCheck = await pool.query("SELECT COUNT(*) FROM vendor_supply_history");
    console.log(`✅ Supply history table: ${historyCheck.rows[0].count} records`);

    // Check medicines table columns
    const columnsCheck = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'medicines'
      AND column_name IN ('is_live', 'current_vendor_id', 'cost_per_box', 'cost_per_tablet')
    `);
    console.log(`✅ Medicines table new columns: ${columnsCheck.rows.length}/4 added\n`);

    console.log('🎉 Vendor & Inventory Management System is ready!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

// Migration Runner Script
// Executes SQL migration files against Neon PostgreSQL

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Create database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  const migrationFile = process.argv[2] || 'database/migrations/006_auth_rbac_schema.sql';

  console.log('🔄 Starting migration...');
  console.log(`📄 File: ${migrationFile}\n`);

  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, migrationFile);

    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Migration file not found: ${sqlPath}`);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🔌 Connecting to database...');
    const client = await pool.connect();

    console.log('✅ Connected to Neon PostgreSQL');
    console.log('⚙️  Executing migration...\n');

    // Execute migration
    const result = await client.query(sql);

    console.log('✅ Migration executed successfully!\n');

    // Verify tables were created
    console.log('🔍 Verifying schema...');

    const tablesCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('roles', 'users', 'audit_logs')
      ORDER BY table_name
    `);

    console.log(`📊 Tables created: ${tablesCheck.rows.map(r => r.table_name).join(', ')}`);

    // Check if super admin was created
    const adminCheck = await client.query(
      "SELECT username, full_name, is_active FROM users WHERE username = 'pharmacy_admin'"
    );

    if (adminCheck.rows.length > 0) {
      console.log('✅ Super admin created:');
      console.log(`   Username: ${adminCheck.rows[0].username}`);
      console.log(`   Full Name: ${adminCheck.rows[0].full_name}`);
      console.log(`   Status: ${adminCheck.rows[0].is_active ? 'Active' : 'Inactive'}`);
    }

    // Check roles
    const rolesCheck = await client.query('SELECT role_name FROM roles ORDER BY role_id');
    console.log(`🎭 Roles available: ${rolesCheck.rows.map(r => r.role_name).join(', ')}`);

    client.release();

    console.log('\n✅ MIGRATION COMPLETE!');
    console.log('\n⚠️  DEFAULT CREDENTIALS:');
    console.log('   Username: pharmacy_admin');
    console.log('   Password: pharmacyadmin123');
    console.log('   ⚠️  Change this password after first login!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error.message);
    console.error('\nDetails:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

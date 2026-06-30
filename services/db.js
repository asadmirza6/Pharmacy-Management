// Database Connection Pool
// PostgreSQL connection using pg with connection pooling for Neon

const { Pool } = require('pg');
require('dotenv').config();

// Create connection pool for Neon PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20, // Maximum number of clients in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on module load
pool.connect()
  .then(client => {
    console.log('✅ PostgreSQL (Neon) connection pool established');
    client.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
  });

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = { pool };

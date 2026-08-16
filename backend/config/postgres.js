const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.SUPABASE_DB_HOST,
  port: Number(process.env.SUPABASE_DB_PORT) || 5432,
  database: process.env.SUPABASE_DB_NAME,
  user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error', err);
});

pool.query('SELECT 1')
  .then(() => console.log('Supabase connected successfully'))
  .catch((err) => console.error('Supabase connection failed', err));

const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };

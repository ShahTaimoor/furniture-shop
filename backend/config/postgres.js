const { Pool } = require('pg');

// Set DATABASE_URL, or DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD.
// DB_SSL=false disables SSL (e.g. local Postgres); defaults to SSL on.
const useSsl = process.env.DB_SSL !== 'false';
const ssl = useSsl ? { rejectUnauthorized: false } : false;

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl,
      }
);

pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error', err);
});

pool.query('SELECT 1')
  .then(() => console.log('Postgres connected successfully'))
  .catch((err) => console.error('Postgres connection failed', err));

const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };

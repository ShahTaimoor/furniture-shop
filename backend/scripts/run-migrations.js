require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const { pool } = require('../config/postgres');

const migrationsDir = path.join(__dirname, 'pg-migrations');

const run = async () => {
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Running ${file}...`);
    await pool.query(sql);
    console.log(`Done ${file}`);
  }

  await pool.end();
  console.log('All migrations applied successfully');
};

run().catch((err) => {
  console.error('Migration failed', err);
  process.exit(1);
});

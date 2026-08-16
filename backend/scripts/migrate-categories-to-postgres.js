const dotenv = require('dotenv');
const dns = require('dns');
const mongoose = require('mongoose');
dotenv.config();
dns.setServers(['8.8.8.8', '1.1.1.1']);

const Category = require('../models/Category');
const { query, pool } = require('../config/postgres');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');

  const categories = await Category.find().sort({ createdAt: 1 }).lean();
  console.log(`Found ${categories.length} categories in MongoDB`);

  // Wipe the Postgres table first so this script is safely re-runnable.
  await query('delete from categories');

  const idMap = new Map(); // mongoId -> postgres uuid

  for (const cat of categories) {
    const parentPgId = cat.parentId ? idMap.get(cat.parentId.toString()) : null;

    const { rows } = await query(
      `insert into categories (name, slug, parent_id, picture_secure_url, picture_public_id, picture_alt, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning id`,
      [
        cat.name,
        cat.slug,
        parentPgId,
        cat.picture?.secure_url || null,
        cat.picture?.public_id || null,
        cat.picture?.alt || null,
        cat.createdAt,
        cat.updatedAt,
      ]
    );

    idMap.set(cat._id.toString(), rows[0].id);
    console.log(`Migrated "${cat.name}" (${cat._id} -> ${rows[0].id})`);
  }

  console.log(`\nMigration complete: ${idMap.size} categories copied to Postgres`);

  await mongoose.disconnect();
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

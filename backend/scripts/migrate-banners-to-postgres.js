const dotenv = require('dotenv');
const dns = require('dns');
const mongoose = require('mongoose');
dotenv.config();
dns.setServers(['8.8.8.8', '1.1.1.1']);

const Banner = require('../models/Banner');
const { query, pool } = require('../config/postgres');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');

  const banners = await Banner.find().sort({ createdAt: 1 }).lean();
  console.log(`Found ${banners.length} banners in MongoDB`);

  // Wipe the Postgres table first so this script is safely re-runnable.
  await query('delete from banners');

  for (const b of banners) {
    const { rows } = await query(
      `insert into banners (title, subtitle, redirect_link, placement, status, display_order, image_secure_url, image_public_id, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       returning id`,
      [
        b.title || '',
        b.subtitle || '',
        b.redirectLink || '',
        b.placement,
        b.status === 'inactive' ? 'inactive' : 'active',
        Number.isFinite(b.displayOrder) ? b.displayOrder : 0,
        b.image?.secure_url,
        b.image?.public_id,
        b.createdAt,
        b.updatedAt,
      ]
    );
    console.log(`Migrated "${b.title || b.placement}" (${b._id} -> ${rows[0].id})`);
  }

  console.log(`\nMigration complete: ${banners.length} banners copied to Postgres`);

  await mongoose.disconnect();
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

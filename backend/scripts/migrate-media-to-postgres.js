const dotenv = require('dotenv');
const dns = require('dns');
const mongoose = require('mongoose');
dotenv.config();
dns.setServers(['8.8.8.8', '1.1.1.1']);

const Media = require('../models/Media');
const { query, pool } = require('../config/postgres');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');

  const mediaItems = await Media.find().sort({ createdAt: 1 }).lean();
  console.log(`Found ${mediaItems.length} media items in MongoDB`);

  // Wipe the Postgres table first so this script is safely re-runnable.
  await query('delete from media');

  let migrated = 0;
  let skipped = 0;

  for (const m of mediaItems) {
    const { rows: userRows } = await query('select 1 from users where id = $1', [m.uploadedBy.toString()]);
    if (userRows.length === 0) {
      console.log(`Skipping media ${m._id} — uploader ${m.uploadedBy} not found in Postgres`);
      skipped += 1;
      continue;
    }

    await query(
      `insert into media (name, original_name, url, public_id, size, type, folder, uploaded_by, tags, description, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        m.name,
        m.originalName,
        m.url,
        m.public_id,
        m.size,
        m.type,
        m.folder || 'media',
        m.uploadedBy.toString(),
        m.tags || [],
        m.description || null,
        m.createdAt,
        m.updatedAt,
      ]
    );
    migrated += 1;
  }

  console.log(`\nMigration complete: ${migrated} media items copied to Postgres, ${skipped} skipped`);

  await mongoose.disconnect();
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

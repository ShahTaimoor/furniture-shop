const dotenv = require('dotenv');
const dns = require('dns');
const mongoose = require('mongoose');
dotenv.config();
dns.setServers(['8.8.8.8', '1.1.1.1']);

const Notification = require('../models/Notification');
const { query, pool } = require('../config/postgres');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');

  const notifications = await Notification.find().sort({ createdAt: 1 }).lean();
  console.log(`Found ${notifications.length} notifications in MongoDB`);

  // Wipe the Postgres table first so this script is safely re-runnable.
  await query('delete from notifications');

  let migrated = 0;
  let skipped = 0;

  for (const n of notifications) {
    const { rows: userRows } = await query('select 1 from users where id = $1', [n.user.toString()]);
    if (userRows.length === 0) {
      console.log(`Skipping notification ${n._id} — user ${n.user} not found in Postgres`);
      skipped += 1;
      continue;
    }

    await query(
      `insert into notifications (
         user_id, type, title, message, related_entity_type, related_entity_id,
         priority, is_read, read_at, channels, action, data, expires_at, created_at, updated_at
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        n.user.toString(),
        n.type,
        n.title,
        n.message,
        n.relatedEntity?.type || null,
        n.relatedEntity?.id ? n.relatedEntity.id.toString() : null,
        n.priority || 'medium',
        n.isRead || false,
        n.readAt || null,
        JSON.stringify(n.channels || {}),
        n.action ? JSON.stringify(n.action) : null,
        JSON.stringify(n.data || {}),
        n.expiresAt || null,
        n.createdAt,
        n.updatedAt,
      ]
    );
    migrated += 1;
  }

  console.log(`\nMigration complete: ${migrated} notifications copied to Postgres, ${skipped} skipped`);

  await mongoose.disconnect();
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

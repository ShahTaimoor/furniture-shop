const dotenv = require('dotenv');
const dns = require('dns');
const mongoose = require('mongoose');
dotenv.config();
dns.setServers(['8.8.8.8', '1.1.1.1']);

const MongoUser = require('../models/User');
const { query, pool } = require('../config/postgres');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');

  const users = await MongoUser.find().select('+password').lean();
  console.log(`Found ${users.length} users in MongoDB`);

  for (const u of users) {
    if (!u.email) {
      console.log(`Skipping "${u.name || u._id}" — no email, cannot migrate to email-based login`);
      continue;
    }

    await query(
      `insert into users (id, name, email, phone, password_hash, role, address, city, is_active, email_verified, last_login, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       on conflict (id) do update set
         name = excluded.name, email = excluded.email, phone = excluded.phone,
         password_hash = excluded.password_hash, role = excluded.role,
         address = excluded.address, city = excluded.city, is_active = excluded.is_active,
         email_verified = excluded.email_verified, last_login = excluded.last_login`,
      [
        u._id.toString(), u.name || null, u.email.toLowerCase().trim(), u.phone || null,
        u.password, u.role ?? 0, u.address || null, u.city || null,
        u.isActive !== false, u.emailVerified || false, u.lastLogin || null,
        u.createdAt, u.updatedAt,
      ]
    );
    console.log(`Migrated "${u.name || u.email}" (${u._id} -> same id preserved)`);
  }

  console.log(`\nMigration complete: ${users.length} users copied to Postgres (same IDs preserved)`);

  await mongoose.disconnect();
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

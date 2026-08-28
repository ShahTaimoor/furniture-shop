/**
 * Create (or promote) a Super Admin user directly in Supabase/Postgres.
 *
 * Usage:
 *   node scripts/createAdmin.js <email> <password> [name] [role]
 *
 * role: 1 = Admin, 2 = Super Admin (default: 2)
 *
 * If the email already exists, the script promotes that user to the given
 * role and (optionally) resets their password, instead of failing.
 */

require('dotenv').config();
const { pool } = require('../config/postgres');
const userModel = require('../models/postgres/userModel');

const run = async () => {
  const [, , email, password, name, roleArg] = process.argv;

  if (!email || !password) {
    console.error('Usage: node scripts/createAdmin.js <email> <password> [name] [role: 1=Admin, 2=SuperAdmin]');
    process.exitCode = 1;
    return;
  }

  const role = roleArg !== undefined ? Number(roleArg) : 2;
  if (![1, 2].includes(role)) {
    console.error('role must be 1 (Admin) or 2 (Super Admin)');
    process.exitCode = 1;
    return;
  }

  try {
    const existing = await userModel.findByEmail(email);

    if (existing) {
      await userModel.updateById(existing.id, { role });
      await userModel.updatePassword(existing.id, password);
      console.log(`Existing user "${email}" promoted to role ${role} and password updated.`);
    } else {
      const created = await userModel.create({
        name: name || 'Admin',
        email,
        password,
        role,
      });
      console.log(`Admin user created: ${created.email} (role ${created.role}, id ${created.id})`);
    }
  } catch (err) {
    console.error('Failed to create/promote admin:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

run();

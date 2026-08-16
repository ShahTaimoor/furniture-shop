const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query } = require('../../config/postgres');

const rowToUser = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    address: row.address,
    city: row.city,
    isActive: row.is_active,
    isBlacklisted: row.is_blacklisted,
    emailVerified: row.email_verified,
    lastLogin: row.last_login,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const hashPassword = async (plainPassword) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plainPassword, salt);
};

const comparePassword = async (plainPassword, passwordHash) => {
  if (!passwordHash) return false;
  return bcrypt.compare(plainPassword, passwordHash);
};

const findByEmail = async (email) => {
  const { rows } = await query('select * from users where email = $1', [email.toLowerCase().trim()]);
  return rows[0] || null;
};

const findById = async (id) => {
  const { rows } = await query('select * from users where id = $1', [id]);
  return rows[0] || null;
};

const create = async ({ name, email, password, phone, role, address, city }) => {
  const passwordHash = await hashPassword(password);
  const id = crypto.randomUUID();
  const { rows } = await query(
    `insert into users (id, name, email, phone, password_hash, role, address, city)
     values ($1,$2,$3,$4,$5,$6,$7,$8)
     returning *`,
    [id, name || null, email.toLowerCase().trim(), phone || null, passwordHash, role || 0, address || null, city || null]
  );
  return rows[0];
};

const COLUMN_MAP = {
  name: 'name', email: 'email', phone: 'phone', role: 'role', address: 'address',
  city: 'city', isActive: 'is_active', isBlacklisted: 'is_blacklisted', lastLogin: 'last_login',
};

const updateById = async (id, fields) => {
  const setClauses = [];
  const params = [];
  let idx = 1;

  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || !COLUMN_MAP[key]) return;
    setClauses.push(`${COLUMN_MAP[key]} = $${idx}`);
    params.push(key === 'email' ? value.toLowerCase().trim() : value);
    idx += 1;
  });

  if (setClauses.length === 0) return findById(id);

  params.push(id);
  const { rows } = await query(`update users set ${setClauses.join(', ')} where id = $${idx} returning *`, params);
  return rows[0];
};

const updatePassword = async (id, newPassword) => {
  const passwordHash = await hashPassword(newPassword);
  const { rows } = await query('update users set password_hash = $2 where id = $1 returning *', [id, passwordHash]);
  return rows[0];
};

const list = async () => {
  const { rows } = await query('select * from users order by created_at desc');
  return rows;
};

module.exports = {
  rowToUser,
  hashPassword,
  comparePassword,
  findByEmail,
  findById,
  create,
  updateById,
  updatePassword,
  list,
};

const { query } = require('../../config/postgres');

const rowToNotification = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    user: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    relatedEntity: {
      type: row.related_entity_type,
      id: row.related_entity_id,
    },
    priority: row.priority,
    isRead: row.is_read,
    readAt: row.read_at,
    channels: row.channels,
    action: row.action,
    data: row.data,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const findForUser = async (userId, { type, isRead, limit, offset }) => {
  const conditions = ['user_id = $1'];
  const params = [userId];

  if (type) {
    params.push(type);
    conditions.push(`type = $${params.length}`);
  }
  if (isRead !== undefined) {
    params.push(isRead);
    conditions.push(`is_read = $${params.length}`);
  }

  const where = conditions.join(' and ');

  params.push(limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const { rows } = await query(
    `select * from notifications where ${where} order by created_at desc limit $${limitIdx} offset $${offsetIdx}`,
    params
  );

  const { rows: countRows } = await query(`select count(*)::int as total from notifications where ${where}`, params.slice(0, conditions.length));

  return { notifications: rows.map(rowToNotification), total: countRows[0].total };
};

const getUnreadCount = async (userId) => {
  const { rows } = await query('select count(*)::int as count from notifications where user_id = $1 and is_read = false', [userId]);
  return rows[0].count;
};

const findByIdForUser = async (id, userId) => {
  const { rows } = await query('select * from notifications where id = $1 and user_id = $2', [id, userId]);
  return rowToNotification(rows[0]);
};

const markAsRead = async (id, userId) => {
  const { rows } = await query(
    `update notifications set is_read = true, read_at = now() where id = $1 and user_id = $2 returning *`,
    [id, userId]
  );
  return rowToNotification(rows[0]);
};

const markMultipleAsRead = async (userId, ids) => {
  await query(
    `update notifications set is_read = true, read_at = now() where user_id = $1 and id = any($2::uuid[])`,
    [userId, ids]
  );
};

const markAllAsRead = async (userId) => {
  await query(`update notifications set is_read = true, read_at = now() where user_id = $1 and is_read = false`, [userId]);
};

const deleteByIdForUser = async (id, userId) => {
  const { rows } = await query('delete from notifications where id = $1 and user_id = $2 returning *', [id, userId]);
  return rowToNotification(rows[0]);
};

const create = async ({ user, type, title, message, priority, action, data, relatedEntity }) => {
  const { rows } = await query(
    `insert into notifications (user_id, type, title, message, priority, action, data, related_entity_type, related_entity_id)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     returning *`,
    [
      user,
      type,
      title,
      message,
      priority || 'medium',
      action ? JSON.stringify(action) : null,
      JSON.stringify(data || {}),
      relatedEntity?.type || null,
      relatedEntity?.id || null,
    ]
  );
  return rowToNotification(rows[0]);
};

module.exports = {
  findForUser,
  getUnreadCount,
  findByIdForUser,
  markAsRead,
  markMultipleAsRead,
  markAllAsRead,
  deleteByIdForUser,
  create,
};

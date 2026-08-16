const { query } = require('../../config/postgres');

const rowToMessage = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    chat: row.chat_id,
    sender: row.sender_id,
    content: row.content,
    messageType: row.message_type,
    attachments: row.attachments || [],
    seenBy: row.seen_by || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const create = async ({ chatId, senderId, content, messageType, attachments }) => {
  const { rows } = await query(
    `insert into messages (chat_id, sender_id, content, message_type, attachments, seen_by)
     values ($1,$2,$3,$4,$5,$6)
     returning *`,
    [chatId, senderId, content || '', messageType || 'text', JSON.stringify(attachments || []), [senderId]]
  );
  return rowToMessage(rows[0]);
};

const findById = async (id) => {
  const { rows } = await query('select * from messages where id = $1', [id]);
  return rowToMessage(rows[0]);
};

const listByChat = async (chatId, { before, limit = 50 } = {}) => {
  const conditions = ['chat_id = $1'];
  const params = [chatId];
  let idx = 2;

  if (before) {
    params.push(before);
    conditions.push(`created_at < $${idx}`);
    idx += 1;
  }

  params.push(limit);
  const { rows } = await query(
    `select * from messages where ${conditions.join(' and ')} order by created_at desc limit $${idx}`,
    params
  );
  return rows.map(rowToMessage).reverse();
};

const markSeenUpTo = async (chatId, upToCreatedAt, userId) => {
  await query(
    `update messages set seen_by = array_append(seen_by, $3)
     where chat_id = $1 and created_at <= $2 and not ($3 = any(seen_by))`,
    [chatId, upToCreatedAt, userId]
  );
};

module.exports = {
  rowToMessage,
  create,
  findById,
  listByChat,
  markSeenUpTo,
};

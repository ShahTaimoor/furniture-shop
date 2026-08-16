const { query } = require('../../config/postgres');

const rowToChat = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    participants: row.participants || [],
    participantHash: row.participant_hash,
    isGroup: row.is_group,
    createdBy: row.created_by,
    metadata: row.metadata || {},
    lastMessage: row.last_message || null,
    unreadCounts: row.unread_counts || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const buildParticipantHash = (participantIds = []) => participantIds.map(String).sort().join(':');

const findById = async (id) => {
  const { rows } = await query('select * from chats where id = $1', [id]);
  return rowToChat(rows[0]);
};

const findDirectChatByHash = async (participantHash) => {
  const { rows } = await query(
    'select * from chats where participant_hash = $1 and is_group = false',
    [participantHash]
  );
  return rowToChat(rows[0]);
};

const create = async ({ participants, isGroup, createdBy, title }) => {
  const participantHash = buildParticipantHash(participants);
  const unreadCounts = participants.reduce((acc, id) => ({ ...acc, [id]: 0 }), {});

  const { rows } = await query(
    `insert into chats (participants, participant_hash, is_group, created_by, metadata, unread_counts)
     values ($1,$2,$3,$4,$5,$6)
     returning *`,
    [participants, participantHash, Boolean(isGroup), createdBy || null, JSON.stringify({ title: title || '' }), JSON.stringify(unreadCounts)]
  );
  return rowToChat(rows[0]);
};

const listForUser = async (userId) => {
  const { rows } = await query(
    'select * from chats where $1 = any(participants) order by updated_at desc',
    [userId]
  );
  return rows.map(rowToChat);
};

const setLastMessageAndBumpUnread = async (chatId, { lastMessage, senderId }) => {
  const chat = await findById(chatId);
  if (!chat) return null;

  const unreadCounts = { ...chat.unreadCounts };
  chat.participants.forEach((participantId) => {
    if (participantId === senderId) {
      unreadCounts[participantId] = 0;
    } else {
      unreadCounts[participantId] = (Number(unreadCounts[participantId]) || 0) + 1;
    }
  });

  const { rows } = await query(
    `update chats set last_message = $2, unread_counts = $3 where id = $1 returning *`,
    [chatId, JSON.stringify(lastMessage), JSON.stringify(unreadCounts)]
  );
  return rowToChat(rows[0]);
};

const resetUnreadForUser = async (chatId, userId) => {
  const chat = await findById(chatId);
  if (!chat) return null;

  const unreadCounts = { ...chat.unreadCounts, [userId]: 0 };
  const { rows } = await query('update chats set unread_counts = $2 where id = $1 returning *', [
    chatId,
    JSON.stringify(unreadCounts),
  ]);
  return rowToChat(rows[0]);
};

module.exports = {
  rowToChat,
  buildParticipantHash,
  findById,
  findDirectChatByHash,
  create,
  listForUser,
  setLastMessageAndBumpUnread,
  resetUnreadForUser,
};

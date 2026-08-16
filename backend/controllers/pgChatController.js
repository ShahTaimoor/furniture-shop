const chatModel = require('../models/postgres/chatModel');
const messageModel = require('../models/postgres/messageModel');
const userModel = require('../models/postgres/userModel');
const { query } = require('../config/postgres');
const { sanitizeText, ensureChatParticipant } = require('../services/pgChatService');

const createHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const ADMIN_ROLES = [1, 2];

const decorateUser = (row) => ({
  id: row.id,
  name: row.name || row.email,
  email: row.email || null,
  avatar: null,
  role: typeof row.role === 'number' ? row.role : undefined,
});

const decorateMessage = (message, senderRow) => ({
  id: message._id,
  chatId: message.chat,
  sender: senderRow?.id || message.sender,
  senderName: senderRow?.name || senderRow?.email,
  avatar: null,
  content: message.content,
  messageType: message.messageType,
  attachments: message.attachments,
  createdAt: message.createdAt,
});

const decorateChat = async (chat, userId) => {
  const { rows } = await query('select * from users where id = any($1::text[])', [chat.participants]);
  const participants = rows.map(decorateUser);

  let lastMessage = chat.lastMessage;
  if (lastMessage?.sender) {
    const senderRow = rows.find((r) => r.id === lastMessage.sender);
    lastMessage = { ...lastMessage, sender: senderRow ? decorateUser(senderRow) : lastMessage.sender };
  }

  return {
    id: chat._id,
    participants,
    lastMessage: lastMessage || null,
    isGroup: chat.isGroup,
    metadata: chat.metadata,
    updatedAt: chat.updatedAt,
    unreadCount: Number(chat.unreadCounts?.[String(userId)] || 0),
  };
};

// @route POST /api/pg/chats
const startOrGetChat = async (req, res, next) => {
  try {
    const { participantIds = [], isGroup = false, title, targetRole } = req.body || {};
    const currentUserId = req.user._id.toString();

    const participantSet = new Set(participantIds.filter(Boolean).map(String));
    participantSet.add(currentUserId);
    let participants = Array.from(participantSet);

    const otherIds = participants.filter((id) => id !== currentUserId);
    let otherUsers = [];
    if (otherIds.length) {
      const { rows } = await query('select id, role from users where id = any($1::text[])', [otherIds]);
      otherUsers = rows;
    }

    const hasAdminParticipant = otherUsers.some((u) => ADMIN_ROLES.includes(u.role));

    if (targetRole === 'admin' && !hasAdminParticipant) {
      const { rows: adminRows } = await query(
        'select id, role from users where role = any($1::int[]) order by role desc, created_at asc limit 1',
        [ADMIN_ROLES]
      );
      const adminUser = adminRows[0];
      if (!adminUser) {
        throw createHttpError(404, 'No admin available to chat right now');
      }
      if (!participants.includes(adminUser.id)) {
        participants.push(adminUser.id);
        otherUsers.push(adminUser);
      }
    }

    if (req.user.role < 1) {
      if (!otherUsers.length) {
        throw createHttpError(400, 'Please wait while we connect you to an admin');
      }
      const onlyAdmins = otherUsers.every((u) => ADMIN_ROLES.includes(u.role));
      if (!onlyAdmins) {
        throw createHttpError(403, 'Customers can only chat with an admin');
      }
    }

    if (participants.length < 2) {
      throw createHttpError(400, 'You need at least one other participant');
    }

    let chat = null;
    if (!isGroup) {
      const participantHash = chatModel.buildParticipantHash(participants);
      chat = await chatModel.findDirectChatByHash(participantHash);
    }

    if (!chat) {
      chat = await chatModel.create({
        participants,
        isGroup,
        createdBy: currentUserId,
        title: sanitizeText(title || ''),
      });
    }

    res.status(201).json({ success: true, chat: await decorateChat(chat, currentUserId) });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/pg/chats
const getUserChats = async (req, res, next) => {
  try {
    const chats = await chatModel.listForUser(req.user._id.toString());
    const decorated = await Promise.all(chats.map((chat) => decorateChat(chat, req.user._id.toString())));
    res.status(200).json({ success: true, chats: decorated });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/pg/chats/users/search
const searchChatUsers = async (req, res, next) => {
  try {
    const searchTerm = sanitizeText(req.query.q || '');
    if (!searchTerm || searchTerm.length < 2) {
      return res.status(200).json({ success: true, users: [] });
    }

    const roleFilter = req.user.role > 0 ? '' : 'and role = any($3::int[])';
    const params = [req.user._id.toString(), `%${searchTerm}%`];
    if (req.user.role <= 0) params.push(ADMIN_ROLES);

    const { rows } = await query(
      `select * from users where id != $1 and (name ilike $2 or email ilike $2) ${roleFilter} limit 10`,
      params
    );

    res.status(200).json({ success: true, users: rows.map(decorateUser) });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/pg/chats/:chatId/preview
const getChatPreview = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const chat = await ensureChatParticipant(chatId, req.user._id.toString());

    const messages = await messageModel.listByChat(chatId, { limit: 1 });
    if (messages.length) {
      const lastMsg = messages[messages.length - 1];
      const senderRow = await userModel.findById(lastMsg.sender);
      chat.lastMessage = decorateMessage(lastMsg, senderRow);
    }

    res.status(200).json({ success: true, chat: await decorateChat(chat, req.user._id.toString()) });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  startOrGetChat,
  getUserChats,
  searchChatUsers,
  getChatPreview,
};

const userModel = require('../models/postgres/userModel');
const messageModel = require('../models/postgres/messageModel');
const {
  ensureChatParticipant,
  createMessageRecord,
  markChatMessagesAsSeen,
} = require('../services/pgChatService');
const { emitChatMessage, emitMessageSeen } = require('../socket/chat');

const createHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const serializeMessage = async (message) => {
  const senderRow = await userModel.findById(message.sender);
  return {
    id: message._id,
    chatId: message.chat,
    sender: {
      id: senderRow?.id || message.sender,
      name: senderRow?.name || senderRow?.email,
      avatar: null,
    },
    content: message.content,
    messageType: message.messageType,
    attachments: message.attachments,
    seenBy: message.seenBy,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
};

// @route GET /api/pg/chats/:chatId/messages
const getChatMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { before, limit = 50 } = req.query;

    await ensureChatParticipant(chatId, req.user._id.toString());

    const pageSize = Math.min(Number(limit) || 50, 100);
    const messages = await messageModel.listByChat(chatId, {
      before: before && !Number.isNaN(Date.parse(before)) ? new Date(before) : undefined,
      limit: pageSize,
    });

    const serialized = await Promise.all(messages.map(serializeMessage));
    res.status(200).json({ success: true, messages: serialized });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/pg/messages
const sendMessage = async (req, res, next) => {
  try {
    const { chatId, content, messageType, attachments } = req.body || {};
    const chat = await ensureChatParticipant(chatId, req.user._id.toString());
    const message = await createMessageRecord({
      chat, chatId, senderId: req.user._id.toString(), content, messageType, attachments,
    });

    const serialized = await serializeMessage(message);
    emitChatMessage(chatId, serialized);

    res.status(201).json({ success: true, message: serialized });
  } catch (error) {
    next(error);
  }
};

// @route PATCH /api/pg/messages/:messageId/seen
const markMessageSeen = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { chat, message } = await markChatMessagesAsSeen({ messageId, userId: req.user._id.toString() });

    const updatedMessage = await messageModel.findById(message._id);
    const serialized = await serializeMessage(updatedMessage);
    emitMessageSeen(chat._id, { chatId: chat._id, messageId: serialized.id, seenBy: serialized.seenBy });

    res.status(200).json({ success: true, message: serialized });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getChatMessages,
  sendMessage,
  markMessageSeen,
};

const mongoose = require('mongoose');
const Message = require('../models/Message');
const {
  ensureChatParticipant,
  createMessageRecord,
  markChatMessagesAsSeen,
} = require('../services/chatService');
const { emitChatMessage, emitMessageSeen } = require('../socket/chat');

const createHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const serializeMessage = (message) => ({
  id: message._id,
  chatId: message.chat,
  sender: {
    id: message.sender?._id || message.sender,
    name: message.sender?.fullName || message.sender?.name,
    avatar: message.sender?.profile?.avatar?.secure_url || null,
  },
  content: message.content,
  messageType: message.messageType,
  attachments: message.attachments,
  seenBy: message.seenBy?.map((userId) => userId.toString()),
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
});

exports.getChatMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { before, limit = 50 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      throw createHttpError(400, 'Invalid chat identifier');
    }

    await ensureChatParticipant(chatId, req.user._id);

    const query = { chat: chatId };
    if (before && !Number.isNaN(Date.parse(before))) {
      query.createdAt = { $lt: new Date(before) };
    }

    const pageSize = Math.min(Number(limit) || 50, 100);
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .populate('sender', 'name profile avatar');

    res.status(200).json({
      success: true,
      messages: messages.reverse().map(serializeMessage),
    });
  } catch (error) {
    next(error);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const { chatId, content, messageType, attachments } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      throw createHttpError(400, 'Invalid chat identifier');
    }

    const chat = await ensureChatParticipant(chatId, req.user._id);
    const message = await createMessageRecord({
      chat,
      chatId,
      senderId: req.user._id,
      content,
      messageType,
      attachments,
    });

    const serialized = serializeMessage(message);
    emitChatMessage(chatId, serialized);

    res.status(201).json({
      success: true,
      message: serialized,
    });
  } catch (error) {
    next(error);
  }
};

exports.markMessageSeen = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      throw createHttpError(400, 'Invalid message identifier');
    }

    const { chat, message } = await markChatMessagesAsSeen({
      messageId,
      userId: req.user._id,
    });

    const updatedMessage = await Message.findById(message._id)
      .populate('sender', 'name profile avatar');

    const serialized = serializeMessage(updatedMessage);
    emitMessageSeen(chat._id, {
      chatId: chat._id.toString(),
      messageId: serialized.id,
      seenBy: serialized.seenBy,
    });

    res.status(200).json({
      success: true,
      message: serialized,
    });
  } catch (error) {
    next(error);
  }
};


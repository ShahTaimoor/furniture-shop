const mongoose = require('mongoose');
const Chat = require('../models/Chat');
const Message = require('../models/Message');

const createHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const sanitizeText = (text = '') =>
  text
    .replace(/<script.*?>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeObjectId = (value) => {
  if (mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  throw createHttpError(400, 'Invalid identifier provided');
};

const ensureChatParticipant = async (chatId, userId) => {
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw createHttpError(404, 'Chat not found');
  }
  const isParticipant = chat.participants.some(
    (participant) => participant.toString() === userId.toString()
  );
  if (!isParticipant) {
    throw createHttpError(403, 'You are not a participant of this chat');
  }
  return chat;
};

const buildParticipantHash = (participants = []) =>
  participants.map((id) => id.toString()).sort().join(':');

const normalizeAttachments = (attachments = []) =>
  (Array.isArray(attachments) ? attachments : [])
    .map((attachment) => ({
      url: attachment?.url?.trim() || '',
      type: ['image', 'file'].includes(attachment?.type) ? attachment.type : 'file',
      name: attachment?.name?.trim() || '',
      size: Number.isFinite(attachment?.size) ? Number(attachment.size) : undefined,
    }))
    .filter((attachment) => attachment.url);

const mapUnreadCounts = (chat, senderId) => {
  chat.participants.forEach((participantId) => {
    const key = participantId.toString();
    if (!chat.unreadCounts) {
      chat.unreadCounts = new Map();
    }
    const currentValue = Number(chat.unreadCounts.get(key) || 0);
    if (key === senderId.toString()) {
      chat.unreadCounts.set(key, 0);
    } else {
      chat.unreadCounts.set(key, currentValue + 1);
    }
  });
  chat.markModified('unreadCounts');
};

const createMessageRecord = async ({
  chat,
  chatId,
  senderId,
  content,
  messageType = 'text',
  attachments,
}) => {
  const sanitizedContent = content ? sanitizeText(content) : '';
  const normalizedAttachments = normalizeAttachments(attachments);

  if (!sanitizedContent && !normalizedAttachments.length) {
    throw createHttpError(400, 'Message content or attachment is required');
  }

  const payload = {
    chat: chat?._id || chatId,
    sender: senderId,
    content: sanitizedContent,
    messageType,
    attachments: normalizedAttachments,
    seenBy: [senderId],
  };

  const message = await Message.create(payload);
  const freshMessage = await message.populate('sender', 'name profile avatar');

  const chatDoc = chat || (await Chat.findById(chatId));
  if (chatDoc) {
    chatDoc.lastMessage = {
      messageId: freshMessage._id,
      content: freshMessage.content,
      messageType: freshMessage.messageType,
      sender: freshMessage.sender?._id,
      createdAt: freshMessage.createdAt,
      attachments: freshMessage.attachments,
    };
    mapUnreadCounts(chatDoc, senderId);
    chatDoc.updatedAt = new Date();
    await chatDoc.save();
  }

  return freshMessage;
};

const markChatMessagesAsSeen = async ({ messageId, userId }) => {
  const message = await Message.findById(messageId);
  if (!message) {
    throw createHttpError(404, 'Message not found');
  }

  const chat = await ensureChatParticipant(message.chat, userId);

  await Message.updateMany(
    {
      chat: chat._id,
      createdAt: { $lte: message.createdAt },
      seenBy: { $ne: userId },
    },
    { $addToSet: { seenBy: userId } }
  );

  if (!chat.unreadCounts) {
    chat.unreadCounts = new Map();
  }
  chat.unreadCounts.set(userId.toString(), 0);
  chat.markModified('unreadCounts');
  await chat.save();

  return { chat, message };
};

module.exports = {
  sanitizeText,
  normalizeObjectId,
  ensureChatParticipant,
  buildParticipantHash,
  createMessageRecord,
  markChatMessagesAsSeen,
};


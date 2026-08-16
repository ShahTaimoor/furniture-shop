const chatModel = require('../models/postgres/chatModel');
const messageModel = require('../models/postgres/messageModel');

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

const ensureChatParticipant = async (chatId, userId) => {
  const chat = await chatModel.findById(chatId);
  if (!chat) {
    throw createHttpError(404, 'Chat not found');
  }
  if (!chat.participants.includes(String(userId))) {
    throw createHttpError(403, 'You are not a participant of this chat');
  }
  return chat;
};

const normalizeAttachments = (attachments = []) =>
  (Array.isArray(attachments) ? attachments : [])
    .map((attachment) => ({
      url: attachment?.url?.trim() || '',
      type: ['image', 'file'].includes(attachment?.type) ? attachment.type : 'file',
      name: attachment?.name?.trim() || '',
      size: Number.isFinite(attachment?.size) ? Number(attachment.size) : undefined,
    }))
    .filter((attachment) => attachment.url);

const createMessageRecord = async ({ chat, chatId, senderId, content, messageType = 'text', attachments }) => {
  const sanitizedContent = content ? sanitizeText(content) : '';
  const normalizedAttachments = normalizeAttachments(attachments);

  if (!sanitizedContent && !normalizedAttachments.length) {
    throw createHttpError(400, 'Message content or attachment is required');
  }

  const message = await messageModel.create({
    chatId: chat?._id || chatId,
    senderId: String(senderId),
    content: sanitizedContent,
    messageType,
    attachments: normalizedAttachments,
  });

  const targetChatId = chat?._id || chatId;
  await chatModel.setLastMessageAndBumpUnread(targetChatId, {
    lastMessage: {
      messageId: message._id,
      content: message.content,
      messageType: message.messageType,
      sender: message.sender,
      createdAt: message.createdAt,
      attachments: message.attachments,
    },
    senderId: String(senderId),
  });

  return message;
};

const markChatMessagesAsSeen = async ({ messageId, userId }) => {
  const message = await messageModel.findById(messageId);
  if (!message) {
    throw createHttpError(404, 'Message not found');
  }

  const chat = await ensureChatParticipant(message.chat, userId);

  await messageModel.markSeenUpTo(chat._id, message.createdAt, String(userId));
  await chatModel.resetUnreadForUser(chat._id, String(userId));

  return { chat, message };
};

module.exports = {
  sanitizeText,
  ensureChatParticipant,
  createMessageRecord,
  markChatMessagesAsSeen,
};

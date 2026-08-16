const userModel = require('../models/postgres/userModel');
const {
  ensureChatParticipant,
  createMessageRecord,
  markChatMessagesAsSeen,
} = require('../services/pgChatService');

let ioInstance;

const setChatSocketServer = (io) => {
  ioInstance = io;
};

const getChatIO = () => {
  if (!ioInstance) {
    throw new Error('Chat socket has not been initialized');
  }
  return ioInstance;
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

const emitChatMessage = (chatId, payload) => {
  if (!chatId || !payload) return;
  try {
    getChatIO().to(`chat:${chatId}`).emit('receiveMessage', payload);
  } catch (error) {
    console.error('emitChatMessage error:', error.message);
  }
};

const emitTypingEvent = (chatId, event, payload) => {
  if (!chatId || !event) return;
  try {
    getChatIO().to(`chat:${chatId}`).emit(event, payload);
  } catch (error) {
    console.error(`${event} emit error:`, error.message);
  }
};

const emitMessageSeen = (chatId, payload) => {
  if (!chatId || !payload) return;
  try {
    getChatIO().to(`chat:${chatId}`).emit('messageSeen', payload);
  } catch (error) {
    console.error('emitMessageSeen error:', error.message);
  }
};

const registerChatHandlers = (socket) => {
  socket.on('joinChat', async ({ chatId }) => {
    try {
      if (!chatId) return;
      await ensureChatParticipant(chatId, socket.user.id);
      socket.join(`chat:${chatId}`);
    } catch (error) {
      console.error('joinChat error:', error.message);
    }
  });

  socket.on('leaveChat', ({ chatId }) => {
    if (!chatId) return;
    socket.leave(`chat:${chatId}`);
  });

  socket.on('typing', async ({ chatId }) => {
    if (!chatId) return;
    emitTypingEvent(chatId, 'typing', { chatId, userId: socket.user.id });
  });

  socket.on('stopTyping', async ({ chatId }) => {
    if (!chatId) return;
    emitTypingEvent(chatId, 'stopTyping', { chatId, userId: socket.user.id });
  });

  socket.on('sendMessage', async (payload = {}, callback) => {
    try {
      const { chatId, content, messageType, attachments } = payload;
      if (!chatId) {
        throw new Error('Invalid chat identifier');
      }
      const chat = await ensureChatParticipant(chatId, socket.user.id);
      const message = await createMessageRecord({
        chat, chatId, senderId: socket.user.id, content, messageType, attachments,
      });
      const serialized = await serializeMessage(message);
      emitChatMessage(chatId, serialized);
      callback?.({ success: true, message: serialized });
    } catch (error) {
      console.error('sendMessage socket error:', error.message);
      callback?.({ success: false, message: error.message });
    }
  });

  socket.on('messageSeen', async ({ messageId }) => {
    try {
      if (!messageId) {
        throw new Error('Invalid message identifier');
      }
      const { chat, message } = await markChatMessagesAsSeen({ messageId, userId: socket.user.id });
      emitMessageSeen(chat._id, { chatId: chat._id, messageId: message._id, userId: socket.user.id });
    } catch (error) {
      console.error('messageSeen socket error:', error.message);
    }
  });
};

module.exports = {
  setChatSocketServer,
  registerChatHandlers,
  emitChatMessage,
  emitMessageSeen,
};

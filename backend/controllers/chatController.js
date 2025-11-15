const mongoose = require('mongoose');
const Chat = require('../models/Chat');
const User = require('../models/User');
const Message = require('../models/Message');
const {
  buildParticipantHash,
  sanitizeText,
  ensureChatParticipant,
} = require('../services/chatService');

const createHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const normalizeParticipants = (participantIds = [], currentUserId) => {
  const normalized = new Set();
  participantIds
    .filter(Boolean)
    .forEach((id) => {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw createHttpError(400, 'Invalid participant identifier');
      }
      normalized.add(id.toString());
    });
  normalized.add(currentUserId.toString());
  return Array.from(normalized).map((id) => new mongoose.Types.ObjectId(id));
};

const decorateUser = (user) => ({
  id: user._id?.toString?.() || user._id,
  name: user.fullName || user.name,
  email: user.email || null,
  avatar: user.profile?.avatar?.secure_url || null,
  role: typeof user.role === 'number' ? user.role : undefined,
});

const decorateMessage = (message) => ({
  id: message._id,
  chatId: message.chat,
  sender: message.sender?._id || message.sender,
  senderName: message.sender?.fullName || message.sender?.name,
  avatar: message.sender?.profile?.avatar?.secure_url || null,
  content: message.content,
  messageType: message.messageType,
  attachments: message.attachments,
  createdAt: message.createdAt,
});

const mapLastMessage = (lastMessage) => {
  if (!lastMessage) return null;
  if (lastMessage.sender?.id) {
    return lastMessage;
  }
  return {
    ...lastMessage,
    sender: lastMessage.sender?._id || lastMessage.sender,
  };
};

const decorateChat = (chat, userId) => {
  const plain = chat.toObject({ virtuals: true });
  const unreadSource =
    typeof chat.unreadCounts?.get === 'function'
      ? chat.unreadCounts
      : plain.unreadCounts;
  return {
    id: plain._id,
    participants: (plain.participants || []).map(decorateUser),
    lastMessage: mapLastMessage(plain.lastMessage),
    isGroup: plain.isGroup,
    metadata: plain.metadata,
    updatedAt: plain.updatedAt,
    unreadCount: Number(
      unreadSource?.get
        ? unreadSource.get(userId.toString()) || 0
        : unreadSource?.[userId.toString()] || 0
    ),
  };
};

const ADMIN_ROLES = [1, 2];

exports.startOrGetChat = async (req, res, next) => {
  try {
    const { participantIds = [], isGroup = false, title, targetRole } = req.body || {};
    let participants = normalizeParticipants(participantIds, req.user._id);
    const currentUserId = req.user._id.toString();

    const otherIds = participants.filter((id) => id.toString() !== currentUserId);
    let otherUsers = otherIds.length
      ? await User.find({ _id: { $in: otherIds } }).select('role')
      : [];

    const hasAdminParticipant = otherUsers.some((user) => ADMIN_ROLES.includes(user.role));

    if (targetRole === 'admin' && !hasAdminParticipant) {
      const adminUser = await User.findOne({ role: { $in: ADMIN_ROLES } }).sort({ role: -1, createdAt: 1 });
      if (!adminUser) {
        throw createHttpError(404, 'No admin available to chat right now');
      }
      if (!participants.some((id) => id.toString() === adminUser._id.toString())) {
        participants.push(adminUser._id);
        otherUsers.push(adminUser);
      }
    }

    if (req.user.role < 1) {
      if (!otherUsers.length) {
        throw createHttpError(400, 'Please wait while we connect you to an admin');
      }
      const onlyAdmins = otherUsers.every((user) => ADMIN_ROLES.includes(user.role));
      if (!onlyAdmins) {
        throw createHttpError(403, 'Customers can only chat with an admin');
      }
    }

    if (participants.length < 2) {
      throw createHttpError(400, 'You need at least one other participant');
    }

    const participantHash = buildParticipantHash(participants);
    let chat = null;

    if (!isGroup) {
      chat = await Chat.findOne({
        participantHash,
        isGroup: false,
      })
        .populate('participants', 'name profile avatar email role')
        .populate('lastMessage.sender', 'name profile avatar role');
    }

    if (!chat) {
      chat = await Chat.create({
        participants,
        participantHash,
        isGroup,
        createdBy: req.user._id,
        metadata: {
          title: sanitizeText(title || ''),
        },
        unreadCounts: participants.reduce((acc, participant) => {
          acc.set(participant.toString(), 0);
          return acc;
        }, new Map()),
      });

      await chat.populate('participants', 'name profile avatar email role');
    }

    res.status(201).json({
      success: true,
      chat: decorateChat(chat, req.user._id),
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({
      participants: req.user._id,
    })
      .sort({ updatedAt: -1 })
      .populate('participants', 'name profile avatar email role')
      .populate('lastMessage.sender', 'name profile avatar role');

    res.status(200).json({
      success: true,
      chats: chats.map((chat) => decorateChat(chat, req.user._id)),
    });
  } catch (error) {
    next(error);
  }
};

exports.searchChatUsers = async (req, res, next) => {
  try {
    const query = sanitizeText(req.query.q || '');
    if (!query || query.length < 2) {
      return res.status(200).json({ success: true, users: [] });
    }

    const regex = new RegExp(query, 'i');
    const roleFilter = req.user.role > 0 ? {} : { role: { $in: [1, 2] } };
    const users = await User.find({
      _id: { $ne: req.user._id },
      ...roleFilter,
      $or: [{ name: regex }, { email: regex }],
    })
      .limit(10)
      .select('name email profile avatar role');

    res.status(200).json({
      success: true,
      users: users.map(decorateUser),
    });
  } catch (error) {
    next(error);
  }
};

exports.getChatPreview = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      throw createHttpError(400, 'Invalid chat identifier');
    }

    const chat = await ensureChatParticipant(chatId, req.user._id);
    await chat.populate('participants', 'name profile avatar email role');
    const lastMessage = await Message.findOne({ chat: chatId })
      .sort({ createdAt: -1 })
      .limit(1)
      .populate('sender', 'name profile avatar');

    if (lastMessage) {
      chat.lastMessage = decorateMessage(lastMessage);
    }

    res.status(200).json({
      success: true,
      chat: decorateChat(chat, req.user._id),
    });
  } catch (error) {
    next(error);
  }
};


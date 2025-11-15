const express = require('express');
const { isAuthorized } = require('../middleware/authMiddleware');
const {
  startOrGetChat,
  getUserChats,
  searchChatUsers,
  getChatPreview,
} = require('../controllers/chatController');
const {
  getChatMessages,
  sendMessage,
  markMessageSeen,
} = require('../controllers/messageController');

const router = express.Router();

router.post('/chats', isAuthorized, startOrGetChat);
router.get('/chats', isAuthorized, getUserChats);
router.get('/chats/users/search', isAuthorized, searchChatUsers);
router.get('/chats/:chatId/preview', isAuthorized, getChatPreview);
router.get('/chats/:chatId/messages', isAuthorized, getChatMessages);

router.post('/messages', isAuthorized, sendMessage);
router.patch('/messages/:messageId/seen', isAuthorized, markMessageSeen);

module.exports = router;


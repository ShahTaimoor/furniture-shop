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

// Attachment upload for chat (images/documents)
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 5 } });
const { uploadImageOnCloudinary, uploadFileBuffer } = require('../utils/cloudinary');

router.post('/chats/:chatId/attachments', isAuthorized, upload.array('files', 5), async (req, res, next) => {
  try {
    const { chatId } = req.params;
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files provided' });
    }

    const uploads = await Promise.all(
      req.files.map(async (file) => {
        const isImage = file.mimetype.startsWith('image/');
        const result = isImage
          ? await uploadImageOnCloudinary(file.buffer, `chat/${chatId}`, { mimeType: file.mimetype })
          : await uploadFileBuffer(file.buffer, `chat/${chatId}`, {});
        return {
          url: result.secure_url,
          type: isImage ? 'image' : 'file',
          name: file.originalname,
          size: file.size
        };
      })
    );

    res.status(200).json({ success: true, attachments: uploads });
  } catch (error) {
    next(error);
  }
});

module.exports = router;


const express = require('express');
const multer = require('multer');
const { isAuthorized } = require('../middleware/pgAuthMiddleware');
const pgChatController = require('../controllers/pgChatController');
const pgMessageController = require('../controllers/pgMessageController');
const { uploadImageOnCloudinary, uploadFileBuffer } = require('../utils/cloudinary');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 5 } });

router.post('/pg/chats', isAuthorized, pgChatController.startOrGetChat);
router.get('/pg/chats', isAuthorized, pgChatController.getUserChats);
router.get('/pg/chats/users/search', isAuthorized, pgChatController.searchChatUsers);
router.get('/pg/chats/:chatId/preview', isAuthorized, pgChatController.getChatPreview);
router.get('/pg/chats/:chatId/messages', isAuthorized, pgMessageController.getChatMessages);

router.post('/pg/messages', isAuthorized, pgMessageController.sendMessage);
router.patch('/pg/messages/:messageId/seen', isAuthorized, pgMessageController.markMessageSeen);

router.post('/pg/chats/:chatId/attachments', isAuthorized, upload.array('files', 5), async (req, res, next) => {
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
        return { url: result.secure_url, type: isImage ? 'image' : 'file', name: file.originalname, size: file.size };
      })
    );

    res.status(200).json({ success: true, attachments: uploads });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

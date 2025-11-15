const multer = require('multer');
const { isValidImage } = require('../utils/imageProcessor');

const storage = multer.memoryStorage();

// File filter to only allow images
const fileFilter = async (req, file, cb) => {
  try {
    // Check file type
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }

    // Check if it's a supported format
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
    if (!supportedTypes.includes(file.mimetype)) {
      return cb(new Error('Unsupported image format. Please use JPEG, PNG, WebP, or AVIF'), false);
    }

    // Log the file type for debugging
    console.log(`📁 Uploading ${file.mimetype} file: ${(file.size / 1024).toFixed(2)}KB`);

    cb(null, true);
  } catch (error) {
    cb(error, false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB limit per file
    files: 10
  }
});

module.exports = upload;

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
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!supportedTypes.includes(file.mimetype)) {
      return cb(new Error('Unsupported image format. Please use JPEG, PNG, or WebP'), false);
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
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  }
});

module.exports = upload;

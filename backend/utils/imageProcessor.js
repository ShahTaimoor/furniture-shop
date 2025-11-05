const sharp = require('sharp');

/**
 * Convert image buffer to WebP format with optimization
 * @param {Buffer} buffer - Image buffer
 * @param {Object} options - Conversion options
 * @returns {Promise<Buffer>} WebP buffer
 */
const convertToWebP = async (buffer, options = {}) => {
  try {
    const {
      quality = 80,
      width = null,
      height = null,
      fit = 'cover'
    } = options;

    let sharpInstance = sharp(buffer);

    // Resize if dimensions provided
    if (width || height) {
      sharpInstance = sharpInstance.resize(width, height, {
        fit,
        withoutEnlargement: true
      });
    }

    // Convert to WebP with optimization
    const webpBuffer = await sharpInstance
      .webp({
        quality,
        effort: 6, // Higher effort for better compression
        lossless: false
      })
      .toBuffer();

    return webpBuffer;
  } catch (error) {
    console.error('Error converting image to WebP:', error);
    throw new Error('Image conversion failed');
  }
};

/**
 * Generate multiple WebP sizes for responsive images
 * @param {Buffer} buffer - Original image buffer
 * @returns {Promise<Object>} Object with different sized WebP buffers
 */
const generateResponsiveWebP = async (buffer) => {
  try {
    const sizes = [
      { width: 150, height: 150, suffix: 'thumb' },
      { width: 300, height: 300, suffix: 'small' },
      { width: 600, height: 600, suffix: 'medium' },
      { width: 1200, height: 1200, suffix: 'large' }
    ];

    const responsiveImages = {};

    for (const size of sizes) {
      const webpBuffer = await convertToWebP(buffer, {
        width: size.width,
        height: size.height,
        quality: size.suffix === 'thumb' ? 70 : 80
      });
      
      responsiveImages[size.suffix] = webpBuffer;
    }

    return responsiveImages;
  } catch (error) {
    console.error('Error generating responsive WebP images:', error);
    throw new Error('Responsive image generation failed');
  }
};

/**
 * Check if buffer is a valid image
 * @param {Buffer} buffer - Image buffer
 * @returns {Promise<boolean>} True if valid image
 */
const isValidImage = async (buffer) => {
  try {
    const metadata = await sharp(buffer).metadata();
    return metadata.width > 0 && metadata.height > 0;
  } catch (error) {
    return false;
  }
};

/**
 * Get image metadata
 * @param {Buffer} buffer - Image buffer
 * @returns {Promise<Object>} Image metadata
 */
const getImageMetadata = async (buffer) => {
  try {
    return await sharp(buffer).metadata();
  } catch (error) {
    console.error('Error getting image metadata:', error);
    throw new Error('Failed to get image metadata');
  }
};

module.exports = {
  convertToWebP,
  generateResponsiveWebP,
  isValidImage,
  getImageMetadata
};

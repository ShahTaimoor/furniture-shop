/**
 * Client-side image conversion utility for WebP optimization
 * Converts JPEG/PNG images to WebP format with compression
 */

/**
 * Convert image file to WebP format with compression
 * @param {File} file - Original image file
 * @param {Object} options - Conversion options
 * @returns {Promise<File>} WebP file
 */
export const convertToWebP = async (file, options = {}) => {
  const {
    quality = 0.8,
    maxWidth = 1200,
    maxHeight = 1200,
    maintainAspectRatio = true
  } = options;

  return new Promise((resolve, reject) => {
    // Check if file is already WebP
    if (file.type === 'image/webp') {
      resolve(file);
      return;
    }

    // Check if file is supported format
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      reject(new Error('Unsupported image format. Please use JPEG or PNG.'));
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = calculateDimensions(
          img.width,
          img.height,
          maxWidth,
          maxHeight,
          maintainAspectRatio
        );

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and resize image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to convert image to WebP'));
              return;
            }

            // Create new file with WebP extension
            const webpFile = new File([blob], getWebPFileName(file.name), {
              type: 'image/webp',
              lastModified: Date.now()
            });


            resolve(webpFile);
          },
          'image/webp',
          quality
        );
      } catch (error) {
        reject(new Error(`Image conversion failed: ${error.message}`));
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for conversion'));
    };

    // Load the image
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read image file'));
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Calculate new dimensions while maintaining aspect ratio
 * @param {number} originalWidth - Original image width
 * @param {number} originalHeight - Original image height
 * @param {number} maxWidth - Maximum allowed width
 * @param {number} maxHeight - Maximum allowed height
 * @param {boolean} maintainAspectRatio - Whether to maintain aspect ratio
 * @returns {Object} New dimensions
 */
const calculateDimensions = (originalWidth, originalHeight, maxWidth, maxHeight, maintainAspectRatio) => {
  if (!maintainAspectRatio) {
    return { width: maxWidth, height: maxHeight };
  }

  const aspectRatio = originalWidth / originalHeight;
  let width = originalWidth;
  let height = originalHeight;

  // Scale down if image is larger than max dimensions
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return { width: Math.round(width), height: Math.round(height) };
};

/**
 * Get WebP filename from original filename
 * @param {string} originalName - Original filename
 * @returns {string} WebP filename
 */
const getWebPFileName = (originalName) => {
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
  return `${nameWithoutExt}.webp`;
};

/**
 * Check if browser supports WebP format
 * @returns {Promise<boolean>} True if WebP is supported
 */
export const isWebPSupported = () => {
  return new Promise((resolve) => {
    const webp = new Image();
    webp.onload = webp.onerror = () => {
      resolve(webp.height === 2);
    };
    webp.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
};

/**
 * Get image file info (size, dimensions, type)
 * @param {File} file - Image file
 * @returns {Promise<Object>} Image info
 */
export const getImageInfo = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
        size: file.size,
        type: file.type,
        name: file.name
      });
    };
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Batch convert multiple images to WebP
 * @param {File[]} files - Array of image files
 * @param {Object} options - Conversion options
 * @returns {Promise<File[]>} Array of WebP files
 */
export const batchConvertToWebP = async (files, options = {}) => {
  const results = [];
  
  for (const file of files) {
    try {
      const webpFile = await convertToWebP(file, options);
      results.push(webpFile);
    } catch (error) {
      console.error(`Failed to convert ${file.name}:`, error);
      // Keep original file if conversion fails
      results.push(file);
    }
  }
  
  return results;
};

/**
 * Create a preview URL for the converted image
 * @param {File} file - Image file
 * @returns {string} Preview URL
 */
export const createPreviewUrl = (file) => {
  return URL.createObjectURL(file);
};

/**
 * Revoke preview URL to free memory
 * @param {string} url - Preview URL to revoke
 */
export const revokePreviewUrl = (url) => {
  URL.revokeObjectURL(url);
};

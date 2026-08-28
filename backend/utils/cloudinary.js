const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Streams the buffer straight to Cloudinary instead of base64-encoding it into a string
// first — base64 adds ~33% to the payload size plus encode/decode CPU time, so this is
// faster and lighter, especially for larger images.
const uploadBufferToStream = (buffer, uploadOptions) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });

const uploadImageOnCloudinary = async (buffer, folderName, options = {}) => {
  try {
    const { convertToWebP, getImageMetadata } = require('./imageProcessor');
    const { mimeType, ...conversionOptions } = options || {};

    const isAvifUpload = mimeType === 'image/avif';
    let metadata;
    let optimizedBuffer = buffer;
    let outputFormat = isAvifUpload ? 'avif' : 'webp';

    if (isAvifUpload) {
      console.log(`📁 AVIF upload detected (${(buffer.length / 1024).toFixed(2)}KB) – skipping conversion.`);
    } else {
      try {
        metadata = await getImageMetadata(buffer);
        const normalizedFormat = metadata.format?.toLowerCase();
        const isAlreadyWebP = normalizedFormat === 'webp';
        const isAlreadyAvif = normalizedFormat === 'avif';

        if (isAlreadyWebP || isAlreadyAvif) {
          outputFormat = normalizedFormat;
          optimizedBuffer = buffer;
          console.log(`📁 Image is already ${outputFormat.toUpperCase()} format: ${(buffer.length / 1024).toFixed(2)}KB`);
        } else {
          optimizedBuffer = await convertToWebP(buffer, {
            quality: 80,
            width: 1200,
            height: 1200,
            fit: 'inside',
            ...conversionOptions
          });
          outputFormat = 'webp';
          console.log(`🔄 Converting image to WebP: ${(buffer.length / 1024).toFixed(2)}KB → ${(optimizedBuffer.length / 1024).toFixed(2)}KB`);
        }
      } catch (metadataError) {
        console.log('⚠️ Could not determine image format, attempting WebP conversion...');
        optimizedBuffer = await convertToWebP(buffer, {
          quality: 80,
          width: 1200,
          height: 1200,
          fit: 'inside',
          ...conversionOptions
        });
        outputFormat = 'webp';
      }
    }

    const result = await uploadBufferToStream(optimizedBuffer, {
      folder: folderName,
      format: outputFormat,
    });

    console.log(`✅ WebP upload successful: ${result.secure_url}`);

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      bytes: result.bytes,
      format: result.format,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    throw new Error('Cloudinary upload failed');
  }
};

const uploadResponsiveWebP = async (buffer, folderName, options = {}) => {
  try {
    const { generateResponsiveWebP } = require('./imageProcessor');
    const responsiveImages = await generateResponsiveWebP(buffer);
    
    const uploadResults = {};
    
    for (const [size, webpBuffer] of Object.entries(responsiveImages)) {
      const base64String = `data:image/webp;base64,${webpBuffer.toString('base64')}`;
      
      const result = await cloudinary.uploader.upload(base64String, {
        folder: `${folderName}/${size}`,
        format: 'webp',
        quality: 'auto:good',
        fetch_format: 'auto',
        flags: 'lossy'
      });
      
      uploadResults[size] = {
        secure_url: result.secure_url,
        public_id: result.public_id
      };
    }
    
    console.log('✅ Responsive WebP images uploaded successfully');
    return uploadResults;
  } catch (error) {
    console.error('❌ Responsive WebP upload error:', error);
    throw new Error('Responsive WebP upload failed');
  }
};

const deleteImageOnCloudinary = async (public_id) => {
  try {
    return await cloudinary.uploader.destroy(public_id);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Cloudinary deletion failed');
  }
};

// Generic file upload (images, pdf, docx, etc.) without transformations
const uploadFileBuffer = async (buffer, folderName, options = {}) => {
  try {
    const base64String = `data:application/octet-stream;base64,${buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(base64String, {
      folder: folderName,
      resource_type: 'auto',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      ...options
    });
    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      bytes: result.bytes,
      format: result.format,
      resource_type: result.resource_type
    };
  } catch (error) {
    console.error('❌ Cloudinary generic upload error:', error);
    throw new Error('Cloudinary generic upload failed');
  }
};

module.exports = {
  uploadImageOnCloudinary,
  uploadResponsiveWebP,
  deleteImageOnCloudinary,
  uploadFileBuffer
};

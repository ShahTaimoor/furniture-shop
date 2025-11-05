const express = require('express');
const multer = require('multer');
const { uploadImageOnCloudinary } = require('../utils/cloudinary');
const { isAuthorized, isAdminOrSuperAdmin } = require('../middleware/authMiddleware');
const Media = require('../models/Media');
const router = express.Router();

// Test route to verify mediaRoutes is working
router.get('/media/test', (req, res) => {
  res.json({ success: true, message: 'Media routes are working' });
});

// Configure multer for multiple file uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
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

    cb(null, true);
  } catch (error) {
    cb(error, false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 10 // Maximum 10 files at once
  }
});

// @route POST /api/media/upload
// @desc Upload multiple images to Cloudinary
// @access Private/Admin
router.post('/media/upload', isAuthorized, isAdminOrSuperAdmin, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images provided'
      });
    }

    const uploadedImages = [];
    const errors = [];

    // Process each image
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      
      try {
        // Generate a unique name for the image
        const timestamp = Date.now();
        const originalName = file.originalname.replace(/\.[^/.]+$/, ''); // Remove extension
        const sanitizedName = originalName.replace(/[^a-zA-Z0-9]/g, '_'); // Sanitize name
        const fileName = `${sanitizedName}_${timestamp}`;

        // Upload to Cloudinary with custom folder and name
        const { secure_url, public_id } = await uploadImageOnCloudinary(
          file.buffer, 
          'media', // Folder name
          { 
            public_id: fileName,
            resource_type: 'image'
          }
        );

        if (secure_url && public_id) {
          // Save to database
          const mediaDoc = await Media.create({
            name: originalName,
            originalName: file.originalname,
            url: secure_url,
            public_id: public_id,
            size: file.size,
            type: file.mimetype,
            uploadedBy: req.user.id
          });

          uploadedImages.push({
            id: mediaDoc._id,
            name: mediaDoc.name,
            url: mediaDoc.url,
            public_id: mediaDoc.public_id,
            size: mediaDoc.size,
            type: mediaDoc.type,
            uploadedAt: mediaDoc.createdAt
          });
        } else {
          errors.push({
            fileName: file.originalname,
            error: 'Failed to upload to Cloudinary'
          });
        }
      } catch (error) {
        console.error(`Error uploading ${file.originalname}:`, error);
        errors.push({
          fileName: file.originalname,
          error: error.message
        });
      }
    }

    // Return response
    console.log('Upload completed - uploadedImages:', uploadedImages.length, 'errors:', errors.length);
    console.log('Uploaded images data:', uploadedImages);
    
    if (uploadedImages.length > 0) {
      const response = {
        success: true,
        message: `Successfully uploaded ${uploadedImages.length} images`,
        data: uploadedImages,
        errors: errors.length > 0 ? errors : undefined
      };
      console.log('Sending response:', response);
      res.status(200).json(response);
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to upload any images',
        errors: errors
      });
    }

  } catch (error) {
    console.error('Media upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during upload',
      error: error.message
    });
  }
});

// @route GET /api/media
// @desc Get all uploaded media
// @access Private/Admin
router.get('/media', isAuthorized, isAdminOrSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 2000, search = '' } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    let query = {};
    if (search && search.trim()) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { originalName: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const media = await Media.find(query)
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Media.countDocuments(query);

    res.status(200).json({
      success: true,
      data: media,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        itemsPerPage: limitNum
      }
    });

  } catch (error) {
    console.error('Media fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching media',
      error: error.message
    });
  }
});

// @route GET /api/media/search
// @desc Search uploaded media by name
// @access Private/Admin
router.get('/media/search', isAuthorized, isAdminOrSuperAdmin, async (req, res) => {
  try {
    const { q, limit = 2000, offset = 0 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const media = await Media.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { originalName: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ]
    })
    .populate('uploadedBy', 'name email')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(parseInt(offset));

    res.status(200).json({
      success: true,
      data: media,
      query: q,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Media search error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during search',
      error: error.message
    });
  }
});

// @route DELETE /api/media/bulk
// @desc Delete multiple media items
// @access Private/Admin
router.delete('/media/bulk', isAuthorized, isAdminOrSuperAdmin, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Media IDs array is required'
      });
    }

    // Find all media items
    const mediaItems = await Media.find({ _id: { $in: ids } });
    
    if (mediaItems.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No media items found'
      });
    }

    // Delete from Cloudinary (optional)
    // const { deleteImageFromCloudinary } = require('../utils/cloudinary');
    // for (const media of mediaItems) {
    //   await deleteImageFromCloudinary(media.public_id);
    // }

    // Delete from database
    const result = await Media.deleteMany({ _id: { $in: ids } });

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} media items`,
      data: { 
        deletedCount: result.deletedCount,
        requestedCount: ids.length,
        deletedIds: mediaItems.map(item => item._id)
      }
    });

  } catch (error) {
    console.error('Bulk media delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during bulk deletion',
      error: error.message
    });
  }
});

// @route DELETE /api/media/:id
// @desc Delete a single media item
// @access Private/Admin
router.delete('/media/:id', isAuthorized, isAdminOrSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Media ID is required'
      });
    }

    // Find the media item
    const media = await Media.findById(id);
    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    // Delete from Cloudinary (optional - you might want to keep files)
    // const { deleteImageFromCloudinary } = require('../utils/cloudinary');
    // await deleteImageFromCloudinary(media.public_id);

    // Delete from database
    await Media.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Media deleted successfully',
      data: { id: media._id, name: media.name }
    });

  } catch (error) {
    console.error('Media delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during deletion',
      error: error.message
    });
  }
});

module.exports = router;

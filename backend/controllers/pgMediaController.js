const mediaModel = require('../models/postgres/mediaModel');
const { uploadImageOnCloudinary } = require('../utils/cloudinary');

const uploadMedia = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No images provided' });
    }

    const uploadedImages = [];
    const errors = [];

    // Upload all files concurrently instead of one-at-a-time — each has its own
    // try/catch so one failure doesn't block or get blocked by the others.
    await Promise.all(req.files.map(async (file) => {
      try {
        const timestamp = Date.now();
        const originalName = file.originalname.replace(/\.[^/.]+$/, '');
        const sanitizedName = originalName.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${sanitizedName}_${timestamp}`;

        const { secure_url, public_id } = await uploadImageOnCloudinary(
          file.buffer,
          'media',
          {
            public_id: fileName,
            resource_type: 'image',
            mimeType: file.mimetype
          }
        );

        if (secure_url && public_id) {
          const mediaDoc = await mediaModel.create({
            name: originalName,
            originalName: file.originalname,
            url: secure_url,
            publicId: public_id,
            size: file.size,
            type: file.mimetype,
            uploadedBy: req.user.id,
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
          errors.push({ fileName: file.originalname, error: 'Failed to upload to Cloudinary' });
        }
      } catch (error) {
        console.error(`Error uploading ${file.originalname}:`, error);
        errors.push({ fileName: file.originalname, error: error.message });
      }
    }));

    if (uploadedImages.length > 0) {
      res.status(200).json({
        success: true,
        message: `Successfully uploaded ${uploadedImages.length} images`,
        data: uploadedImages,
        errors: errors.length > 0 ? errors : undefined
      });
    } else {
      res.status(500).json({ success: false, message: 'Failed to upload any images', errors });
    }
  } catch (error) {
    console.error('pg uploadMedia error:', error);
    res.status(500).json({ success: false, message: 'Server error during upload', error: error.message });
  }
};

const listMedia = async (req, res) => {
  try {
    const { page = 1, limit = 2000, search = '' } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));

    const { media, total } = await mediaModel.findAll({
      search,
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
    });

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
    console.error('pg listMedia error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching media', error: error.message });
  }
};

const searchMedia = async (req, res) => {
  try {
    const { q, limit = 2000, offset = 0 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    const { media } = await mediaModel.findAll({
      search: q,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.status(200).json({
      success: true,
      data: media,
      query: q,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('pg searchMedia error:', error);
    res.status(500).json({ success: false, message: 'Server error during search', error: error.message });
  }
};

const bulkDeleteMedia = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Media IDs array is required' });
    }

    const mediaItems = await mediaModel.findByIds(ids);

    if (mediaItems.length === 0) {
      return res.status(404).json({ success: false, message: 'No media items found' });
    }

    const deletedCount = await mediaModel.deleteByIds(ids);

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${deletedCount} media items`,
      data: {
        deletedCount,
        requestedCount: ids.length,
        deletedIds: mediaItems.map((item) => item._id)
      }
    });
  } catch (error) {
    console.error('pg bulkDeleteMedia error:', error);
    res.status(500).json({ success: false, message: 'Server error during bulk deletion', error: error.message });
  }
};

const deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;

    const media = await mediaModel.findById(id);
    if (!media) {
      return res.status(404).json({ success: false, message: 'Media not found' });
    }

    await mediaModel.deleteById(id);

    res.status(200).json({
      success: true,
      message: 'Media deleted successfully',
      data: { id: media._id, name: media.name }
    });
  } catch (error) {
    console.error('pg deleteMedia error:', error);
    res.status(500).json({ success: false, message: 'Server error during deletion', error: error.message });
  }
};

module.exports = {
  uploadMedia,
  listMedia,
  searchMedia,
  bulkDeleteMedia,
  deleteMedia,
};

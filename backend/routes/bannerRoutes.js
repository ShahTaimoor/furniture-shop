const express = require('express');
const mongoose = require('mongoose');
const upload = require('../middleware/multer');
const { uploadImageOnCloudinary, deleteImageOnCloudinary } = require('../utils/cloudinary');
const { isAuthorized, isAdminOrSuperAdmin } = require('../middleware/authMiddleware');
const Banner = require('../models/Banner');

const router = express.Router();

const PLACEMENT_LABELS = {
  hero_0: 'Hero Slot [0]',
  hero_1: 'Hero Slot [1]',
  hero_2: 'Hero Slot [2]',
  hero_3: 'Hero Slot [3]',
  hero_4: 'Hero Slot [4]',
  hero_5: 'Hero Slot [5]'
};

const normalizePlacement = (value = '') => {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '_');

  if (Object.prototype.hasOwnProperty.call(PLACEMENT_LABELS, normalized)) {
    return normalized;
  }

  // Accept hero placements using numeric suffix (e.g. hero_5 or hero[6])
  const heroMatch = normalized.match(/^hero[_\[](\d+)\]?$/);
  if (heroMatch) {
    const index = heroMatch[1];
    const key = `hero_${index}`;
    if (!Object.prototype.hasOwnProperty.call(PLACEMENT_LABELS, key)) {
      PLACEMENT_LABELS[key] = `Hero Slot [${index}]`;
    }
    return key;
  }

  return null;
};

const validateRedirectLink = (value) => {
  if (!value) return true;
  try {
    // Accept both absolute URLs and protocol-relative or path links
    if (value.startsWith('http://') || value.startsWith('https://')) {
      // Valid absolute URL
      new URL(value);
      return true;
    }
    if (value.startsWith('/')) {
      return true;
    }
    // As a fallback try to parse with https schema
    new URL(`https://${value}`);
    return true;
  } catch {
    return false;
  }
};

const buildBannerResponse = (banner) => {
  if (!banner) return null;
  const doc = banner.toObject ? banner.toObject() : banner;
  return {
    ...doc,
    placementLabel: PLACEMENT_LABELS[doc.placement] ?? doc.placement
  };
};

router.post(
  '/banners',
  isAuthorized,
  isAdminOrSuperAdmin,
  upload.single('image'),
  async (req, res) => {
    try {
      const { title, subtitle, redirectLink, placement, status = 'active', displayOrder } = req.body;

      const normalizedPlacement = normalizePlacement(placement || '');
      if (!normalizedPlacement) {
        return res.status(400).json({ success: false, message: 'Invalid banner placement' });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Banner image is required' });
      }

      if (!validateRedirectLink(redirectLink)) {
        return res.status(400).json({ success: false, message: 'Invalid redirect link format' });
      }

      const uploadResult = await uploadImageOnCloudinary(req.file.buffer, 'banners', {
        mimeType: req.file.mimetype,
      });

      const banner = await Banner.create({
        title: typeof title === 'string' ? title.trim() : '',
        subtitle: subtitle?.trim() || '',
        redirectLink: redirectLink?.trim() || '',
        placement: normalizedPlacement,
        status: status === 'inactive' ? 'inactive' : 'active',
        displayOrder: Number.isFinite(Number(displayOrder)) ? Number(displayOrder) : 0,
        image: uploadResult
      });

      return res.status(201).json({
        success: true,
        message: 'Banner created successfully',
        data: buildBannerResponse(banner)
      });
    } catch (error) {
      console.error('Error creating banner:', error);
      return res.status(500).json({ success: false, message: 'Failed to create banner' });
    }
  }
);

router.get('/banners', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status && ['active', 'inactive'].includes(status)) {
      filter.status = status;
    }

    const banners = await Banner.find(filter).sort({ placement: 1, displayOrder: 1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: banners.map(buildBannerResponse)
    });
  } catch (error) {
    console.error('Error fetching banners:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch banners' });
  }
});

router.get('/banners/:placement', async (req, res) => {
  try {
    const normalizedPlacement = normalizePlacement(req.params.placement || '');
    if (!normalizedPlacement) {
      return res.status(400).json({ success: false, message: 'Invalid banner placement' });
    }

    const banners = await Banner.find({
      placement: normalizedPlacement,
      status: 'active'
    }).sort({ displayOrder: 1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: banners.map(buildBannerResponse)
    });
  } catch (error) {
    console.error('Error fetching banners by placement:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch banners by placement' });
  }
});

router.put(
  '/banners/:id',
  isAuthorized,
  isAdminOrSuperAdmin,
  upload.single('image'),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid banner id' });
      }

      const banner = await Banner.findById(id);
      if (!banner) {
        return res.status(404).json({ success: false, message: 'Banner not found' });
      }

      const updates = {};
      const { title, subtitle, redirectLink, placement, status, displayOrder } = req.body;

      if (title !== undefined) {
        updates.title = typeof title === 'string' ? title.trim() : '';
      }

      if (subtitle !== undefined) {
        updates.subtitle = subtitle?.trim() || '';
      }

      if (redirectLink !== undefined) {
        if (!validateRedirectLink(redirectLink)) {
          return res.status(400).json({ success: false, message: 'Invalid redirect link format' });
        }
        updates.redirectLink = redirectLink?.trim() || '';
      }

      if (placement !== undefined) {
        const normalizedPlacement = normalizePlacement(placement);
        if (!normalizedPlacement) {
          return res.status(400).json({ success: false, message: 'Invalid banner placement' });
        }
        updates.placement = normalizedPlacement;
      }

      if (status !== undefined) {
        updates.status = status === 'inactive' ? 'inactive' : 'active';
      }

      if (displayOrder !== undefined) {
        updates.displayOrder = Number.isFinite(Number(displayOrder)) ? Number(displayOrder) : 0;
      }

      if (req.file) {
        const uploadResult = await uploadImageOnCloudinary(req.file.buffer, 'banners', {
          mimeType: req.file.mimetype,
        });
        updates.image = uploadResult;
        if (banner.image?.public_id) {
          await deleteImageOnCloudinary(banner.image.public_id);
        }
      }

      Object.assign(banner, updates);
      await banner.save();

      return res.status(200).json({
        success: true,
        message: 'Banner updated successfully',
        data: buildBannerResponse(banner)
      });
    } catch (error) {
      console.error('Error updating banner:', error);
      return res.status(500).json({ success: false, message: 'Failed to update banner' });
    }
  }
);

router.delete(
  '/banners/:id',
  isAuthorized,
  isAdminOrSuperAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid banner id' });
      }

      const banner = await Banner.findById(id);
      if (!banner) {
        return res.status(404).json({ success: false, message: 'Banner not found' });
      }

      if (banner.image?.public_id) {
        await deleteImageOnCloudinary(banner.image.public_id);
      }

      await Banner.findByIdAndDelete(id);

      return res.status(200).json({
        success: true,
        message: 'Banner deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting banner:', error);
      return res.status(500).json({ success: false, message: 'Failed to delete banner' });
    }
  }
);

module.exports = router;



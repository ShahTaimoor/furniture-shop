const bannerModel = require('../models/postgres/bannerModel');
const { uploadImageOnCloudinary, deleteImageOnCloudinary } = require('../utils/cloudinary');

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
    if (value.startsWith('http://') || value.startsWith('https://')) {
      new URL(value);
      return true;
    }
    if (value.startsWith('/')) {
      return true;
    }
    new URL(`https://${value}`);
    return true;
  } catch {
    return false;
  }
};

const buildBannerResponse = (banner) => {
  if (!banner) return null;
  return {
    ...banner,
    placementLabel: PLACEMENT_LABELS[banner.placement] ?? banner.placement
  };
};

const createBanner = async (req, res) => {
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

    const banner = await bannerModel.create({
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
    console.error('pg createBanner error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create banner' });
  }
};

const listBanners = async (req, res) => {
  try {
    const { status } = req.query;
    const filterStatus = status && ['active', 'inactive'].includes(status) ? status : undefined;

    const banners = await bannerModel.findAll(filterStatus);

    return res.status(200).json({
      success: true,
      data: banners.map(buildBannerResponse)
    });
  } catch (error) {
    console.error('pg listBanners error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch banners' });
  }
};

const listBannersByPlacement = async (req, res) => {
  try {
    const normalizedPlacement = normalizePlacement(req.params.placement || '');
    if (!normalizedPlacement) {
      return res.status(400).json({ success: false, message: 'Invalid banner placement' });
    }

    const banners = await bannerModel.findByPlacement(normalizedPlacement);

    return res.status(200).json({
      success: true,
      data: banners.map(buildBannerResponse)
    });
  } catch (error) {
    console.error('pg listBannersByPlacement error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch banners by placement' });
  }
};

const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await bannerModel.findById(id);
    if (!existing) {
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
      if (existing.image?.public_id) {
        await deleteImageOnCloudinary(existing.image.public_id);
      }
    }

    const banner = await bannerModel.update(id, updates);

    return res.status(200).json({
      success: true,
      message: 'Banner updated successfully',
      data: buildBannerResponse(banner)
    });
  } catch (error) {
    console.error('pg updateBanner error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update banner' });
  }
};

const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await bannerModel.findById(id);
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    if (banner.image?.public_id) {
      await deleteImageOnCloudinary(banner.image.public_id);
    }

    await bannerModel.deleteById(id);

    return res.status(200).json({
      success: true,
      message: 'Banner deleted successfully'
    });
  } catch (error) {
    console.error('pg deleteBanner error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete banner' });
  }
};

module.exports = {
  createBanner,
  listBanners,
  listBannersByPlacement,
  updateBanner,
  deleteBanner,
};

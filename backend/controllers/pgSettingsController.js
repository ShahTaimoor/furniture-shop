const settingsModel = require('../models/postgres/settingsModel');
const { deleteImageOnCloudinary, uploadImageOnCloudinary } = require('../utils/cloudinary');

const ALLOWED_CURRENCIES = ['none', 'usd', 'gbp', 'eur', 'pkr'];

// Simple text fields stored as-is (trimmed).
const TEXT_FIELDS = [
  'siteName',
  'footerDescription',
  'footerHours',
  'footerShowroomAddress',
  'footerCarePhone',
  'footerStudioEmail',
  'newsletterHeading',
  'newsletterSubtext',
];

// Numeric fields — stored as text, parsed to a number on read.
const NUMERIC_FIELDS = ['standardShippingCost', 'expressShippingCost', 'freeShippingThreshold'];

// JSON {label,url}[] fields — stored as a JSON string, parsed back out on read.
const JSON_FIELDS = ['footerCustomerCareLinks'];

// Generic JSON-array fields for the storefront home page. Each entry is an
// arbitrary object; stored as a JSON string, parsed back to an array on read.
const RICH_JSON_FIELDS = ['homeTrustBadges', 'homeReviews'];

const DEFAULTS = {
  siteName: 'Ecommerce',
  footerDescription:
    'Contemporary furniture, custom upholstery, and handcrafted accessories designed for modern Pakistani homes.',
  footerHours: 'Open daily 10am – 8pm',
  footerShowroomAddress: '88 Furniture Blvd, Islamabad',
  footerCarePhone: '+92 311 400 0096',
  footerStudioEmail: 'Studio@furniture.pk',
  standardShippingCost: 0,
  expressShippingCost: 500,
  freeShippingThreshold: 150,
  footerCustomerCareLinks: [
    { label: 'Shipping & Delivery', url: '/shipping' },
    { label: 'Returns & Exchanges', url: '/returns' },
    { label: 'Care & Maintenance', url: '/care' },
    { label: 'Warranty', url: '/warranty' },
    { label: 'Track Order', url: '/orders' },
  ],
  newsletterHeading: 'Get 5% off your first order',
  newsletterSubtext:
    'Join our list for new arrivals, fitment guides and members-only deals. No spam, unsubscribe anytime.',
  homeTrustBadges: [
    { icon: 'shield', title: 'Precision Fit', subtitle: 'Moulded to OEM spec' },
    { icon: 'truck', title: 'Fast Delivery', subtitle: 'Dispatched in 48 hours' },
    { icon: 'wallet', title: 'Cash on Delivery', subtitle: 'Pay when it arrives' },
    { icon: 'badge', title: '6-Month Warranty', subtitle: 'On every panel' },
  ],
  homeReviews: [
    {
      name: 'Bilal A.',
      location: 'Lahore',
      rating: 5,
      text: 'Fitment on my Corolla was spot on. Paint shop matched it perfectly — looks factory.',
    },
    {
      name: 'Hamza R.',
      location: 'Islamabad',
      rating: 5,
      text: 'Ordered a ducktail spoiler, delivered in two days with COD. Quality is solid.',
    },
    {
      name: 'Usman K.',
      location: 'Karachi',
      rating: 4,
      text: 'Good ABS plastic, needed minor trimming but the finish is clean. Would buy again.',
    },
  ],
};

const parseJsonField = (value, fallback) => {
  if (value === undefined || value === null) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

// Shallow sanitiser for the storefront rich-JSON arrays: keep it an array of
// plain objects with primitive values only.
const sanitiseRichArray = (value, fallback) => {
  const arr = Array.isArray(value) ? value : parseJsonField(value, null);
  if (!Array.isArray(arr)) return fallback;
  const cleaned = arr
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    .map((item) => {
      const out = {};
      Object.keys(item).forEach((key) => {
        const v = item[key];
        if (['string', 'number', 'boolean'].includes(typeof v)) {
          out[key] = typeof v === 'string' ? v.trim() : v;
        }
      });
      return out;
    })
    .filter((item) => Object.keys(item).length > 0);
  return cleaned;
};

const buildSettingsPayload = (settings) => {
  const payload = { currency: settings.currency || 'none' };

  TEXT_FIELDS.forEach((key) => {
    payload[key] = settings[key] !== undefined && settings[key] !== null && settings[key] !== ''
      ? settings[key]
      : DEFAULTS[key];
  });

  NUMERIC_FIELDS.forEach((key) => {
    const parsed = Number(settings[key]);
    payload[key] = settings[key] !== undefined && settings[key] !== null && settings[key] !== '' && Number.isFinite(parsed)
      ? parsed
      : DEFAULTS[key];
  });

  JSON_FIELDS.forEach((key) => {
    payload[key] = parseJsonField(settings[key], DEFAULTS[key]);
  });

  RICH_JSON_FIELDS.forEach((key) => {
    payload[key] = sanitiseRichArray(settings[key], DEFAULTS[key]);
  });

  payload.siteLogo = settings.siteLogoUrl
    ? { secure_url: settings.siteLogoUrl, public_id: settings.siteLogoPublicId || null }
    : null;

  return payload;
};

// @route GET /api/pg/settings (public — storefront needs this to render prices/footer/logo)
const getSettings = async (req, res) => {
  try {
    const settings = await settingsModel.getAll();
    return res.status(200).json({ success: true, data: buildSettingsPayload(settings) });
  } catch (error) {
    console.error('pg getSettings error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch settings.' });
  }
};

// @route PUT /api/pg/settings (admin only)
const updateSettings = async (req, res) => {
  try {
    const body = req.body || {};
    const updates = {};

    if (body.currency !== undefined) {
      const normalized = String(body.currency).toLowerCase().trim();
      if (!ALLOWED_CURRENCIES.includes(normalized)) {
        return res.status(400).json({
          success: false,
          message: `Invalid currency. Must be one of: ${ALLOWED_CURRENCIES.join(', ')}`,
        });
      }
      updates.currency = normalized;
    }

    TEXT_FIELDS.forEach((key) => {
      if (body[key] !== undefined) {
        updates[key] = String(body[key]).trim();
      }
    });

    for (const key of NUMERIC_FIELDS) {
      if (body[key] === undefined) continue;
      const num = Number(body[key]);
      if (!Number.isFinite(num) || num < 0) {
        return res.status(400).json({ success: false, message: `${key} must be a non-negative number.` });
      }
      updates[key] = String(num);
    }

    for (const key of JSON_FIELDS) {
      if (body[key] === undefined) continue;
      const value = Array.isArray(body[key]) ? body[key] : parseJsonField(body[key], null);
      if (!Array.isArray(value)) {
        return res.status(400).json({ success: false, message: `${key} must be a list of {label, url}.` });
      }
      const cleaned = value
        .map((item) => ({
          label: String(item?.label || '').trim(),
          url: String(item?.url || '').trim(),
        }))
        .filter((item) => item.label);
      updates[key] = JSON.stringify(cleaned);
    }

    for (const key of RICH_JSON_FIELDS) {
      if (body[key] === undefined) continue;
      const cleaned = sanitiseRichArray(body[key], null);
      if (!Array.isArray(cleaned)) {
        return res.status(400).json({ success: false, message: `${key} must be a list of objects.` });
      }
      updates[key] = JSON.stringify(cleaned);
    }

    const settings = await settingsModel.setMany(updates);
    return res.status(200).json({
      success: true,
      message: 'Settings updated successfully.',
      data: buildSettingsPayload(settings),
    });
  } catch (error) {
    console.error('pg updateSettings error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update settings.' });
  }
};

// @route POST /api/pg/settings/logo (admin only, multipart 'logo' field)
const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No logo file provided.' });
    }

    const existing = await settingsModel.getAll();

    const { secure_url, public_id } = await uploadImageOnCloudinary(req.file.buffer, 'site', {
      mimeType: req.file.mimetype,
    });

    if (existing.siteLogoPublicId) {
      try {
        await deleteImageOnCloudinary(existing.siteLogoPublicId);
      } catch (cloudinaryError) {
        console.error('Error deleting previous logo:', cloudinaryError);
      }
    }

    const settings = await settingsModel.setMany({
      siteLogoUrl: secure_url,
      siteLogoPublicId: public_id,
    });

    return res.status(200).json({
      success: true,
      message: 'Logo updated successfully.',
      data: buildSettingsPayload(settings),
    });
  } catch (error) {
    console.error('pg uploadLogo error:', error);
    return res.status(500).json({ success: false, message: 'Unable to upload logo.' });
  }
};

// @route DELETE /api/pg/settings/logo (admin only) — revert to the default bundled logo
const deleteLogo = async (req, res) => {
  try {
    const existing = await settingsModel.getAll();
    if (existing.siteLogoPublicId) {
      try {
        await deleteImageOnCloudinary(existing.siteLogoPublicId);
      } catch (cloudinaryError) {
        console.error('Error deleting logo:', cloudinaryError);
      }
    }

    const settings = await settingsModel.setMany({ siteLogoUrl: '', siteLogoPublicId: '' });
    return res.status(200).json({
      success: true,
      message: 'Logo removed.',
      data: buildSettingsPayload(settings),
    });
  } catch (error) {
    console.error('pg deleteLogo error:', error);
    return res.status(500).json({ success: false, message: 'Unable to remove logo.' });
  }
};

module.exports = { getSettings, updateSettings, uploadLogo, deleteLogo, ALLOWED_CURRENCIES };

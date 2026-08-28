const settingsModel = require('../models/postgres/settingsModel');

const ALLOWED_CURRENCIES = ['none', 'usd', 'gbp', 'eur', 'pkr'];

// @route GET /api/pg/settings (public — storefront needs this to render prices)
const getSettings = async (req, res) => {
  try {
    const settings = await settingsModel.getAll();
    return res.status(200).json({
      success: true,
      data: {
        currency: settings.currency || 'none',
      },
    });
  } catch (error) {
    console.error('pg getSettings error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch settings.' });
  }
};

// @route PUT /api/pg/settings (admin only)
const updateSettings = async (req, res) => {
  try {
    const { currency } = req.body || {};
    const updates = {};

    if (currency !== undefined) {
      const normalized = String(currency).toLowerCase().trim();
      if (!ALLOWED_CURRENCIES.includes(normalized)) {
        return res.status(400).json({
          success: false,
          message: `Invalid currency. Must be one of: ${ALLOWED_CURRENCIES.join(', ')}`,
        });
      }
      updates.currency = normalized;
    }

    const settings = await settingsModel.setMany(updates);
    return res.status(200).json({
      success: true,
      message: 'Settings updated successfully.',
      data: {
        currency: settings.currency || 'none',
      },
    });
  } catch (error) {
    console.error('pg updateSettings error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update settings.' });
  }
};

module.exports = { getSettings, updateSettings, ALLOWED_CURRENCIES };

import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import settingsService from './settingsService';

// Mirrors backend/controllers/pgSettingsController.js DEFAULTS, so the footer/logo
// render sensibly before the first fetch resolves (or if it fails).
export const SETTINGS_DEFAULTS = {
  currency: 'PKR',
  siteName: 'Ecommerce',
  siteLogo: null,
  footerDescription:
    'Contemporary designs, custom options, and handcrafted accessories designed for modern homes.',
  footerHours: 'Open daily 10am – 8pm',
  footerShowroomAddress: 'Islamabad, Pakistan',
  footerStudioPhone: '+92 311 400 0096',
  footerStudioEmail: 'support@ecommerce.pk',
  footerShippingInfo:
    'Dispatched in 48 hours. Flexible delivery slots with tracking from warehouse to door.',
  footerInstagramUrl: 'https://instagram.com',
  footerFacebookUrl: 'https://facebook.com',
  footerTiktokUrl: 'https://tiktok.com',
  footerPinterestUrl: 'https://pinterest.com',
  standardShippingCost: 0,
  expressShippingCost: 500,
  freeShippingThreshold: 150,
  exchangeRates: {
    PKR: 1,
    USD: 0.0036,
    EUR: 0.0033,
    GBP: 0.0028,
    AED: 0.0132,
    SAR: 0.0135,
  },
  lastFetched: null,
  footerCustomerCareLinks: [
    { label: 'Shipping & Delivery', url: '/shipping' },
    { label: 'Returns & Exchanges', url: '/returns' },
    { label: 'Care & Maintenance', url: '/care' },
    { label: 'Warranty', url: '/warranty' },
    { label: 'Track Order', url: '/orders' },
  ],
};

const initialState = {
  ...SETTINGS_DEFAULTS,
  status: 'idle',
  error: null,
};

export const fetchSettings = createAsyncThunk(
  'settings/fetch',
  async (_, thunkAPI) => {
    try {
      const response = await settingsService.fetchSettings();
      return response?.data ?? {};
    } catch (error) {
      return thunkAPI.rejectWithValue(error);
    }
  }
);

const applySettings = (state, payload) => {
  Object.keys(SETTINGS_DEFAULTS).forEach((key) => {
    state[key] = payload?.[key] !== undefined && payload?.[key] !== null ? payload[key] : SETTINGS_DEFAULTS[key];
  });
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettings.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.status = 'succeeded';
        applySettings(state, action.payload);
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Unable to load settings';
      });
  },
});

export const selectCurrency = (state) => state.settings.currency;
export const selectSettingsStatus = (state) => state.settings.status;
export const selectSiteName = (state) => state.settings.siteName;
export const selectSiteLogo = (state) => state.settings.siteLogo;
export const selectFooterDescription = (state) => state.settings.footerDescription;
export const selectFooterHours = (state) => state.settings.footerHours;
export const selectFooterShowroomAddress = (state) => state.settings.footerShowroomAddress;
export const selectFooterCarePhone = (state) => state.settings.footerCarePhone;
export const selectFooterStudioEmail = (state) => state.settings.footerStudioEmail;
export const selectFooterCustomerCareLinks = (state) => state.settings.footerCustomerCareLinks;
export const selectStandardShippingCost = (state) => state.settings.standardShippingCost;
export const selectExpressShippingCost = (state) => state.settings.expressShippingCost;
export const selectFreeShippingThreshold = (state) => state.settings.freeShippingThreshold;

export default settingsSlice.reducer;

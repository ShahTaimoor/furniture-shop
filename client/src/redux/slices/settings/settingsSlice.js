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
  footerShowroomAddress: 'Shop 1, Street 1, Block A, Islamabad, Pakistan',
  footerStudioPhone: '+92 311 400 0096',
  footerStudioEmail: 'support@ecommerce.pk',
  footerShippingInfo:
    'Dispatched in 48 hours. Flexible delivery slots with tracking from warehouse to door.',
  footerFacebookUrl: '',
  footerWhatsappUrl: '',
  footerPinterestUrl: '',
  footerLinkedinUrl: '',
  footerInstagramUrl: '',
  footerYoutubeUrl: '',
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
export const selectFooterFacebookUrl = (state) => state.settings.footerFacebookUrl;
export const selectFooterWhatsappUrl = (state) => state.settings.footerWhatsappUrl;
export const selectFooterPinterestUrl = (state) => state.settings.footerPinterestUrl;
export const selectFooterLinkedinUrl = (state) => state.settings.footerLinkedinUrl;
export const selectFooterInstagramUrl = (state) => state.settings.footerInstagramUrl;
export const selectFooterYoutubeUrl = (state) => state.settings.footerYoutubeUrl;
export const selectStandardShippingCost = (state) => state.settings.standardShippingCost;
export const selectExpressShippingCost = (state) => state.settings.expressShippingCost;
export const selectFreeShippingThreshold = (state) => state.settings.freeShippingThreshold;
export const selectHomeTrustBadges = (state) => state.settings.homeTrustBadges;
export const selectHomeReviews = (state) => state.settings.homeReviews;
export const selectNewsletterHeading = (state) => state.settings.newsletterHeading;
export const selectNewsletterSubtext = (state) => state.settings.newsletterSubtext;

export default settingsSlice.reducer;

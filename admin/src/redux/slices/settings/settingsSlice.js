import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import settingsService from './settingsService';

// Mirrors backend/controllers/pgSettingsController.js DEFAULTS.
export const SETTINGS_DEFAULTS = {
  currency: 'none',
  siteName: 'Ecommerce',
  siteLogo: null,
  footerDescription:
    'Contemporary furniture, custom upholstery, and handcrafted accessories designed for modern Pakistani homes.',
  footerHours: 'Open daily 10am – 8pm',
  footerShowroomAddress: '88 Furniture Blvd, Islamabad',
  footerCarePhone: '+92 311 400 0096',
  footerStudioEmail: 'Studio@furniture.pk',
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
  updateStatus: 'idle',
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

export const updateSettings = createAsyncThunk(
  'settings/update',
  async (data, thunkAPI) => {
    try {
      const response = await settingsService.updateSettings(data);
      return response?.data ?? {};
    } catch (error) {
      return thunkAPI.rejectWithValue(error);
    }
  }
);

export const uploadLogo = createAsyncThunk(
  'settings/uploadLogo',
  async (file, thunkAPI) => {
    try {
      const response = await settingsService.uploadLogo(file);
      return response?.data ?? {};
    } catch (error) {
      return thunkAPI.rejectWithValue(error);
    }
  }
);

export const deleteLogo = createAsyncThunk(
  'settings/deleteLogo',
  async (_, thunkAPI) => {
    try {
      const response = await settingsService.deleteLogo();
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
      })
      .addCase(updateSettings.pending, (state) => {
        state.updateStatus = 'loading';
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.updateStatus = 'succeeded';
        applySettings(state, action.payload);
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.updateStatus = 'failed';
        state.error = action.payload || 'Unable to update settings';
      })
      .addCase(uploadLogo.fulfilled, (state, action) => {
        applySettings(state, action.payload);
      })
      .addCase(deleteLogo.fulfilled, (state, action) => {
        applySettings(state, action.payload);
      });
  },
});

export const selectCurrency = (state) => state.settings.currency;
export const selectSettingsStatus = (state) => state.settings.status;
export const selectSettingsUpdateStatus = (state) => state.settings.updateStatus;
export const selectSiteName = (state) => state.settings.siteName;
export const selectSiteLogo = (state) => state.settings.siteLogo;
export const selectFooterDescription = (state) => state.settings.footerDescription;
export const selectFooterHours = (state) => state.settings.footerHours;
export const selectFooterShowroomAddress = (state) => state.settings.footerShowroomAddress;
export const selectFooterCarePhone = (state) => state.settings.footerCarePhone;
export const selectFooterStudioEmail = (state) => state.settings.footerStudioEmail;
export const selectFooterCustomerCareLinks = (state) => state.settings.footerCustomerCareLinks;

export default settingsSlice.reducer;

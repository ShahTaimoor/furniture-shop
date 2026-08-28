import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import settingsService from './settingsService';

const initialState = {
  currency: 'none',
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
        state.currency = action.payload?.currency || 'none';
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Unable to load settings';
      });
  },
});

export const selectCurrency = (state) => state.settings.currency;
export const selectSettingsStatus = (state) => state.settings.status;

export default settingsSlice.reducer;

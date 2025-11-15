import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import orderTrackingService from './orderTrackingService';

const baseLocation = { lat: null, lng: null, updatedAt: null };

const buildInitialState = () => ({
  loading: false,
  error: null,
  orderId: null,
  status: null,
  history: [],
  timelineStatuses: [],
  location: { ...baseLocation },
  customer: null,
  amount: null,
  trackingNumber: null,
  lastUpdated: null,
});

const mergeTrackingState = (state, payload = {}) => {
  if (!payload) return;
  state.orderId = payload.orderId ?? state.orderId;
  state.status = payload.status ?? state.status;
  state.history = payload.history ?? state.history;
  state.timelineStatuses = payload.timelineStatuses ?? state.timelineStatuses;
  state.location = payload.location
    ? {
        lat: payload.location.lat ?? null,
        lng: payload.location.lng ?? null,
        updatedAt: payload.location.updatedAt ?? payload.lastUpdated ?? state.location.updatedAt,
      }
    : state.location;
  state.customer = payload.customer ?? state.customer;
  state.amount = payload.amount ?? state.amount;
  state.trackingNumber = payload.trackingNumber ?? state.trackingNumber;
  state.lastUpdated = payload.lastUpdated ?? state.lastUpdated;
};

export const fetchOrderTracking = createAsyncThunk(
  'orderTracking/fetch',
  async (orderId, thunkAPI) => {
    try {
      const data = await orderTrackingService.fetchTracking(orderId);
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error);
    }
  }
);

const orderTrackingSlice = createSlice({
  name: 'orderTracking',
  initialState: buildInitialState(),
  reducers: {
    mergeTrackingSnapshot: (state, action) => {
      mergeTrackingState(state, action.payload);
    },
    updateDriverLocationLive: (state, action) => {
      state.location = {
        lat: action.payload?.lat ?? state.location.lat,
        lng: action.payload?.lng ?? state.location.lng,
        updatedAt: action.payload?.updatedAt ?? new Date().toISOString(),
      };
      state.lastUpdated = state.location.updatedAt;
    },
    resetOrderTracking: () => buildInitialState(),
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrderTracking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrderTracking.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        mergeTrackingState(state, action.payload);
      })
      .addCase(fetchOrderTracking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load tracking information';
      });
  },
});

export const {
  mergeTrackingSnapshot,
  updateDriverLocationLive,
  resetOrderTracking,
} = orderTrackingSlice.actions;

export default orderTrackingSlice.reducer;


import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import bannersService from './bannersService';

const initialState = {
  items: [],
  status: 'idle',
  error: null,
  byPlacement: {},
  placementStatus: {}
};

export const fetchBanners = createAsyncThunk(
  'banners/fetchAll',
  async ({ status } = {}, thunkAPI) => {
    try {
      const response = await bannersService.fetchBanners({ status });
      return response?.data ?? [];
    } catch (error) {
      return thunkAPI.rejectWithValue(error);
    }
  }
);

export const fetchBannersForPlacement = createAsyncThunk(
  'banners/fetchPlacement',
  async (placement, thunkAPI) => {
    try {
      const response = await bannersService.fetchBannersByPlacement(placement);
      return {
        placement,
        banners: response?.data ?? []
      };
    } catch (error) {
      return thunkAPI.rejectWithValue({ placement, error });
    }
  }
);

export const createBanner = createAsyncThunk(
  'banners/create',
  async (payload, thunkAPI) => {
    try {
      const response = await bannersService.createBanner(payload);
      return response?.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error);
    }
  }
);

export const updateBanner = createAsyncThunk(
  'banners/update',
  async ({ id, data }, thunkAPI) => {
    try {
      const response = await bannersService.updateBanner({ id, data });
      return response?.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error);
    }
  }
);

export const deleteBanner = createAsyncThunk(
  'banners/delete',
  async (id, thunkAPI) => {
    try {
      await bannersService.deleteBanner(id);
      return id;
    } catch (error) {
      return thunkAPI.rejectWithValue(error);
    }
  }
);

const bannersSlice = createSlice({
  name: 'banners',
  initialState,
  reducers: {
    clearPlacementCache(state, action) {
      if (action.payload) {
        delete state.byPlacement[action.payload];
        delete state.placementStatus[action.payload];
      } else {
        state.byPlacement = {};
        state.placementStatus = {};
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBanners.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchBanners.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchBanners.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Unable to load banners';
      })
      .addCase(createBanner.fulfilled, (state, action) => {
        if (action.payload) {
          state.items = [action.payload, ...state.items];
          const placement = action.payload.placement;
          if (placement && state.byPlacement[placement]) {
            state.byPlacement[placement] = [action.payload, ...state.byPlacement[placement]];
          }
        }
      })
      .addCase(updateBanner.fulfilled, (state, action) => {
        const updated = action.payload;
        if (!updated?._id) return;
        state.items = state.items.map((banner) =>
          banner._id === updated._id ? updated : banner
        );
        Object.keys(state.byPlacement).forEach((placement) => {
          state.byPlacement[placement] = state.byPlacement[placement].map((banner) =>
            banner._id === updated._id ? updated : banner
          );
        });
      })
      .addCase(deleteBanner.fulfilled, (state, action) => {
        const id = action.payload;
        state.items = state.items.filter((banner) => banner._id !== id);
        Object.keys(state.byPlacement).forEach((placement) => {
          state.byPlacement[placement] = state.byPlacement[placement].filter(
            (banner) => banner._id !== id
          );
        });
      })
      .addCase(fetchBannersForPlacement.pending, (state, action) => {
        const placement = action.meta.arg;
        state.placementStatus[placement] = 'loading';
      })
      .addCase(fetchBannersForPlacement.fulfilled, (state, action) => {
        const { placement, banners } = action.payload;
        state.byPlacement[placement] = banners;
        state.placementStatus[placement] = 'succeeded';
      })
      .addCase(fetchBannersForPlacement.rejected, (state, action) => {
        const placement = action?.payload?.placement ?? action.meta.arg;
        state.placementStatus[placement] = 'failed';
      });
  }
});

export const { clearPlacementCache } = bannersSlice.actions;

export const selectBanners = (state) => state.banners.items;
export const selectBannersStatus = (state) => state.banners.status;
export const selectPlacementBanners = (placement) => (state) =>
  state.banners.byPlacement[placement] || [];
export const selectPlacementStatus = (placement) => (state) =>
  state.banners.placementStatus[placement] || 'idle';

export default bannersSlice.reducer;



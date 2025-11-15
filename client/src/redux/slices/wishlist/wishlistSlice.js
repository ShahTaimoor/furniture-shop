import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import wishlistService from './wishlistService';

const buildErrorMessage = (error) => {
  if (typeof error === 'string') return error;
  return error?.response?.data?.message || error?.message || 'Something went wrong';
};

const initialState = {
  items: [],
  status: 'idle',
  error: null,
  lastUpdated: null,
};

export const fetchWishlist = createAsyncThunk(
  'wishlist/fetchWishlist',
  async (_, thunkAPI) => {
    try {
      const response = await wishlistService.fetchWishlist();
      return response?.items ?? [];
    } catch (error) {
      return thunkAPI.rejectWithValue(buildErrorMessage(error));
    }
  }
);

export const addWishlistItem = createAsyncThunk(
  'wishlist/addWishlistItem',
  async ({ productId, variantId }, thunkAPI) => {
    try {
      const response = await wishlistService.addWishlistItem({ productId, variantId });
      return {
        items: response?.items ?? [],
        message: response?.message ?? 'Product saved to wishlist.',
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(buildErrorMessage(error));
    }
  }
);

export const removeWishlistItem = createAsyncThunk(
  'wishlist/removeWishlistItem',
  async ({ productId, variantId }, thunkAPI) => {
    try {
      const response = await wishlistService.removeWishlistItem({ productId, variantId });
      return {
        items: response?.items ?? [],
        message: response?.message ?? 'Product removed from wishlist.',
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(buildErrorMessage(error));
    }
  }
);

export const clearWishlistItems = createAsyncThunk(
  'wishlist/clearWishlistItems',
  async (_, thunkAPI) => {
    try {
      const response = await wishlistService.clearWishlist();
      return {
        items: response?.items ?? [],
        message: response?.message ?? 'Wishlist cleared.',
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(buildErrorMessage(error));
    }
  }
);

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    resetWishlistState(state) {
      state.items = [];
      state.status = 'idle';
      state.error = null;
      state.lastUpdated = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWishlist.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
        state.error = null;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Unable to load wishlist.';
      })
      .addCase(addWishlistItem.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(addWishlistItem.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.items;
        state.error = null;
        state.lastUpdated = Date.now();
      })
      .addCase(addWishlistItem.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Unable to add product to wishlist.';
      })
      .addCase(removeWishlistItem.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(removeWishlistItem.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.items;
        state.error = null;
        state.lastUpdated = Date.now();
      })
      .addCase(removeWishlistItem.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Unable to remove product from wishlist.';
      })
      .addCase(clearWishlistItems.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(clearWishlistItems.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.items;
        state.error = null;
        state.lastUpdated = Date.now();
      })
      .addCase(clearWishlistItems.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Unable to clear wishlist.';
      });
  },
});

export const { resetWishlistState } = wishlistSlice.actions;

export const selectWishlistItems = (state) => state.wishlist.items;
export const selectWishlistCount = (state) => state.wishlist.items.length;

export default wishlistSlice.reducer;

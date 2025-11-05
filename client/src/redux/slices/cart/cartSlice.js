import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as cartService from './cartService';

const initialState = {
  items: [],
  status: 'idle',
  error: null,
};

// Fetch cart items
export const fetchCart = createAsyncThunk('fetchCart', async (_, thunkAPI) => {
  try {
    return await cartService.fetchCart();
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || err.message);
  }
});

// Add item to cart
export const addToCart = createAsyncThunk('addToCart', async ({ productId, quantity }, thunkAPI) => {
  try {
    return await cartService.addToCart({ productId, quantity });
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || err.message);
  }
});

// Remove item from cart
export const removeFromCart = createAsyncThunk('removeFromCart', async (productId, thunkAPI) => {
  try {
    return await cartService.removeFromCart(productId);
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || err.message);
  }
});

// Empty cart
export const emptyCart = createAsyncThunk('emptyCart', async (_, thunkAPI) => {
  try {
    return await cartService.emptyCart();
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || err.message);
  }
});

// Update cart item quantity
export const updateCartQuantity = createAsyncThunk(
  'cart/updateCartQuantity',
  async ({ productId, quantity }, thunkAPI) => {
    try {
      return await cartService.updateCartQuantity({ productId, quantity });
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Cart
      .addCase(fetchCart.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.items || [];
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // Add to Cart
      .addCase(addToCart.fulfilled, (state, action) => {
        state.items = action.payload.items || [];
      })
      
      // Remove from Cart
      .addCase(removeFromCart.fulfilled, (state, action) => {
        state.items = action.payload.items || [];
      })
      
      // Empty Cart
      .addCase(emptyCart.fulfilled, (state) => {
        state.items = [];
      })
      
      // Update Cart Quantity
      .addCase(updateCartQuantity.fulfilled, (state, action) => {
        state.items = action.payload.items || [];
      });
  },
});

export default cartSlice.reducer;

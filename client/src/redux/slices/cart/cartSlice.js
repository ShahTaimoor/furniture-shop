import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as cartService from './cartService';
import {
  getGuestCartItems,
  addGuestCartItem,
  removeGuestCartItem,
  updateGuestCartItemQuantity,
  clearGuestCartItems,
} from '../../../utils/guestCart';

const initialState = {
  items: [],
  status: 'idle',
  error: null,
};

// Turns the lightweight {productId, variationId, quantity} entries stored in
// localStorage into the same {product, quantity, variationId} shape the server
// cart returns, so Cart.jsx/Checkout.jsx render guest and logged-in carts identically.
const hydrateGuestCart = async () => {
  const stored = getGuestCartItems();
  if (stored.length === 0) return [];

  const productIds = Array.from(new Set(stored.map((item) => item.productId)));
  const products = await cartService.fetchProductsByIds(productIds);
  const productsById = new Map(products.map((product) => [product._id, product]));

  return stored
    .map((item) => {
      const product = productsById.get(item.productId);
      if (!product) return null;
      return { product, quantity: item.quantity, variationId: item.variationId || null };
    })
    .filter(Boolean);
};

const isGuest = (thunkAPI) => !thunkAPI.getState().auth.isAuthenticated;

// Fetch cart items
export const fetchCart = createAsyncThunk('fetchCart', async (_, thunkAPI) => {
  try {
    if (isGuest(thunkAPI)) {
      return { items: await hydrateGuestCart() };
    }
    return await cartService.fetchCart();
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || err.message);
  }
});

// Add item to cart
export const addToCart = createAsyncThunk('addToCart', async ({ productId, quantity, variationId }, thunkAPI) => {
  try {
    if (isGuest(thunkAPI)) {
      addGuestCartItem({ productId, variationId, quantity });
      return { items: await hydrateGuestCart() };
    }
    return await cartService.addToCart({ productId, quantity, variationId });
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || err.message);
  }
});

// Remove item from cart
export const removeFromCart = createAsyncThunk('removeFromCart', async (productId, thunkAPI) => {
  try {
    if (isGuest(thunkAPI)) {
      removeGuestCartItem(productId);
      return { items: await hydrateGuestCart() };
    }
    return await cartService.removeFromCart(productId);
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || err.message);
  }
});

// Empty cart
export const emptyCart = createAsyncThunk('emptyCart', async (_, thunkAPI) => {
  try {
    if (isGuest(thunkAPI)) {
      clearGuestCartItems();
      return;
    }
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
      if (isGuest(thunkAPI)) {
        updateGuestCartItemQuantity(productId, quantity);
        return { items: await hydrateGuestCart() };
      }
      return await cartService.updateCartQuantity({ productId, quantity });
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// Merges whatever's in the guest (localStorage) cart into the now-logged-in user's
// real server cart, then clears local storage. Call this right after login/signup.
export const mergeGuestCartIntoServer = createAsyncThunk(
  'cart/mergeGuestCartIntoServer',
  async (_, thunkAPI) => {
    const guestItems = getGuestCartItems();
    if (guestItems.length === 0) {
      return await cartService.fetchCart();
    }
    try {
      for (const item of guestItems) {
        await cartService.addToCart({
          productId: item.productId,
          quantity: item.quantity,
          variationId: item.variationId || undefined,
        });
      }
    } finally {
      clearGuestCartItems();
    }
    try {
      return await cartService.fetchCart();
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
      })

      // Merge guest cart on login
      .addCase(mergeGuestCartIntoServer.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.items || [];
      });
  },
});

export default cartSlice.reducer;

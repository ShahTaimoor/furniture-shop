import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import orderService from "./orderService";

// Fetch Pending Order Count
export const fetchPendingOrderCount = createAsyncThunk(
  'orders/fetchPendingOrderCount',
  async (_, thunkAPI) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const res = await fetch(`${API_URL}/pending-orders-count`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      return data.count;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message || 'Failed to fetch pending order count');
    }
  }
);

// Add Order
export const addOrder = createAsyncThunk(
  'orders/addOrder',
  async (orderData, thunkAPI) => {
    try {
      const res = await orderService.addOrder(orderData);
      return res;
    } catch (error) {
      return thunkAPI.rejectWithValue(error);
    }
  }
);


export const updateOrderStatus = createAsyncThunk(
  'orders/updateStatus',
  async ({ orderId, status, packerName }, thunkAPI) => {
    try {
      const res = await orderService.updateOrderStatus({ orderId, status, packerName });
      return res; // Return the full response
    } catch (error) {
      return thunkAPI.rejectWithValue(error);
    }
  }
);


// Fetch Orders (User)
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (_, thunkAPI) => {
    try {
      const res = await orderService.getAllOrder();
      return res;
    } catch (error) {
      return thunkAPI.rejectWithValue(error);
    }
  }
);

// Fetch Orders (Admin)
export const fetchOrdersAdmin = createAsyncThunk(
  'orders/fetchOrdersAdmin',
  async ({ page = 1, limit = 24 } = {}, thunkAPI) => {
    try {
      const res = await orderService.getAllOrderAdmin(page, limit);
      return res;
    } catch (error) {
      return thunkAPI.rejectWithValue(error);
    }
  }
);

// Delete Order
export const deleteOrder = createAsyncThunk(
  'orders/deleteOrder',
  async (orderId, thunkAPI) => {
    try {
      const res = await orderService.deleteOrder(orderId);
      return { orderId, ...res };
    } catch (error) {
      return thunkAPI.rejectWithValue(error);
    }
  }
);

// Bulk Delete Orders
export const bulkDeleteOrders = createAsyncThunk(
  'orders/bulkDeleteOrders',
  async (orderIds, thunkAPI) => {
    try {
      const res = await orderService.bulkDeleteOrders(orderIds);
      return { orderIds, ...res };
    } catch (error) {
      return thunkAPI.rejectWithValue(error);
    }
  }
);

const initialState = {
  orders: [],
  metrics: null,
  status: 'idle',
  newOrdersCount: 0,
  error: null,
  metricsStatus: 'idle',
  metricsError: null,
  pendingOrderCount: 0,
};

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Orders (User)
      .addCase(fetchOrders.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.orders = action.payload.data;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // Fetch Orders (Admin)
      .addCase(fetchOrdersAdmin.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchOrdersAdmin.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.orders = action.payload.data;
        state.totalPages = action.payload.totalPages || 1;
        state.currentPage = action.payload.currentPage || 1;
      })
      .addCase(fetchOrdersAdmin.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // Add Order
      .addCase(addOrder.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(addOrder.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.orders.push(action.payload.data);
      })
      .addCase(addOrder.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(updateOrderStatus.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const updatedOrder = action.payload.data;
        const index = state.orders.findIndex(order => order._id === updatedOrder._id);
        if (index !== -1) {
          state.orders[index] = updatedOrder;
        }
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchPendingOrderCount.fulfilled, (state, action) => {
        state.pendingOrderCount = action.payload;
      })
      .addCase(deleteOrder.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteOrder.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Remove the deleted order from the orders array
        state.orders = state.orders.filter(order => order._id !== action.payload.orderId);
      })
      .addCase(deleteOrder.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(bulkDeleteOrders.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(bulkDeleteOrders.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Remove all deleted orders from the orders array
        state.orders = state.orders.filter(order => !action.payload.orderIds.includes(order._id));
      })
      .addCase(bulkDeleteOrders.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
  },
});

export default ordersSlice.reducer;

import axiosInstance from '../auth/axiosInstance';

// Get Orders By User ID
const getAllOrder = async () => {
  try {
    const axiosResponse = await axiosInstance.get('/get-orders-by-user-id', {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return axiosResponse.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || error.message || 'An unexpected error occurred while fetching orders.';
    return Promise.reject(errorMessage);
  }
};

// Add New Order
const addOrder = async (orderData) => {
  try {
    const axiosResponse = await axiosInstance.post('/order', orderData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return axiosResponse.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || error.message || 'An unexpected error occurred while adding the order.';
    return Promise.reject(errorMessage);
  }
};

// Get Orders By User ID
// Get Orders By User ID (Admin)
const getAllOrderAdmin = async (page = 1, limit = 24) => {
  try {
    const axiosResponse = await axiosInstance.get('/get-all-orders', {
      params: { page, limit },
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return axiosResponse.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || error.message || 'An unexpected error occurred while fetching orders.';
    return Promise.reject(errorMessage);
  }
};

// Get Pending Order Count (Admin)
const getPendingOrderCount = async () => {
  try {
    const axiosResponse = await axiosInstance.get('/pending-orders-count', {
      headers: { 'Content-Type': 'application/json' },
    });
    return axiosResponse.data.count;
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || error.message || 'An unexpected error occurred while fetching pending order count.';
    return Promise.reject(errorMessage);
  }
};


// Update Order Status
const updateOrderStatus = async ({ orderId, status, packerName }) => {
  try {
    const axiosResponse = await axiosInstance.put(
      `/update-order-status/${orderId}`,
      { status, packerName },
      { headers: { 'Content-Type': 'application/json' } }
    );
    return axiosResponse.data;
  } catch (error) {
    const errorMessage = 
      error.response?.data?.message || error.message ||
      'An unexpected error occurred while updating order';
    return Promise.reject(errorMessage);
  }
};

// Delete Order
const deleteOrder = async (orderId) => {
  try {
    const axiosResponse = await axiosInstance.delete(`/delete-order/${orderId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return axiosResponse.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || error.message || 'An unexpected error occurred while deleting the order.';
    return Promise.reject(errorMessage);
  }
};

// Bulk Delete Orders
const bulkDeleteOrders = async (orderIds) => {
  try {
    const axiosResponse = await axiosInstance.delete('/bulk-delete-orders', {
      data: { orderIds },
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return axiosResponse.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || error.message || 'An unexpected error occurred while deleting the orders.';
    return Promise.reject(errorMessage);
  }
};

const orderService = { getAllOrder, addOrder, getAllOrderAdmin, updateOrderStatus, getPendingOrderCount, deleteOrder, bulkDeleteOrders };

export default orderService;

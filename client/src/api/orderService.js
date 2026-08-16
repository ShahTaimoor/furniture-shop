import axiosInstance from '../redux/slices/auth/axiosInstance';

/**
 * Get pending orders count (Admin only)
 * Uses Redis caching for real-time updates
 */
export const getPendingOrdersCount = async () => {
  try {
    const response = await axiosInstance.get('/pg/pending-orders-count');
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || error.message || 'Failed to fetch pending orders count';
    return Promise.reject(errorMessage);
  }
};

/**
 * Get all orders with pagination (Admin only)
 */
export const getAllOrders = async ({ page = 1, limit = 10 } = {}) => {
  try {
    const response = await axiosInstance.get('/pg/get-all-orders', {
      params: { page, limit },
    });
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || error.message || 'Failed to fetch orders';
    return Promise.reject(errorMessage);
  }
};

/**
 * Get admin metrics (Admin only)
 * Uses Redis caching for faster responses
 */
export const getAdminMetrics = async ({ startDate, endDate } = {}) => {
  try {
    const response = await axiosInstance.get('/pg/get-metrics', {
      params: { startDate, endDate },
    });
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || error.message || 'Failed to fetch metrics';
    return Promise.reject(errorMessage);
  }
};

export default {
  getPendingOrdersCount,
  getAllOrders,
  getAdminMetrics,
};


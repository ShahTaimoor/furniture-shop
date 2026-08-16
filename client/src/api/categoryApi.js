import axiosInstance from '../redux/slices/auth/axiosInstance';

/**
 * Category API Service
 * Backend caches category list in Redis for 1 hour
 */

/**
 * Get all categories (tree and flat structure)
 * Backend caches this in Redis for 1 hour
 */
export const getCategories = async () => {
  try {
    const response = await axiosInstance.get('/pg/category/list');

    return {
      success: response.data.success,
      data: {
        tree: response.data.data?.tree || [],
        flat: response.data.data?.flat || [],
      },
    };
  } catch (error) {
    throw {
      message: error.response?.data?.message || error.message || 'Failed to fetch categories',
      status: error.response?.status,
      data: { tree: [], flat: [] },
    };
  }
};

export default {
  getCategories,
};


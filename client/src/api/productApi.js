import axiosInstance from '../redux/slices/auth/axiosInstance';

/**
 * Product API Service
 * All endpoints use backend Redis caching
 */

/**
 * Get all products with filters
 * Backend caches this in Redis for 1 hour
 */
export const getProducts = async (filters = {}) => {
  try {
    const {
      category = 'all',
      search = '',
      page = 1,
      limit = 24,
      stockFilter = 'all',
      sortBy = 'az',
      productIds,
      tags,
      minPrice,
      maxPrice,
      status,
      featured,
      bestseller,
      onSale,
      attributes,
      variations,
      visibility,
    } = filters;

    const response = await axiosInstance.get('/pg/get-products', {
      params: {
        category,
        search,
        page,
        limit,
        stockFilter,
        sortBy,
        productIds,
        tags,
        minPrice,
        maxPrice,
        status,
        featured,
        bestseller,
        onSale,
        attributes,
        variations,
        visibility,
      },
    });

    return {
      success: response.data.success,
      data: response.data.data || [],
      pagination: response.data.pagination || {},
      message: response.data.message,
    };
  } catch (error) {
    throw {
      message: error.response?.data?.message || error.message || 'Failed to fetch products',
      status: error.response?.status,
      data: null,
    };
  }
};

/**
 * Get single product by ID or slug
 * Backend caches this in Redis for 1 hour
 */
export const getProduct = async (identifier) => {
  try {
    const isObjectId = /^[a-f\d]{24}$/i.test(identifier);
    const endpoint = isObjectId
      ? `/pg/single-product/${identifier}`
      : `/pg/single-product/slug/${identifier}`;

    const response = await axiosInstance.get(endpoint);

    return {
      success: response.data.success,
      data: response.data.product,
      message: response.data.message,
    };
  } catch (error) {
    throw {
      message: error.response?.data?.message || error.message || 'Failed to fetch product',
      status: error.response?.status,
      data: null,
    };
  }
};

/**
 * Get new arrivals
 * Backend caches this in Redis
 */
export const getNewArrivals = async (limit = 12) => {
  try {
    const response = await axiosInstance.get('/pg/new-arrivals', {
      params: { limit },
    });

    return {
      success: response.data.success,
      data: response.data.data || [],
      total: response.data.total || 0,
    };
  } catch (error) {
    throw {
      message: error.response?.data?.message || error.message || 'Failed to fetch new arrivals',
      status: error.response?.status,
      data: [],
    };
  }
};

/**
 * Get best sellers
 * Backend caches this in Redis
 */
export const getBestSellers = async (limit = 12) => {
  try {
    const response = await axiosInstance.get('/pg/get-products', {
      params: {
        limit,
        bestseller: true,
        sortBy: 'bestsellers',
      },
    });

    return {
      success: response.data.success,
      data: response.data.data || [],
      pagination: response.data.pagination || {},
    };
  } catch (error) {
    throw {
      message: error.response?.data?.message || error.message || 'Failed to fetch best sellers',
      status: error.response?.status,
      data: [],
    };
  }
};

export default {
  getProducts,
  getProduct,
  getNewArrivals,
  getBestSellers,
};


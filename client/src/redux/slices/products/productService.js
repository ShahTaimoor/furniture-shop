import axiosInstance from '../auth/axiosInstance';

// Create product
const createProduct = async (inputValues) => {
    try {
        const axiosResponse = await axiosInstance.post(
            '/create-product',
            inputValues,
            {
                headers: { 'Content-Type': 'multipart/form-data' },
            }
        );
        return axiosResponse.data;
    } catch (error) {
        const errorMessage =
            error.response?.data?.message || error.message || 'Something went wrong';
        return Promise.reject(errorMessage);
    }
};

// all product
const allProduct = async ({
  category = 'all',
  searchTerm = '',
  page = 1,
  limit = 2000,
  stockFilter,
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
} = {}) => {
    try {
      const response = await axiosInstance.get(
        '/get-products',
        {
          params: {
            category,
            search: searchTerm,
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
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Something went wrong';
      return Promise.reject(errorMessage);
    }
};

// single product
const isObjectId = (value) => /^[a-f\d]{24}$/i.test(value);

const getSingleProd = async (identifier) => {
    try {
        const endpoint = isObjectId(identifier)
            ? `/single-product/${identifier}`
            : `/single-product/slug/${identifier}`;

        const axiosResponse = await axiosInstance.get(
            endpoint,
            {
                headers: { 'Content-Type': 'application/json' },
            }
        );
        return axiosResponse.data;
    } catch (error) {
        const errorMessage =
            error.response?.data?.message || error.message || 'Something went wrong';
        return Promise.reject(errorMessage);
    }
};

// update product
const updateProd = async ({ inputValues, id }) => {
    try {
        const axiosResponse = await axiosInstance.put(
            `/update-product/${id}`,
            inputValues,
            {
                headers: { 'Content-Type': 'multipart/form-data' },
            }
        );
        return axiosResponse.data;
    } catch (error) {
        const errorMessage =
            error.response?.data?.message || error.message || 'Something went wrong';
        return Promise.reject(errorMessage);
    }
};

// delete product
const deleteProduct = async (id) => {
    try {
        const axiosResponse = await axiosInstance.delete(
            `/delete-product/${id}`,
            {
                headers: { 'Content-Type': 'application/json' },
            }
        );
        return axiosResponse.data;
    } catch (error) {
        const errorMessage =
            error.response?.data?.message || error.message || 'Something went wrong';
        return Promise.reject(errorMessage);
    }
};

// import products from Excel
const importProductsFromExcel = async (excelFile) => {
    try {
        const formData = new FormData();
        formData.append('excelFile', excelFile);
        
        const axiosResponse = await axiosInstance.post(
            '/import-excel',
            formData,
            {
                headers: { 'Content-Type': 'multipart/form-data' },
            }
        );
        return axiosResponse.data;
    } catch (error) {
        const errorMessage =
            error.response?.data?.message || error.message || 'Something went wrong';
        return Promise.reject(errorMessage);
    }
};

// update product stock status
const updateProductStock = async ({ id, stock }) => {
    try {
        const axiosResponse = await axiosInstance.put(
            `/update-product-stock/${id}`,
            { stock },
            {
                headers: { 'Content-Type': 'application/json' },
            }
        );
        return axiosResponse.data;
    } catch (error) {
        const errorMessage =
            error.response?.data?.message || error.message || 'Something went wrong';
        return Promise.reject(errorMessage);
    }
};

// search suggestions/autocomplete
const getSearchSuggestions = async (query, limit = 10) => {
    try {
        const response = await axiosInstance.get(
            '/search/suggest',
            {
                params: { q: query, limit },
                headers: { 'Content-Type': 'application/json' },
            }
        );
        return response.data;
    } catch (error) {
        const errorMessage =
            error.response?.data?.message || error.message || 'Something went wrong';
        return Promise.reject(errorMessage);
    }
};

const getProductReviews = async (identifier, { page = 1, limit = 10, sort = 'recent' } = {}) => {
    try {
        const axiosResponse = await axiosInstance.get(
            `/products/${identifier}/reviews`,
            {
                params: { page, limit, sort },
                headers: { 'Content-Type': 'application/json' },
            }
        );
        return axiosResponse.data;
    } catch (error) {
        const errorMessage =
            error.response?.data?.message || error.message || 'Something went wrong';
        return Promise.reject(errorMessage);
    }
};

const createProductReview = async (identifier, payload) => {
    try {
        const axiosResponse = await axiosInstance.post(
            `/products/${identifier}/reviews`,
            payload,
            {
                headers: { 'Content-Type': 'application/json' },
            }
        );
        return axiosResponse.data;
    } catch (error) {
        const errorMessage =
            error.response?.data?.message || error.message || 'Something went wrong';
        return Promise.reject(errorMessage);
    }
};

const updateProductReview = async (identifier, reviewId, payload) => {
    try {
        const axiosResponse = await axiosInstance.put(
            `/products/${identifier}/reviews/${reviewId}`,
            payload,
            {
                headers: { 'Content-Type': 'application/json' },
            }
        );
        return axiosResponse.data;
    } catch (error) {
        const errorMessage =
            error.response?.data?.message || error.message || 'Something went wrong';
        return Promise.reject(errorMessage);
    }
};

const deleteProductReview = async (identifier, reviewId) => {
    try {
        const axiosResponse = await axiosInstance.delete(
            `/products/${identifier}/reviews/${reviewId}`,
            {
                headers: { 'Content-Type': 'application/json' },
            }
        );
        return axiosResponse.data;
    } catch (error) {
        const errorMessage =
            error.response?.data?.message || error.message || 'Something went wrong';
        return Promise.reject(errorMessage);
    }
};

const getAllReviewsAdmin = async ({ page = 1, limit = 20, sort = 'recent' } = {}) => {
    try {
        const axiosResponse = await axiosInstance.get(
            '/reviews',
            {
                params: { page, limit, sort },
                headers: { 'Content-Type': 'application/json' },
            }
        );
        return axiosResponse.data;
    } catch (error) {
        const errorMessage =
            error.response?.data?.message || error.message || 'Something went wrong';
        return Promise.reject(errorMessage);
    }
};

// Get new arrivals
const getNewArrivals = async (limit = 12) => {
    try {
        const axiosResponse = await axiosInstance.get(
            '/new-arrivals',
            {
                params: { limit },
                headers: { 'Content-Type': 'application/json' },
            }
        );
        return axiosResponse.data;
    } catch (error) {
        const errorMessage =
            error.response?.data?.message || error.message || 'Something went wrong';
        return Promise.reject(errorMessage);
    }
};

const getBestSellers = async (limit = 12) => {
    try {
        const primaryResponse = await axiosInstance.get('/get-products', {
            params: {
                limit,
                bestseller: true,
                sortBy: 'bestsellers',
            },
            headers: { 'Content-Type': 'application/json' },
        });

        if (primaryResponse?.data?.data && primaryResponse.data.data.length > 0) {
            return primaryResponse.data;
        }

        const fallbackResponse = await axiosInstance.get('/get-products', {
            params: {
                limit,
                sortBy: 'bestsellers',
            },
            headers: { 'Content-Type': 'application/json' },
        });

        return fallbackResponse.data;
    } catch (error) {
        const errorMessage =
            error.response?.data?.message || error.message || 'Something went wrong';
        return Promise.reject(errorMessage);
    }
};

const replyToProductReview = async (identifier, reviewId, payload) => {
    try {
        const axiosResponse = await axiosInstance.put(
            `/products/${identifier}/reviews/${reviewId}/reply`,
            payload,
            {
                headers: { 'Content-Type': 'application/json' },
            }
        );
        return axiosResponse.data;
    } catch (error) {
        const errorMessage =
            error.response?.data?.message || error.message || 'Something went wrong';
        return Promise.reject(errorMessage);
    }
};

const productService = {
    createProduct,
    allProduct,
    getSingleProd,
    updateProd,
    deleteProduct,
    importProductsFromExcel,
    updateProductStock,
    getSearchSuggestions,
    getProductReviews,
    createProductReview,
    updateProductReview,
    deleteProductReview,
    replyToProductReview,
    getAllReviewsAdmin,
    getNewArrivals,
    getBestSellers,
};

export default productService;
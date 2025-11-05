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
const allProduct = async (category = 'all', searchTerm = '', page = 1, limit = 2000, stockFilter, sortBy = 'az', productIds) => {
    try {
      const response = await axiosInstance.get(
        '/get-products',
        {
          params: { category, search: searchTerm, page, limit, stockFilter, sortBy, productIds },
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
const getSingleProd = async (id) => {
    try {
        const axiosResponse = await axiosInstance.get(
            `/single-product/${id}`,
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
            '/search-suggestions',
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

const productService = { createProduct, allProduct, getSingleProd, updateProd, deleteProduct, importProductsFromExcel, updateProductStock, getSearchSuggestions };

export default productService;
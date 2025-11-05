import axiosInstance from '../auth/axiosInstance';

// Create Category
const createCat = async (inputValues) => {
    try {
        const axiosResponse = await axiosInstance.post(
            '/create-category',
            inputValues
        );
        return axiosResponse.data;
    } catch (error) {
        const errorMessage =
            error.response?.data?.message || error.message || 'Something went wrong';
        return Promise.reject(errorMessage);
    }
};

// Update Category
const updateCat = async ({ name, slug, picture, position }) => {
    try {
        const formData = new FormData();
        formData.append('name', name);
        if (picture) formData.append('picture', picture);
        if (position !== undefined) formData.append('position', position);

        const axiosResponse = await axiosInstance.put(
            `/update-category/${slug}`,
            formData
        );

        return axiosResponse.data;
    } catch (error) {
        const errorMessage =
            error.response?.data?.message || error.message || 'Something went wrong';
        return Promise.reject(errorMessage);
    }
};

// Delete Category
const deleteCat = async (slug) => {
    try {
        const axiosResponse = await axiosInstance.delete(
            `/delete-category/${slug}`,
            { headers: { "Content-Type": "application/json" } }
        );
        return axiosResponse.data;
    } catch (error) {
        const errorMessage =
            error.response?.data?.message || error.message || 'Something went wrong';
        return Promise.reject(errorMessage);
    }
};

// Get All Categories
const getAllCat = async () => {
    try {
        const axiosResponse = await axiosInstance.get(
            '/all-category',
            { headers: { 'Content-Type': 'application/json' } }
        );
        return axiosResponse.data;
    } catch (error) {
        const errorMessage =
            error.response?.data?.message || error.message || 'Something went wrong';
        return Promise.reject(errorMessage);
    }
};

// Get Single Category
const getSingleCat = async (slug) => {
    try {
        const axiosResponse = await axiosInstance.get(
            `/single-category/${slug}`,
            { headers: { 'Content-Type': 'application/json' } }
        );
        return axiosResponse.data;
    } catch (error) {
        const errorMessage =
            error.response?.data?.message || error.message || 'Something went wrong';
        return Promise.reject(errorMessage);
    }
};

const categoryService = { createCat, getAllCat, deleteCat, updateCat, getSingleCat };

export default categoryService;

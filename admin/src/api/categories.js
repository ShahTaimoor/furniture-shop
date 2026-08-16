import axiosInstance from '@/redux/slices/auth/axiosInstance';

export const fetchCategoryTree = async () => {
  const { data } = await axiosInstance.get('/pg/category/list');
  const response = data?.data;
  if (Array.isArray(response)) {
    return response;
  }
  if (response && Array.isArray(response.tree)) {
    return response.tree;
  }
  return [];
};

export const createCategory = async ({ name, parentId = null, imageFile, imageAlt }) => {
  try {
    const formData = new FormData();
    formData.append('name', name);
    if (parentId) {
      formData.append('parentId', parentId);
    } else {
      formData.append('parentId', '');
    }
    if (imageFile) {
      formData.append('image', imageFile);
    }
    if (imageAlt) {
      formData.append('imageAlt', imageAlt);
    }

    const { data } = await axiosInstance.post('/pg/category/create', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data?.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Unable to create category';
    throw new Error(message);
  }
};

export const updateCategory = async ({ id, name, parentId, imageFile, removeImage, imageAlt }) => {
  try {
    const formData = new FormData();
    if (name) {
      formData.append('name', name);
    }
    if (typeof parentId !== 'undefined') {
      formData.append('parentId', parentId ?? '');
    }
    if (imageFile) {
      formData.append('image', imageFile);
    }
    if (removeImage) {
      formData.append('removeImage', 'true');
    }
    if (imageAlt) {
      formData.append('imageAlt', imageAlt);
    }

    const { data } = await axiosInstance.put(`/pg/category/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data?.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Unable to update category';
    throw new Error(message);
  }
};

export const deleteCategory = async (id) => {
  try {
    const { data } = await axiosInstance.delete(`/pg/category/${id}`);
    return data?.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Unable to delete category';
    throw new Error(message);
  }
};


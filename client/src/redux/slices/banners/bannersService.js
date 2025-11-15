import axiosInstance from '../auth/axiosInstance';

const normalizeFormData = (data) => {
  if (data instanceof FormData) return data;
  const formData = new FormData();
  Object.entries(data || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });
  return formData;
};

const createBanner = async (payload) => {
  try {
    const formData = normalizeFormData(payload);
    const response = await axiosInstance.post('/banners', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Unable to create banner';
    return Promise.reject(message);
  }
};

const updateBanner = async ({ id, data }) => {
  try {
    const formData = normalizeFormData(data);
    const response = await axiosInstance.put(`/banners/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Unable to update banner';
    return Promise.reject(message);
  }
};

const deleteBanner = async (id) => {
  try {
    const response = await axiosInstance.delete(`/banners/${id}`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Unable to delete banner';
    return Promise.reject(message);
  }
};

const fetchBanners = async ({ status } = {}) => {
  try {
    const response = await axiosInstance.get('/banners', {
      params: status ? { status } : undefined
    });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Unable to fetch banners';
    return Promise.reject(message);
  }
};

const fetchBannersByPlacement = async (placement) => {
  try {
    const response = await axiosInstance.get(`/banners/${placement}`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Unable to fetch banners';
    return Promise.reject(message);
  }
};

const bannersService = {
  createBanner,
  updateBanner,
  deleteBanner,
  fetchBanners,
  fetchBannersByPlacement
};

export default bannersService;



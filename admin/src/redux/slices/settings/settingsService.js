import axiosInstance from '../auth/axiosInstance';

const fetchSettings = async () => {
  try {
    const response = await axiosInstance.get('/pg/settings');
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Unable to fetch settings';
    return Promise.reject(message);
  }
};

const updateSettings = async (data) => {
  try {
    const response = await axiosInstance.put('/pg/settings', data);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Unable to update settings';
    return Promise.reject(message);
  }
};

const uploadLogo = async (file) => {
  try {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await axiosInstance.post('/pg/settings/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Unable to upload logo';
    return Promise.reject(message);
  }
};

const deleteLogo = async () => {
  try {
    const response = await axiosInstance.delete('/pg/settings/logo');
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Unable to remove logo';
    return Promise.reject(message);
  }
};

const settingsService = { fetchSettings, updateSettings, uploadLogo, deleteLogo };

export default settingsService;

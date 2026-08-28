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

const settingsService = { fetchSettings, updateSettings };

export default settingsService;

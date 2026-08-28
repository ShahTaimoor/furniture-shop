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

const settingsService = { fetchSettings };

export default settingsService;

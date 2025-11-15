import axiosInstance from '../auth/axiosInstance';

const fetchTracking = async (orderId) => {
  if (!orderId) {
    return Promise.reject('Order ID is required');
  }

  try {
    const response = await axiosInstance.get(`/orders/${orderId}/track`);
    return response.data?.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Unable to fetch tracking data';
    return Promise.reject(message);
  }
};

const orderTrackingService = {
  fetchTracking,
};

export default orderTrackingService;


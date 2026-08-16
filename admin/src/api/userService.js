import axiosInstance from '../redux/slices/auth/axiosInstance';

/**
 * Kill all sessions for a user (Admin only)
 * @param {string} userId - User ID
 */
export const killAllUserSessions = async (userId) => {
  try {
    const response = await axiosInstance.post(`/pg/kill-all-sessions/${userId}`);
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || error.message || 'Failed to kill all sessions';
    return Promise.reject(errorMessage);
  }
};

/**
 * Get all users (Admin only)
 */
export const getAllUsers = async () => {
  try {
    const response = await axiosInstance.get('/pg/all-users');
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || error.message || 'Failed to fetch users';
    return Promise.reject(errorMessage);
  }
};

export default {
  killAllUserSessions,
  getAllUsers,
};


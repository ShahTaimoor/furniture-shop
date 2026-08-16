// src/features/auth/authService.js
import axiosInstance from './axiosInstance';

const loginUser = async (userData) => {
  const response = await axiosInstance.post('/pg/login', userData, {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
};

const updateProfile = async (data) => {
  const response = await axiosInstance.put('/pg/update-profile', data, {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data.user;
};

const updateUserRole = async (userId, role) => {
  const response = await axiosInstance.put(`/pg/update-user-role/${userId}`, { role }, {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
};

const changePassword = async (passwordData) => {
  const response = await axiosInstance.put('/pg/change-password', passwordData, {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
};

const updateUsername = async (usernameData) => {
  const response = await axiosInstance.put('/pg/update-username', usernameData, {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
};

const authService = { loginUser, updateProfile, updateUserRole, changePassword, updateUsername };
export default authService;

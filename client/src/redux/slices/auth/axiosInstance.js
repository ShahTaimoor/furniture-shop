// Enhanced Axios Instance with Token Refresh & Mobile Support
import axios from 'axios';
import { toast } from 'sonner';
import { logout, setTokenExpired } from './authSlice';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 10000, // 10 second timeout
});

// Store reference will be set after store is created
let storeRef = null;
let isRefreshing = false;
let failedQueue = [];

export const setStoreReference = (store) => {
  storeRef = store;
};

// Process failed requests after token refresh by retrying with axiosInstance
const processQueue = (error) => {
  failedQueue.forEach(({ resolve, reject, config }) => {
    if (error) {
      reject(error);
    } else {
      resolve(axiosInstance(config));
    }
  });
  failedQueue = [];
};

// Request interceptor to add retry logic
axiosInstance.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching issues on mobile
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      };
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Enhanced response interceptor with token refresh logic
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if it's a login POST request
    const isLoginRequest = originalRequest?.url?.includes('/login') && originalRequest?.method === 'post';
    const isRefreshRequest = originalRequest?.url?.includes('/refresh-token');
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If it's a login request, don't treat it as token expiry
      if (isLoginRequest || isRefreshRequest) {
        return Promise.reject(error);
      }

      // If already refreshing, queue the request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh token using same instance (cookies attached)
        const refreshResponse = await axiosInstance.post('/refresh-token', null, { withCredentials: true, timeout: 8000 });

        if (refreshResponse?.data?.success) {
          processQueue(null);
          return axiosInstance(originalRequest);
        }
        throw new Error('Refresh failed');
      } catch (refreshError) {
        // Refresh failed, clear auth state
        processQueue(refreshError);
        
        if (storeRef) {
          storeRef.dispatch(logout());
          storeRef.dispatch(setTokenExpired());
        }
        
        // Attempt server logout to clear cookies
        try { await axiosInstance.post('/logout', null, { withCredentials: true }); } catch {}

        // Redirect to login with return path
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          const next = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.assign(`/login?next=${next}`);
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle other errors
    if (error.response?.status === 403) {
      if (typeof window !== 'undefined') {
        toast.error('Access denied. Insufficient permissions.');
      }
    } else if (error.response?.status >= 500) {
      if (typeof window !== 'undefined') {
        toast.error('Server error. Please try again later.');
      }
    } else if (error.code === 'ECONNABORTED') {
      if (typeof window !== 'undefined') {
        toast.error('Request timeout. Please check your connection.');
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;

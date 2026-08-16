import { useState, useEffect, useCallback, useRef } from 'react';
import { getAdminMetrics } from '../api/orderService';
import axiosInstance from '../redux/slices/auth/axiosInstance';

/**
 * Hook to fetch admin analytics with Redis-backed caching
 * 
 * Features:
 * - Automatic caching (backend Redis for 5-15 minutes)
 * - Loading and error states
 * - Refetch capability
 * - Date range filtering
 * 
 * @param {Object} options - Hook options
 * @param {boolean} options.enabled - Enable/disable fetching
 * @param {string} options.startDate - Start date for metrics
 * @param {string} options.endDate - End date for metrics
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onError - Error callback
 * 
 * @returns {Object} Hook result
 */
export const useAnalytics = (options = {}) => {
  const {
    enabled = true,
    startDate,
    endDate,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(null);

  const abortControllerRef = useRef(null);

  const fetchAnalytics = useCallback(async () => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const result = await getAdminMetrics({ startDate, endDate });

      if (result?.success) {
        setData(result.data);
        setLastFetchTime(new Date());
        setError(null);

        if (onSuccess) {
          onSuccess(result);
        }
      } else {
        throw new Error(result?.message || 'Failed to fetch analytics');
      }
    } catch (err) {
      // Don't set error if request was aborted
      if (err.name === 'AbortError' || err.name === 'CanceledError') {
        return;
      }

      const errorMessage = err.message || 'Failed to fetch analytics';
      setError(errorMessage);
      setData(null);

      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [startDate, endDate, onSuccess, onError]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    fetchAnalytics();

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, startDate, endDate, fetchAnalytics]);

  // Refetch function
  const refetch = useCallback(() => {
    return fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    data,
    loading,
    error,
    refetch,
    lastFetchTime,
  };
};

/**
 * Hook to fetch financial analytics (Super Admin only)
 * Backend caches this in Redis for 15 minutes
 */
export const useFinancialAnalytics = (options = {}) => {
  const {
    enabled = true,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(null);

  const abortControllerRef = useRef(null);

  const fetchFinancialAnalytics = useCallback(async () => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.get('/pg/analytics/financial');
      
      if (response?.data?.success) {
        setData(response.data.data);
        setLastFetchTime(new Date());
        setError(null);

        if (onSuccess) {
          onSuccess(response.data);
        }
      } else {
        throw new Error(response?.data?.message || 'Failed to fetch financial analytics');
      }
    } catch (err) {
      // Don't set error if request was aborted
      if (err.name === 'AbortError' || err.name === 'CanceledError') {
        return;
      }

      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch financial analytics';
      setError(errorMessage);
      setData(null);

      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [onSuccess, onError]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    fetchFinancialAnalytics();

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, fetchFinancialAnalytics]);

  // Refetch function
  const refetch = useCallback(() => {
    return fetchFinancialAnalytics();
  }, [fetchFinancialAnalytics]);

  return {
    data,
    loading,
    error,
    refetch,
    lastFetchTime,
  };
};

export default {
  useAnalytics,
  useFinancialAnalytics,
};


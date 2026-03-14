import { useState, useEffect, useCallback, useRef } from 'react';
import { getProducts } from '../api/productApi';

/**
 * Hook to fetch products with Redis-backed caching
 * 
 * Features:
 * - Automatic caching (backend Redis + optional local cache)
 * - Loading and error states
 * - Refetch capability
 * - Polling support for real-time updates
 * 
 * @param {Object} options - Hook options
 * @param {Object} options.filters - Product filters
 * @param {boolean} options.enabled - Enable/disable fetching
 * @param {number} options.pollInterval - Polling interval in ms (0 to disable)
 * @param {boolean} options.refetchOnMount - Refetch when component mounts
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onError - Error callback
 * 
 * @returns {Object} Hook result
 */
export const useProducts = (options = {}) => {
  const {
    filters = {},
    enabled = true,
    pollInterval = 0,
    refetchOnMount = true,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(null);

  const abortControllerRef = useRef(null);
  const pollIntervalRef = useRef(null);

  const fetchProducts = useCallback(async (isPolling = false) => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    if (!isPolling) {
      setLoading(true);
    }
    setError(null);

    try {
      const result = await getProducts(filters);

      if (result.success) {
        setData(result.data || []);
        setPagination(result.pagination || {});
        setLastFetchTime(new Date());
        setError(null);

        if (onSuccess) {
          onSuccess(result);
        }
      } else {
        throw new Error(result.message || 'Failed to fetch products');
      }
    } catch (err) {
      // Don't set error if request was aborted
      if (err.name === 'AbortError' || err.name === 'CanceledError') {
        return;
      }

      const errorMessage = err.message || 'Failed to fetch products';
      setError(errorMessage);
      setData([]);
      setPagination({});

      if (onError) {
        onError(err);
      }
    } finally {
      if (!isPolling) {
        setLoading(false);
      }
      abortControllerRef.current = null;
    }
  }, [filters, onSuccess, onError]);

  // Initial fetch
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    if (refetchOnMount || !lastFetchTime) {
      fetchProducts();
    }

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, refetchOnMount]);

  // Polling setup
  useEffect(() => {
    if (!enabled || pollInterval <= 0) {
      return;
    }

    pollIntervalRef.current = setInterval(() => {
      fetchProducts(true); // Pass true to indicate polling
    }, pollInterval);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [enabled, pollInterval, fetchProducts]);

  // Refetch function
  const refetch = useCallback(() => {
    return fetchProducts();
  }, [fetchProducts]);

  return {
    data,
    pagination,
    loading,
    error,
    refetch,
    lastFetchTime,
  };
};

export default useProducts;


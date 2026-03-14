import { useState, useEffect, useCallback, useRef } from 'react';
import { getProduct } from '../api/productApi';

/**
 * Hook to fetch a single product with Redis-backed caching
 * 
 * Features:
 * - Automatic caching (backend Redis)
 * - Loading and error states
 * - Refetch capability
 * 
 * @param {string} identifier - Product ID or slug
 * @param {Object} options - Hook options
 * @param {boolean} options.enabled - Enable/disable fetching
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onError - Error callback
 * 
 * @returns {Object} Hook result
 */
export const useProduct = (identifier, options = {}) => {
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

  const fetchProduct = useCallback(async () => {
    if (!identifier) {
      setLoading(false);
      setData(null);
      return;
    }

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const result = await getProduct(identifier);

      if (result.success) {
        setData(result.data);
        setLastFetchTime(new Date());
        setError(null);

        if (onSuccess) {
          onSuccess(result);
        }
      } else {
        throw new Error(result.message || 'Failed to fetch product');
      }
    } catch (err) {
      // Don't set error if request was aborted
      if (err.name === 'AbortError' || err.name === 'CanceledError') {
        return;
      }

      const errorMessage = err.message || 'Failed to fetch product';
      setError(errorMessage);
      setData(null);

      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [identifier, onSuccess, onError]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    fetchProduct();

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, identifier, fetchProduct]);

  // Refetch function
  const refetch = useCallback(() => {
    return fetchProduct();
  }, [fetchProduct]);

  return {
    data,
    loading,
    error,
    refetch,
    lastFetchTime,
  };
};

export default useProduct;


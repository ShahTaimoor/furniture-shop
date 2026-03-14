import { useState, useEffect, useCallback, useRef } from 'react';
import { getCategories } from '../api/categoryApi';

/**
 * Hook to fetch categories with Redis-backed caching
 * 
 * Features:
 * - Automatic caching (backend Redis for 1 hour)
 * - Loading and error states
 * - Refetch capability
 * - Returns both tree and flat structures
 * 
 * @param {Object} options - Hook options
 * @param {boolean} options.enabled - Enable/disable fetching
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onError - Error callback
 * 
 * @returns {Object} Hook result
 */
export const useCategories = (options = {}) => {
  const {
    enabled = true,
    onSuccess,
    onError,
  } = options;

  const [tree, setTree] = useState([]);
  const [flat, setFlat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(null);

  const abortControllerRef = useRef(null);

  const fetchCategories = useCallback(async () => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const result = await getCategories();

      if (result.success) {
        setTree(result.data.tree || []);
        setFlat(result.data.flat || []);
        setLastFetchTime(new Date());
        setError(null);

        if (onSuccess) {
          onSuccess(result);
        }
      } else {
        throw new Error(result.message || 'Failed to fetch categories');
      }
    } catch (err) {
      // Don't set error if request was aborted
      if (err.name === 'AbortError' || err.name === 'CanceledError') {
        return;
      }

      const errorMessage = err.message || 'Failed to fetch categories';
      setError(errorMessage);
      setTree([]);
      setFlat([]);

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

    fetchCategories();

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, fetchCategories]);

  // Refetch function
  const refetch = useCallback(() => {
    return fetchCategories();
  }, [fetchCategories]);

  return {
    tree,
    flat,
    loading,
    error,
    refetch,
    lastFetchTime,
  };
};

export default useCategories;


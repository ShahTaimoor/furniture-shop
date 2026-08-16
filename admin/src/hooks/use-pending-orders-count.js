import { useState, useEffect, useCallback, useRef } from 'react';
import { getPendingOrdersCount } from '../api/orderService';

/**
 * Hook to fetch and auto-refresh pending orders count
 * 
 * Features:
 * - Real-time polling for updates
 * - Auto-refreshes every 5 seconds
 * - Graceful error handling with fallback
 * - Loading states
 * 
 * @param {Object} options - Hook options
 * @param {boolean} options.enabled - Enable/disable fetching
 * @param {number} options.refreshInterval - Polling interval in ms (default: 5000)
 * @param {number} options.fallbackCount - Fallback count if API fails
 * @param {Function} options.onError - Error callback
 * @param {Function} options.onSuccess - Success callback
 * 
 * @returns {Object} Hook result
 */
export const usePendingOrdersCount = (options = {}) => {
  const { 
    enabled = true, 
    refreshInterval = 5000, // 5 seconds default polling interval
    fallbackCount = 0,
    onError,
    onSuccess,
  } = options;

  const [count, setCount] = useState(fallbackCount);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(null);

  const pollIntervalRef = useRef(null);
  const abortControllerRef = useRef(null);

  const fetchCount = useCallback(async (isPolling = false) => {
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
      const response = await getPendingOrdersCount();
      
      if (response?.success) {
        const newCount = response.count || 0;
        setCount(newCount);
        setLastFetchTime(new Date());
        setError(null);

        if (onSuccess) {
          onSuccess({ count: newCount });
        }
      } else {
        throw new Error(response?.message || 'Failed to fetch pending orders count');
      }
    } catch (err) {
      // Don't set error if request was aborted
      if (err.name === 'AbortError' || err.name === 'CanceledError') {
        return;
      }

      const errorMessage = err?.response?.data?.message || err.message || 'Failed to fetch pending orders count';
      setError(errorMessage);
      
      // Use fallback count on error
      if (fallbackCount !== undefined) {
        setCount(fallbackCount);
      }

      if (onError) {
        onError(err);
      } else {
        console.error('Error fetching pending orders count:', err);
      }
    } finally {
      if (!isPolling) {
        setLoading(false);
      }
      abortControllerRef.current = null;
    }
  }, [fallbackCount, onError, onSuccess]);

  // Initial fetch
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    fetchCount();

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, fetchCount]);

  // Polling setup
  useEffect(() => {
    if (!enabled || refreshInterval <= 0) {
      return;
    }

    pollIntervalRef.current = setInterval(() => {
      fetchCount(true); // Pass true to indicate polling
    }, refreshInterval);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [enabled, refreshInterval, fetchCount]);

  // Refetch function
  const refetch = useCallback(() => {
    return fetchCount();
  }, [fetchCount]);

  return {
    count,
    loading,
    error,
    refetch,
    lastFetchTime,
  };
};

export default usePendingOrdersCount;


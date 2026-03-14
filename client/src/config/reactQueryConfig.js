import { QueryClient } from '@tanstack/react-query';

/**
 * React Query configuration optimized for Redis-backed caching
 * 
 * This configuration works in harmony with backend Redis caching:
 * - Stale time matches backend cache TTLs for consistency
 * - Cache time allows React Query to serve cached data even after stale
 * - Automatic refetching keeps data fresh
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: How long data is considered fresh (matches backend Redis TTLs)
      staleTime: 1000 * 60 * 5, // 5 minutes default (backend metrics cache)
      
      // Cache time: How long unused data stays in cache
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      
      // Retry failed requests
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch on window focus (optional, can be disabled)
      refetchOnWindowFocus: false,
      
      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
});

/**
 * Query keys for consistent cache invalidation
 */
export const queryKeys = {
  products: {
    all: ['products'],
    lists: () => [...queryKeys.products.all, 'list'],
    list: (filters) => [...queryKeys.products.lists(), filters],
    details: () => [...queryKeys.products.all, 'detail'],
    detail: (id) => [...queryKeys.products.details(), id],
  },
  categories: {
    all: ['categories'],
    list: () => [...queryKeys.categories.all, 'list'],
  },
  orders: {
    all: ['orders'],
    pendingCount: () => [...queryKeys.orders.all, 'pending-count'],
    list: (filters) => [...queryKeys.orders.all, 'list', filters],
  },
  analytics: {
    all: ['analytics'],
    financial: () => [...queryKeys.analytics.all, 'financial'],
    metrics: (filters) => [...queryKeys.analytics.all, 'metrics', filters],
  },
  users: {
    all: ['users'],
    list: () => [...queryKeys.users.all, 'list'],
  },
};

export default queryClient;


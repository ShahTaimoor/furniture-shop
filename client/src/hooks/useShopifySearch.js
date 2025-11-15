import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDebounce } from './use-debounce';
import searchService from '@/services/searchService';

const defaultFilters = {
  brands: [],
  categories: [],
  colors: [],
  sizes: [],
  availability: [],
  price: {
    min: null,
    max: null,
  },
};

const cloneDefaultFilters = () => ({
  ...defaultFilters,
  price: { ...defaultFilters.price },
});

const serializeFilters = (filters) => {
  const params = {};
  if (filters.brands?.length) params.brand = filters.brands.join(',');
  if (filters.categories?.length) params.category = filters.categories.join(',');
  if (filters.colors?.length) params.color = filters.colors.join(',');
  if (filters.sizes?.length) params.size = filters.sizes.join(',');
  if (filters.availability?.length) params.availability = filters.availability.join(',');
  if (filters.price?.min !== null && filters.price?.min !== undefined) params.minPrice = filters.price.min;
  if (filters.price?.max !== null && filters.price?.max !== undefined) params.maxPrice = filters.price.max;
  return params;
};

export const useShopifySearch = (initialState = {}) => {
  const [query, setQuery] = useState(initialState.query || '');
  const debouncedQuery = useDebounce(query, 250);
  const [filters, setFilters] = useState({
    ...cloneDefaultFilters(),
    ...(initialState.filters || {}),
  });
  const [sort, setSort] = useState(initialState.sort || 'relevance');
  const [page, setPage] = useState(initialState.page || 1);
  const [limit, setLimit] = useState(initialState.limit || 24);
  const [results, setResults] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit, total: 0, pages: 0, hasMore: false });
  const [availableFilters, setAvailableFilters] = useState(cloneDefaultFilters());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null);

  const requestParams = useMemo(() => {
    const serializedFilters = serializeFilters(filters);
    return {
      ...serializedFilters,
      q: debouncedQuery || undefined,
      page,
      limit,
      sort,
    };
  }, [filters, debouncedQuery, page, limit, sort]);

  useEffect(() => {
    let cancelled = false;
    const fetchResults = async () => {
      setLoading(true);
      try {
        const response = await searchService.fetchSearchResults(requestParams);
        if (cancelled) return;

        if (response?.success) {
          setResults(response.data?.items || []);
          setPagination(response.data?.pagination || pagination);
          setMeta(response.meta || null);
          setError(null);
        } else {
          setResults([]);
          setError(response?.message || 'Unable to fetch search results');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || 'Unable to fetch search results');
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchResults();
    return () => {
      cancelled = true;
    };
  }, [requestParams]);

  useEffect(() => {
    let cancelled = false;
    const fetchFilters = async () => {
      try {
        const response = await searchService.fetchSearchFilters({
          ...requestParams,
          page: 1,
        });
        if (cancelled) return;
        if (response?.success) {
          setAvailableFilters(response.data || defaultFilters);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('Unable to load filters', err);
        }
      }
    };

    fetchFilters();

    return () => {
      cancelled = true;
    };
  }, [requestParams]);

  const updateQuery = useCallback((value) => {
    setQuery(value);
    setPage(1);
  }, []);

  const toggleFilter = useCallback((key, value) => {
    setFilters((prev) => {
      const current = new Set(prev[key] || []);
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }
      return { ...prev, [key]: Array.from(current) };
    });
    setPage(1);
  }, []);

  const setPriceRange = useCallback(({ min = null, max = null }) => {
    setFilters((prev) => ({
      ...prev,
      price: {
        min: typeof min === 'number' ? min : null,
        max: typeof max === 'number' ? max : null,
      },
    }));
    setPage(1);
  }, []);

  const clearFilter = useCallback((key) => {
    if (key === 'price') {
      setFilters((prev) => ({ ...prev, price: { ...defaultFilters.price } }));
    } else {
      setFilters((prev) => ({ ...prev, [key]: [] }));
    }
    setPage(1);
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters(cloneDefaultFilters());
    setPage(1);
  }, []);

  const appliedFiltersCount = useMemo(() => {
    const counts = [
      filters.brands?.length || 0,
      filters.categories?.length || 0,
      filters.colors?.length || 0,
      filters.sizes?.length || 0,
      filters.availability?.length || 0,
      filters.price?.min ? 1 : 0,
      filters.price?.max ? 1 : 0,
    ];
    return counts.reduce((sum, value) => sum + value, 0);
  }, [filters]);

  return {
    query,
    setQuery: updateQuery,
    debouncedQuery,
    filters,
    sort,
    setSort,
    page,
    setPage,
    limit,
    setLimit,
    results,
    pagination,
    availableFilters,
    loading,
    error,
    meta,
    toggleFilter,
    setPriceRange,
    clearFilter,
    clearAllFilters,
    appliedFiltersCount,
  };
};


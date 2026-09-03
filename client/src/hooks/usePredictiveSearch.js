import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebounce } from './use-debounce';
import searchService from '@/services/searchService';

const EMPTY_STATE = Object.freeze({
  query: '',
  products: [],
  categories: [],
  tags: [],
});

// Stable reference so a caller that doesn't pass fallbackProducts doesn't hand a
// brand-new [] on every render (which would re-create the memoised callbacks and
// re-fire the fetch effect on every parent re-render).
const STABLE_EMPTY_ARRAY = Object.freeze([]);

const buildLocalSuggestions = (term, products = []) => {
  if (!term || term.length < 2) return [];

  const normalized = term.toLowerCase().trim();
  const words = normalized.split(/\s+/).filter(Boolean);

  return products
    .filter((product) => {
      if (!product?.title) return false;
      const title = product.title.toLowerCase();
      const description = (product.description || '').toLowerCase();
      return words.every((word) => title.includes(word) || description.includes(word));
    })
    .sort((a, b) => {
      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();
      if (aTitle.startsWith(normalized) && !bTitle.startsWith(normalized)) return -1;
      if (!aTitle.startsWith(normalized) && bTitle.startsWith(normalized)) return 1;
      return (b.totalSales || 0) - (a.totalSales || 0);
    })
    .slice(0, 6)
    .map((product) => ({
      id: product._id || product.id,
      title: product.title,
      slug: product.slug,
      brand: product.brand || null,
      price: product.price,
      salePrice: product.salePrice,
      stockStatus: product.stockStatus,
      image:
        product.image ||
        product.images?.find?.((img) => img.isPrimary)?.secure_url ||
        product.images?.[0]?.secure_url ||
        product.picture?.secure_url ||
        null,
    }));
};

export const usePredictiveSearch = (fallbackProducts = STABLE_EMPTY_ARRAY) => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 200);
  const [suggestions, setSuggestions] = useState(EMPTY_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  const pendingRequestsRef = useRef(0);

  const fetchSuggestions = useCallback(
    async (term) => {
      if (!term || !term.trim()) {
        setSuggestions(EMPTY_STATE);
        setError(null);
        return;
      }

      pendingRequestsRef.current += 1;
      setLoading(true);
      setError(null);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await searchService.fetchPredictiveSuggestions(term, 6, controller.signal);
        if (response?.success) {
          setSuggestions(response.data);
        } else {
          setSuggestions({
            query: term,
            products: [],
            categories: [],
            tags: [],
          });
        }
      } catch (err) {
        if (err.name === 'CanceledError' || err.name === 'AbortError') {
          return;
        }

        const fallback = buildLocalSuggestions(term, fallbackProducts);
        setSuggestions({
          query: term,
          products: fallback,
          categories: [],
          tags: [],
        });
        setError(err?.response?.data?.message || 'Unable to load suggestions');
      } finally {
        pendingRequestsRef.current = Math.max(0, pendingRequestsRef.current - 1);
        if (pendingRequestsRef.current === 0) {
          setLoading(false);
        }
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [fallbackProducts]
  );

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 1) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      pendingRequestsRef.current = 0;
      setSuggestions(EMPTY_STATE);
      setLoading(false);
      return;
    }
    fetchSuggestions(debouncedQuery.trim());
  }, [debouncedQuery, fetchSuggestions]);

  useEffect(
    () => () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    },
    []
  );

  const keywordFallbacks = useMemo(() => {
    if (!fallbackProducts?.length) return [];
    const keywords = new Set();
    fallbackProducts.slice(0, 50).forEach((product) => {
      if (!product?.title) return;
      product.title
        .split(/\s+/)
        .filter((word) => word.length > 3)
        .forEach((word) => keywords.add(word.toLowerCase()));
    });
    return Array.from(keywords).slice(0, 8);
  }, [fallbackProducts]);

  return {
    query,
    setQuery,
    suggestions,
    loading,
    error,
    keywordFallbacks,
  };
};


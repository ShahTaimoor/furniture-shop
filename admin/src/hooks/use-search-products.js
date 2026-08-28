import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { fetchProducts } from '@/redux/slices/products/productSlice';
import { useDebounce } from './use-debounce';

/**
 * Custom hook for managing product search and fetching
 * Eliminates duplication across components
 */
export const useSearchProducts = ({
  initialCategory = 'all',
  initialPage = 1,
  initialLimit = 24,
  initialStockFilter = 'all',
  initialSortBy = 'az'
} = {}) => {
  const dispatch = useDispatch();
  
  const [category, setCategory] = useState(initialCategory);
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);
  const [stockFilter, setStockFilter] = useState(initialStockFilter);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [allProducts, setAllProducts] = useState([]);
  const [enterSuggestionIds, setEnterSuggestionIds] = useState([]);
  const [tags, setTags] = useState([]);
  const [minPrice, setMinPrice] = useState(null);
  const [maxPrice, setMaxPrice] = useState(null);
  const enterSuggestionIdsRef = useRef([]);
  const pendingRequestsRef = useRef(new Map());
  const lastRequestParamsRef = useRef(null);

  // Fetch products for suggestions (only once on mount)
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL;
        const response = await fetch(`${API_URL}/pg/get-products?limit=2000&stockFilter=active&sortBy=az`);
        const data = await response.json();
        if (data?.data) {
          setAllProducts(data.data);
        }
      } catch (error) {
        console.error('Error fetching products for suggestions:', error);
      }
    };
    fetchSuggestions();
  }, []);

  // Handle search with debounced term and request deduplication
  const handleSearch = useCallback((searchTerm, debounceDelay = 150) => {
    // Don't clear suggestion IDs here - they are managed by the caller
    // Only clear if explicitly clearing search AND no suggestion IDs are set
    if ((!searchTerm || searchTerm.trim() === '') && enterSuggestionIdsRef.current.length === 0) {
      // Only clear if there are no suggestion IDs to preserve
    }
    
    // If we have explicit suggestion/product IDs, fetch strictly by those IDs
    // Priority: If productIds are set, use them (even if search term is empty)
    const hasSuggestionIds = enterSuggestionIdsRef.current.length > 0;
    // When suggestion IDs are present, use 'all' category (category-independent)
    // Otherwise, respect the selected category (works with or without search term)
    const searchCategory = hasSuggestionIds ? 'all' : category;
    // If we have product IDs, don't use search term - let backend filter by IDs
    const searchParam = hasSuggestionIds ? '' : (searchTerm || '');
    
    const productIdsParam = hasSuggestionIds ? enterSuggestionIdsRef.current.join(',') : undefined;
    const tagsParam = tags.length > 0 ? tags.join(',') : undefined;
    const minPriceParam = typeof minPrice === 'number' ? minPrice : undefined;
    const maxPriceParam = typeof maxPrice === 'number' ? maxPrice : undefined;

    // Create request key for deduplication
    const requestKey = `${searchCategory}-${searchParam}-${page}-${limit}-${stockFilter}-${sortBy}-${productIdsParam || ''}-${tagsParam || ''}-${minPriceParam ?? ''}-${maxPriceParam ?? ''}`;
    
    // Check if this exact request is already pending
    if (pendingRequestsRef.current.has(requestKey)) {
      return pendingRequestsRef.current.get(requestKey);
    }
    
    // Check if this is the same as the last request (no new data needed)
    if (lastRequestParamsRef.current === requestKey) {
      return Promise.resolve();
    }
    
    // Store request params for comparison
    lastRequestParamsRef.current = requestKey;

    // Make the API call
    const requestPromise = dispatch(fetchProducts({ 
      category: searchCategory, 
      searchTerm: searchParam, 
      page, 
      limit, 
      stockFilter,
      sortBy,
      productIds: productIdsParam,
      tags: tagsParam,
      minPrice: minPriceParam,
      maxPrice: maxPriceParam
    })).then((res) => {
      // Go back one page if current page has no results
      if (res.payload?.data?.length === 0 && page > 1) {
        setPage((prev) => prev - 1);
      }
      // Remove from pending requests
      pendingRequestsRef.current.delete(requestKey);
      
      // Debug log (only in development)
      if (import.meta.env.DEV) {
        console.log('[Search] Products fetched:', {
          category: searchCategory,
          searchTerm: searchParam,
          page,
          count: res.payload?.data?.length || 0,
          hasProductIds: !!productIdsParam
        });
      }
    }).catch((error) => {
      console.error('[Search] Error fetching products:', error);
      // Remove from pending requests on error
      pendingRequestsRef.current.delete(requestKey);
    });
    
    // Store pending request
    pendingRequestsRef.current.set(requestKey, requestPromise);
    
    return requestPromise;
  }, [dispatch, category, page, limit, sortBy, stockFilter, tags, minPrice, maxPrice]);

  // Filter products based on search term (for additional client-side filtering)
  const filterProducts = useCallback((products, searchTerm, selectedProductId) => {
    let filtered = products.filter((product) => product && product._id);
    
    // If a specific product was selected from suggestions, show only that product
    if (selectedProductId) {
      filtered = filtered.filter(product => product._id === selectedProductId);
      return filtered;
    }
    
    // Additional filtering for search precision
    if (searchTerm && searchTerm.trim()) {
      const searchWords = searchTerm.toLowerCase().split(/\s+/);
      
      // Apply comprehensive search filtering for all search terms
      filtered = filtered.filter(product => {
        const title = (product.title || '').toLowerCase();
        const description = (product.description || '').toLowerCase();
        
        // Check if all search words are present in either title or description
        return searchWords.every(word => {
          const wordEscaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp('(\\b|^)' + wordEscaped, 'i');
          return regex.test(title) || regex.test(description);
        });
      });
    }
    
    return filtered;
  }, []);

  // Handle page change without resetting search
  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
  }, []);

  // Reset pagination when filters change
  const resetPagination = useCallback(() => {
    setPage(1);
  }, []);

  // Update category and reset pagination
  const updateCategory = useCallback((newCategory) => {
    setCategory(newCategory);
    resetPagination();
    // Reset lastRequestParamsRef to force a new fetch when category changes
    lastRequestParamsRef.current = null;
  }, [resetPagination]);

  // Update stock filter and reset pagination
  const updateStockFilter = useCallback((newStockFilter) => {
    setStockFilter(newStockFilter);
    resetPagination();
    // Reset lastRequestParamsRef to force a new fetch when stock filter changes
    lastRequestParamsRef.current = null;
  }, [resetPagination]);

  // Update sort order and reset pagination
  const updateSortBy = useCallback((newSortBy) => {
    setSortBy(newSortBy);
    resetPagination();
    // Reset lastRequestParamsRef to force a new fetch when sort changes
    lastRequestParamsRef.current = null;
  }, [resetPagination]);

  const updateTags = useCallback((nextTags) => {
    setTags(Array.isArray(nextTags) ? nextTags : []);
    resetPagination();
    lastRequestParamsRef.current = null;
  }, [resetPagination]);

  const updatePriceRange = useCallback(({ min, max }) => {
    setMinPrice(
      typeof min === 'number' && !Number.isNaN(min) ? min : null
    );
    setMaxPrice(
      typeof max === 'number' && !Number.isNaN(max) ? max : null
    );
    resetPagination();
    lastRequestParamsRef.current = null;
  }, [resetPagination]);

  const clearPriceRange = useCallback(() => {
    setMinPrice(null);
    setMaxPrice(null);
    resetPagination();
    lastRequestParamsRef.current = null;
  }, [resetPagination]);

  return {
    // State
    category,
    page,
    limit,
    stockFilter,
    sortBy,
    allProducts,
    enterSuggestionIds,
    tags,
    minPrice,
    maxPrice,
    
    // Actions
    setCategory: updateCategory,
    setPage: handlePageChange,
    setStockFilter: updateStockFilter,
    setSortBy: updateSortBy,
    setTags: updateTags,
    setPriceRange: updatePriceRange,
    clearPriceRange,
    setEnterSuggestionIds: (ids) => {
      setEnterSuggestionIds(ids);
      enterSuggestionIdsRef.current = ids;
      // If clearing suggestion IDs (empty array), reset last request params to force new fetch
      if (ids.length === 0) {
        lastRequestParamsRef.current = null;
      }
    },
    handleSearch,
    handlePageChange,
    filterProducts,
    resetPagination
  };
};

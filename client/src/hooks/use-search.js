import { useSearchState } from './use-search-state';
import { useSearchSuggestions } from './use-search-suggestions';
import { useSearchProducts } from './use-search-products';
import { useDebounce } from './use-debounce';
import { trackSearch } from '@/utils/searchAnalytics';
import { useEffect, useRef, useCallback } from 'react';

/**
 * Combined search hook that provides all search functionality
 * This is the main hook to use in components
 */
export const useSearch = (options = {}) => {
  const searchState = useSearchState();
  const searchProducts = useSearchProducts(options);
  const searchSuggestions = useSearchSuggestions(searchProducts.allProducts);
  
  const { searchTerm, activeSearchTerm, handleSearchChange, handleSearchSubmit } = searchState;
  
  // Debounced search term
  const debouncedSearchTerm = useDebounce(activeSearchTerm, 150);
  
  // Track previous activeSearchTerm to detect when search is cleared
  const prevActiveSearchTermRef = useRef(activeSearchTerm);
  const prevSearchTermRef = useRef(searchTerm);
  const isClearingRef = useRef(false);

  // Store function references in refs to avoid dependency issues
  const searchProductsRef = useRef(searchProducts);
  searchProductsRef.current = searchProducts;

  // When activeSearchTerm becomes empty (search cleared), automatically show all products
  useEffect(() => {
    // Skip if we're already in the process of clearing to prevent loops
    if (isClearingRef.current) {
      return;
    }

    const prevTerm = prevActiveSearchTermRef.current;
    const currentTerm = activeSearchTerm;
    
    // Only trigger if search changed from non-empty to empty (user cleared search)
    if (prevTerm && prevTerm.trim() !== '' && (!currentTerm || currentTerm.trim() === '')) {
      // Set flag to prevent re-entry
      isClearingRef.current = true;
      
      // Use setTimeout to batch state updates and avoid cascading re-renders
      setTimeout(() => {
        // Search was cleared - keep current category and show all products automatically
        searchProductsRef.current.setEnterSuggestionIds([]);
        searchProductsRef.current.resetPagination();
        // Fetch all products (clearing suggestion IDs will reset lastRequestParamsRef)
        const searchPromise = searchProductsRef.current.handleSearch('');
        
        // Ensure we always reset the flag, even if promise fails
        Promise.resolve(searchPromise).finally(() => {
          setTimeout(() => {
            isClearingRef.current = false;
          }, 100);
        });
      }, 0);
    } else {
      // Update ref for next render if not clearing
      prevActiveSearchTermRef.current = currentTerm;
    }
  }, [activeSearchTerm]);

  // Also watch for when searchTerm becomes empty (user manually deletes all text)
  useEffect(() => {
    // Skip if we're already in the process of clearing to prevent loops
    if (isClearingRef.current) {
      return;
    }

    const prevTerm = prevSearchTermRef.current;
    const currentTerm = searchTerm;
    
    // If searchTerm becomes empty and activeSearchTerm is also empty, fetch all products
    // This handles the case where user manually deletes all text without submitting
    if (prevTerm && prevTerm.trim() !== '' && (!currentTerm || currentTerm.trim() === '') && 
        (!activeSearchTerm || activeSearchTerm.trim() === '')) {
      // Set flag to prevent re-entry
      isClearingRef.current = true;
      
      // Use setTimeout to batch state updates and avoid cascading re-renders
      setTimeout(() => {
        // User manually cleared the search input - fetch all products
        searchProductsRef.current.setEnterSuggestionIds([]);
        searchProductsRef.current.resetPagination();
        const searchPromise = searchProductsRef.current.handleSearch('');
        
        // Ensure we always reset the flag, even if promise fails
        Promise.resolve(searchPromise).finally(() => {
          setTimeout(() => {
            isClearingRef.current = false;
          }, 100);
        });
      }, 0);
    } else {
      // Update ref for next render if not clearing
      prevSearchTermRef.current = currentTerm;
    }
  }, [searchTerm, activeSearchTerm]);

  // Handle search with tracking and analytics
  const handleSearchWithTracking = (term, productId = null, suggestionIds = []) => {
    if (term && term.trim()) {
      // Track search for analytics
      trackSearch(term);
      
      // Handle search submit with history management
      handleSearchSubmit(term, productId, suggestionIds);
      
      // If a single product ID is provided (from clicking a suggestion), fetch only that product
      if (productId) {
        searchProductsRef.current.setEnterSuggestionIds([productId]);
        // Trigger search immediately to fetch only that product
        // Clear search term so API uses productIds instead
        searchProductsRef.current.handleSearch('', 0);
      }
      // Otherwise, if multiple suggestion IDs are provided, use those
      else if (suggestionIds.length > 0) {
        searchProductsRef.current.setEnterSuggestionIds(suggestionIds);
        // Trigger search with empty term to use productIds
        searchProductsRef.current.handleSearch('', 0);
      }
      // Otherwise, clear suggestion IDs and do normal search
      else {
        searchProductsRef.current.setEnterSuggestionIds([]);
        // Trigger normal search with the term
        searchProductsRef.current.handleSearch(term);
      }
      
      // Scroll to top to see results
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Clear search when term is empty - show all products in current category
      handleSearchSubmit('', productId, []);
      // Clear suggestion IDs first to ensure no product filtering
      // This will also reset lastRequestParamsRef to force a new fetch
      searchProductsRef.current.setEnterSuggestionIds([]);
      // Keep current category when clearing search
      // Reset page to 1 when clearing search
      searchProductsRef.current.resetPagination();
      // Fetch all products (clearing suggestion IDs will reset lastRequestParamsRef)
      searchProductsRef.current.handleSearch('');
    }
  };

  // Generate suggestions for current search term
  const updateSuggestions = () => {
    if (searchTerm && searchTerm.trim().length >= 2) {
      const newSuggestions = searchSuggestions.generateSuggestions(searchTerm);
      searchSuggestions.setSuggestions(newSuggestions);
    } else {
      searchSuggestions.setSuggestions([]);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    const suggestionText = typeof suggestion === 'string' ? suggestion : suggestion.text;
    
    // Update the search term to match the clicked suggestion
    handleSearchChange(suggestionText);
    
    // Submit the search when clicking a suggestion
    handleSearchWithTracking(suggestionText, suggestion.product?._id);
  };

  // Enhanced clearSearch that ensures all products are fetched
  const clearSearch = useCallback(() => {
    // Clear search state
    searchState.clearSearch();
    
    // Clear suggestion IDs to ensure no filtering
    // This will also reset lastRequestParamsRef to force a new fetch
    searchProductsRef.current.setEnterSuggestionIds([]);
    
    // Reset pagination
    searchProductsRef.current.resetPagination();
    
    // Immediately fetch all products
    searchProductsRef.current.handleSearch('');
  }, [searchState]);

  // Enhanced handleSearch that ensures empty searches clear suggestion IDs
  const handleSearchEnhanced = useCallback((searchTerm) => {
    // If search term is empty, ensure suggestion IDs are cleared first
    if (!searchTerm || searchTerm.trim() === '') {
      searchProductsRef.current.setEnterSuggestionIds([]);
    }
    // Call the original handleSearch
    searchProductsRef.current.handleSearch(searchTerm);
  }, []);

  return {
    // Search state
    ...searchState,
    
    // Search products
    ...searchProducts,
    
    // Search suggestions
    ...searchSuggestions,
    
    // Combined functionality
    debouncedSearchTerm,
    handleSearchWithTracking,
    handleSuggestionClick,
    updateSuggestions,
    handleSearch: handleSearchEnhanced, // Use enhanced version that clears suggestion IDs for empty searches
    
    // Convenience methods
    handleSearchChange,
    handleSearchSubmit: handleSearchWithTracking,
    clearSearch // Override with enhanced version
  };
};

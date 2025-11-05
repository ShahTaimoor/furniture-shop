import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import productService from '@/redux/slices/products/productService';

/**
 * Custom hook for managing search suggestions and product filtering
 * Eliminates duplication across components
 * Now supports both API-based and client-side suggestions (like gulautos.pk)
 */
export const useSearchSuggestions = (allProducts = [], useApi = true) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const abortControllerRef = useRef(null);

  // Generate product suggestions based on search term (client-side fallback)
  const generateSuggestionsClientSide = useCallback((term, products = allProducts) => {
    if (!term || term.length < 2 || !products || products.length === 0) return [];
    
    const searchTerm = term.toLowerCase().trim();
    const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 0);
    
    // Filter products that match the search term with precision
    const matchingProducts = products
      .filter(product => {
        // Check if product exists, has title, and is active (stock > 0)
        if (!product || !product.title || product.stock <= 0) return false;
        const title = product.title.toLowerCase();
        const description = (product.description || '').toLowerCase();
        
        // Check if each search word exists in EITHER title OR description
        const allWordsMatch = searchWords.every(word => {
          const wordEscaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp('(\\b|^)' + wordEscaped, 'i');
          // Each word can be in title OR description (not necessarily all in one)
          return regex.test(title) || regex.test(description);
        });
        
        return allWordsMatch;
      });
    
    const sortedProducts = matchingProducts.sort((a, b) => {
        const aTitle = a.title.toLowerCase();
        const bTitle = b.title.toLowerCase();
        
        // Priority 1: Exact phrase match at start
        const aStartsWithExact = aTitle.startsWith(searchTerm);
        const bStartsWithExact = bTitle.startsWith(searchTerm);
        if (aStartsWithExact && !bStartsWithExact) return -1;
        if (!aStartsWithExact && bStartsWithExact) return 1;
        
        // Priority 2: First word of search matches first word of title
        const aFirstWordMatch = aTitle.split(/\s+/)[0] === searchWords[0];
        const bFirstWordMatch = bTitle.split(/\s+/)[0] === searchWords[0];
        if (aFirstWordMatch && !bFirstWordMatch) return -1;
        if (!aFirstWordMatch && bFirstWordMatch) return 1;
        
        // Priority 3: Exact phrase anywhere in title
        const aContainsExact = aTitle.includes(searchTerm);
        const bContainsExact = bTitle.includes(searchTerm);
        if (aContainsExact && !bContainsExact) return -1;
        if (!aContainsExact && bContainsExact) return 1;
        
        // Priority 4: Shorter titles (more specific)
        return aTitle.length - bTitle.length;
      });
    
    const finalSuggestions = sortedProducts.slice(0, 10) // Limit to 10 suggestions
      .map(product => ({
        text: product.title,
        image: product.image || product.picture?.secure_url || 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center',
        product: product // Keep reference to full product
      }));
    
    return finalSuggestions;
  }, [allProducts]);

  // Generate product suggestions using API (faster and more accurate)
  const generateSuggestionsFromAPI = useCallback(async (term) => {
    if (!term || term.length < 1) {
      setSuggestions([]);
      return [];
    }

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setLoadingSuggestions(true);
    try {
      const response = await productService.getSearchSuggestions(term, 10);
      
      if (response.success && response.data) {
        const formattedSuggestions = response.data.map(product => ({
          text: product.title,
          image: product.image || product.picture?.secure_url || 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center',
          product: product // Keep reference to full product
        }));
        setSuggestions(formattedSuggestions);
        return formattedSuggestions;
      }
      
      setSuggestions([]);
      return [];
    } catch (error) {
      // If API fails, fall back to client-side search
      if (error.name !== 'AbortError') {
        console.warn('API search suggestions failed, falling back to client-side:', error);
        return generateSuggestionsClientSide(term);
      }
      return [];
    } finally {
      setLoadingSuggestions(false);
    }
  }, [generateSuggestionsClientSide]);

  // Unified generate suggestions function that chooses API or client-side
  const generateSuggestions = useCallback(async (term, products = allProducts) => {
    if (!term || term.length < 1) {
      setSuggestions([]);
      return [];
    }

    // Use API if enabled and term is at least 1 character
    if (useApi && term.length >= 1) {
      return await generateSuggestionsFromAPI(term);
    }
    
    // Fall back to client-side for terms with 2+ characters
    if (term.length >= 2) {
      const suggestions = generateSuggestionsClientSide(term, products);
      setSuggestions(suggestions);
      return suggestions;
    }
    
    setSuggestions([]);
    return [];
  }, [useApi, generateSuggestionsFromAPI, generateSuggestionsClientSide, allProducts]);

  // Update suggestions when allProducts change
  useEffect(() => {
    if (allProducts.length > 0 && !useApi) {
      setSuggestions([]);
    }
  }, [allProducts, useApi]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    suggestions,
    loadingSuggestions,
    generateSuggestions,
    setSuggestions,
    generateSuggestionsFromAPI,
    generateSuggestionsClientSide
  };
};

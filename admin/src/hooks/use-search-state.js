import { useState, useEffect, useCallback } from 'react';
import { getPopularSearches } from '@/utils/searchAnalytics';

/**
 * Custom hook for managing search state and history
 * Eliminates duplication across components
 */
export const useSearchState = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState(''); // Term used for actual search (only set on submit)
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [popularSearches, setPopularSearches] = useState([]);

  // Load search history and popular searches from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Error parsing search history:', error);
        setSearchHistory([]);
      }
    }
    
    // Load popular searches from analytics
    const analyticsPopularSearches = getPopularSearches();
    if (analyticsPopularSearches.length > 0) {
      setPopularSearches(analyticsPopularSearches);
    }
  }, []);

  // Don't update activeSearchTerm automatically - only update when search is submitted
  // activeSearchTerm is the term used for actual product fetching

  // Handle search change
  const handleSearchChange = useCallback((value) => {
    const previousSearchTerm = searchTerm;
    setSearchTerm(value);
    
    // Clear selected product when user manually types/changes search
    // This allows new searches to show all matching products
    if (selectedProductId) {
      setSelectedProductId(null);
    }
    
    // If search becomes empty (user cleared it), automatically show all products
    // This handles the case where user deletes all text without pressing Enter
    if (previousSearchTerm && previousSearchTerm.trim() !== '' && (!value || value.trim() === '')) {
      // Search was cleared - show all products automatically
      setActiveSearchTerm('');
    }
  }, [selectedProductId, searchTerm]);

  // Handle search submit
  const handleSearchSubmit = useCallback((term, productId = null, suggestionIds = []) => {
    if (term && term.trim()) {
      const trimmedTerm = term.trim();
      
      // Update active search term (this triggers the actual product search)
      setActiveSearchTerm(trimmedTerm);
      
      // Add to search history
      if (!searchHistory.includes(trimmedTerm)) {
        const newHistory = [trimmedTerm, ...searchHistory.slice(0, 4)];
        setSearchHistory(newHistory);
        localStorage.setItem('searchHistory', JSON.stringify(newHistory));
      }
      
      // Set selected product if provided
      if (productId) {
        setSelectedProductId(productId);
      }
    } else {
      // Clear search
      setActiveSearchTerm('');
      setSelectedProductId(null);
    }
  }, [searchHistory]);

  // Clear search - reset everything and show all products
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setActiveSearchTerm(''); // Clear active search term to reset products and show all
    setSelectedProductId(null);
  }, []);

  return {
    searchTerm,
    activeSearchTerm,
    selectedProductId,
    searchHistory,
    popularSearches,
    handleSearchChange,
    handleSearchSubmit,
    clearSearch,
    setSelectedProductId
  };
};

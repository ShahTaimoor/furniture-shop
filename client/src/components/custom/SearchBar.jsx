import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { Input } from '../ui/input';
import { LayoutPanelLeft, Grid2x2, ChevronDown, X, Search, Camera } from 'lucide-react';
import { trackSearch } from '@/utils/searchAnalytics';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const SearchBar = React.memo(({ 
  searchTerm,
  onSearchChange,
  onSearchSubmit,
  gridType, 
  onGridTypeChange,
  searchHistory = [],
  popularSearches = [],
  products = [],
  isRedBackground = false,
  hideGridToggle = false
}) => {
  const navigate = useNavigate();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showGridDropdown, setShowGridDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [keywordSuggestions, setKeywordSuggestions] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const gridDropdownRef = useRef(null);

  // Generate keyword suggestions from product titles
  const generateKeywordSuggestions = useCallback(() => {
    if (!products || products.length === 0) return [];
    
    // Extract keywords from product titles
    const keywords = new Set();
    products.forEach(product => {
      if (product && product.title) {
        // Split title into words and add meaningful keywords
        const words = product.title.toLowerCase().split(/\s+/).filter(word => 
          word.length > 3 && // Only words longer than 3 characters
          !['the', 'and', 'for', 'with', 'from'].includes(word) // Exclude common words
        );
        words.forEach(word => keywords.add(word));
      }
    });
    
    // Convert to array and limit to 5 most common
    return Array.from(keywords).slice(0, 5);
  }, [products]);

  // Generate product suggestions based on search term
  const generateSuggestions = useCallback((term) => {
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
  }, [products]);

  // Load keyword suggestions when products are available
  useEffect(() => {
    if (products && products.length > 0) {
      const keywords = generateKeywordSuggestions();
      setKeywordSuggestions(keywords);
    }
  }, [products, generateKeywordSuggestions]);

  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    onSearchChange(value);
    
    // Show suggestions when typing (2+ characters) or when focused
    if (value.trim().length >= 2) {
      const newSuggestions = generateSuggestions(value);
      setSuggestions(newSuggestions);
      setShowSuggestions(true);
    } else if (isFocused) {
      // Show keyword suggestions when focused but less than 2 characters
      setShowSuggestions(true);
      setSuggestions([]);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  }, [onSearchChange, generateSuggestions, isFocused]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setShowSuggestions(true);
    // Ensure dropdown shows immediately when clicking
    if (searchTerm.trim().length < 2) {
      // Show keyword suggestions when empty
      setSuggestions([]);
    }
  }, [searchTerm]);

  const handleBlur = useCallback((e) => {
    // Check if the related target (what's being focused) is within the suggestions container
    const relatedTarget = e.relatedTarget;
    if (suggestionsRef.current && relatedTarget && suggestionsRef.current.contains(relatedTarget)) {
      // Don't close if clicking inside the dropdown
      return;
    }
    // Delay to allow click events to fire
    setTimeout(() => {
      // Double check that we're not inside the suggestions container
      if (suggestionsRef.current && !suggestionsRef.current.contains(document.activeElement)) {
        setIsFocused(false);
        setShowSuggestions(false);
      }
    }, 200);
  }, []);

  const handleSearchSubmitAction = useCallback(() => {
    setShowSuggestions(false);
    
    if (searchTerm.trim()) {
      // Always generate fresh suggestions based on current search term
      // This ensures we get the latest matching products even if suggestions state is stale
      const currentSuggestions = generateSuggestions(searchTerm.trim());
      const suggestionIds = currentSuggestions.map(s => s.product?._id).filter(Boolean);
      
      // Submit the search with suggestion IDs
      // If we have suggestion IDs, use them to show only those products; otherwise do normal search
      if (onSearchSubmit) {
        if (suggestionIds.length > 0) {
          // Use the exact products from suggestions - this will show only those products on main page
          onSearchSubmit(searchTerm.trim(), null, suggestionIds);
        } else {
          // No suggestions found, do normal search
          onSearchSubmit(searchTerm.trim(), null, []);
        }
      }
      
      // Track search for analytics
      trackSearch(searchTerm);

      // Navigate to global Search Results page
      navigate(`/search?query=${encodeURIComponent(searchTerm.trim())}`);
      
      // Add to search history
      if (searchHistory && !searchHistory.includes(searchTerm.trim())) {
        const newHistory = [searchTerm.trim(), ...searchHistory.slice(0, 4)];
        localStorage.setItem('searchHistory', JSON.stringify(newHistory));
      }
    } else {
      // If search is empty, clear search and show all products
      if (onSearchSubmit) {
        onSearchSubmit('', null, []);
      }
    }
    
    // Scroll to top to see results
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchTerm, searchHistory, onSearchSubmit, generateSuggestions, navigate]);

  const handleSuggestionClick = useCallback((suggestion) => {
    const suggestionText = typeof suggestion === 'string' ? suggestion : suggestion.text;
    const productId = suggestion.product?._id || null;
    const suggestionIds = productId ? [productId] : [];

    if (onSearchSubmit) {
      onSearchSubmit(suggestionText, productId, suggestionIds);
    }
    
    // Always navigate to Search Results page for suggestions
    setShowSuggestions(false);
    setIsFocused(false);
    onSearchChange(suggestionText);
    navigate(`/search?query=${encodeURIComponent(suggestionText)}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    searchInputRef.current?.blur();
  }, [navigate, onSearchChange, onSearchSubmit]);

  const handleClearSearch = useCallback(() => {
    onSearchChange('');
    setShowSuggestions(false);
    setSuggestions([]);
    if (onSearchSubmit) {
      onSearchSubmit('', null, []); // Clear search with empty suggestion IDs
    }
    searchInputRef.current?.focus();
  }, [onSearchChange, onSearchSubmit]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      searchInputRef.current?.blur(); // Close keyboard
    } else if (e.key === 'Enter') {
      setShowSuggestions(false); // Hide suggestions when Enter is pressed
      handleSearchSubmitAction();
      searchInputRef.current?.blur(); // Close keyboard
    }
  }, [handleSearchSubmitAction]);

  // Close suggestions and dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside suggestions container
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        // Also check if it's not the search input itself
        if (searchInputRef.current && !searchInputRef.current.contains(event.target)) {
          setShowSuggestions(false);
          setIsFocused(false);
        }
      }
      if (gridDropdownRef.current && !gridDropdownRef.current.contains(event.target)) {
        setShowGridDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const gridButtons = useMemo(() => [
    { id: 'grid2', icon: Grid2x2, label: 'Grid 2x2' },
    { id: 'grid3', icon: LayoutPanelLeft, label: 'List View' }
  ], []);

  const currentGridButton = useMemo(() => 
    gridButtons.find(btn => btn.id === gridType) || gridButtons[0],
    [gridType, gridButtons]
  );

  return (
    <div className="w-full">
      <div className={`flex items-center gap-2 ${hideGridToggle ? 'mx-0' : 'mx-2 md:mx-0'}`}>
        {/* Search Input */}
        <div className={`relative ${hideGridToggle ? 'w-full' : 'flex-1'}`} ref={suggestionsRef}>
          <div className="relative w-full group">
            <Search className={`absolute left-3.5 md:left-2.5 top-1/2 transform -translate-y-1/2 h-5 w-5 md:h-4 md:w-4 ${isRedBackground ? 'text-primary' : 'text-gray-400'}`} />
            <Input
              ref={searchInputRef}
              id="search"
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onClick={handleFocus}
              onBlur={handleBlur}
              placeholder="What are you looking for?"
              className={`w-full pl-10 pr-20 md:pl-8 md:pr-16 h-10 md:h-8 text-sm border-2 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 no-underline focus:no-underline ${isRedBackground ? 'border-red-300' : 'border-gray-200'}`}
              style={{ textDecoration: 'none', textDecorationLine: 'none' }}
              aria-label="Search products"
            />
            {/* Camera Icon - Furniture Style */}
            <button
              type="button"
              className={`absolute right-10 md:right-8 top-1/2 -translate-y-1/2 transition-colors duration-200 p-1 rounded-full ${isRedBackground ? 'text-primary hover:text-primary/80 hover:bg-primary/10' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
              aria-label="Image search"
              title="Image search"
            >
              <Camera className="h-4 w-4 md:h-3.5 md:w-3.5" />
            </button>
            {/* Clear Search Button */}
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className={`absolute right-3 md:right-2 top-1/2 -translate-y-1/2 transition-colors duration-200 p-0.5 rounded-full ${isRedBackground ? 'text-primary hover:text-primary/80 hover:bg-primary/10' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                aria-label="Clear search"
                type="button"
              >
                <X className="h-4 w-4 md:h-3.5 md:w-3.5" />
              </button>
            )}
          </div>

          {/* Search Dropdown - Show when focused or typing */}
          <AnimatePresence mode="wait">
            {showSuggestions && (
              <motion.div
                initial={{ 
                  opacity: 0, 
                  y: -10, 
                  scale: 0.98
                }}
                animate={{ 
                  opacity: 1, 
                  y: 0, 
                  scale: 1
                }}
                exit={{ 
                  opacity: 0, 
                  y: -10, 
                  scale: 0.98
                }}
                transition={{ 
                  duration: 0.2,
                  ease: [0.16, 1, 0.3, 1]
                }}
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[500px] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="max-h-[500px] overflow-y-auto">
                  {/* Popular Searches - Show when input is empty or has < 2 characters */}
                  {searchTerm.trim().length < 2 && popularSearches && popularSearches.length > 0 && (
                    <div className="py-2">
                      {popularSearches.slice(0, 5).map((search, index) => (
                        <button
                          key={`popular-${index}-${search}`}
                          onClick={() => {
                            onSearchChange(search);
                            setShowSuggestions(false);
                            setIsFocused(false);
                            // Trigger search with the popular search term
                            if (onSearchSubmit) {
                              onSearchSubmit(search.trim(), null, []);
                            }
                            navigate(`/search?query=${encodeURIComponent(search.trim())}`);
                            searchInputRef.current?.blur();
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150 flex items-center gap-3"
                        >
                          <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span>{search}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Keyword Suggestions - Fallback if no popular searches */}
                  {searchTerm.trim().length < 2 && (!popularSearches || popularSearches.length === 0) && keywordSuggestions.length > 0 && (
                    <div className="py-2">
                      {keywordSuggestions.map((keyword, index) => (
                        <button
                          key={`keyword-${index}`}
                          onClick={() => {
                            onSearchChange(keyword);
                            setShowSuggestions(false);
                            setIsFocused(false);
                            // Trigger search with the keyword
                            if (onSearchSubmit) {
                              onSearchSubmit(keyword.trim(), null, []);
                            }
                            navigate(`/search?query=${encodeURIComponent(keyword.trim())}`);
                            searchInputRef.current?.blur();
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150 flex items-center gap-3"
                        >
                          <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span>{keyword}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Product Suggestions - Show when typing 2+ characters */}
                  {searchTerm.trim().length >= 2 && suggestions.length > 0 && (
                    <div className="py-2">
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={`${suggestion.product?._id || index}-${suggestion.text}`}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors duration-150 flex items-center gap-3"
                        >
                          <div className="w-14 h-14 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                            <img 
                              src={suggestion.image || 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center'} 
                              alt={suggestion.text || suggestion}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center';
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-sm mb-0.5">
                              {suggestion.text || suggestion}
                            </div>
                            {suggestion.product && (
                              <div className="text-xs text-gray-500">
                                {suggestion.product.description ? 
                                  suggestion.product.description.substring(0, 60) : 
                                  suggestion.product.size || 'Product'}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* No results message */}
                  {searchTerm.trim().length >= 2 && suggestions.length === 0 && (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No products found for "{searchTerm}"
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Grid Layout Dropdown */}
        {!hideGridToggle && (
        <div className="relative" ref={gridDropdownRef}>
          <button
            onClick={() => setShowGridDropdown(!showGridDropdown)}
            className={`flex items-center gap-1.5 shadow-sm backdrop-blur-sm px-4 py-2.5 md:px-2.5 md:py-1.5 h-10 md:h-auto rounded-lg border transition-all duration-200 ${isRedBackground ? 'bg-primary/10 border-primary hover:bg-primary/20' : 'bg-white/60 border-gray-200 hover:bg-gray-100'}`}
            aria-label="Select grid layout"
          >
            {React.createElement(currentGridButton.icon, { className: `h-5 w-5 md:h-4 md:w-4 ${isRedBackground ? 'text-primary' : 'text-gray-700'}` })}
            <ChevronDown className={`h-4 w-4 md:h-3 md:w-3 ${isRedBackground ? 'text-primary' : 'text-gray-500'}`} />
          </button>

          {/* Dropdown Menu */}
          {showGridDropdown && (
            <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[140px] overflow-hidden">
              {gridButtons.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => {
                    onGridTypeChange(id);
                    setShowGridDropdown(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-150 ${
                    gridType === id
                      ? 'bg-primary/10 text-gray-900 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
});

export default SearchBar;


/**
 * Search Analytics Utility
 * Tracks search terms and provides analytics
 */

const SEARCH_ANALYTICS_KEY = 'searchAnalytics';
const POPULAR_SEARCHES_KEY = 'popularSearches';

/**
 * Track a search term
 * @param {string} searchTerm - The search term to track
 */
export const trackSearch = (searchTerm) => {
  if (!searchTerm || searchTerm.trim().length < 2) return;

  const term = searchTerm.trim().toLowerCase();
  
  try {
    // Get existing analytics
    const existingAnalytics = JSON.parse(localStorage.getItem(SEARCH_ANALYTICS_KEY) || '{}');
    
    // Update count for this search term
    existingAnalytics[term] = (existingAnalytics[term] || 0) + 1;
    
    // Add timestamp for recent searches
    if (!existingAnalytics[`${term}_timestamps`]) {
      existingAnalytics[`${term}_timestamps`] = [];
    }
    existingAnalytics[`${term}_timestamps`].push(Date.now());
    
    // Keep only last 10 timestamps per term
    if (existingAnalytics[`${term}_timestamps`].length > 10) {
      existingAnalytics[`${term}_timestamps`] = existingAnalytics[`${term}_timestamps`].slice(-10);
    }
    
    // Save back to localStorage
    localStorage.setItem(SEARCH_ANALYTICS_KEY, JSON.stringify(existingAnalytics));
    
    // Update popular searches
    updatePopularSearches(existingAnalytics);
    
  } catch (error) {
    console.error('Error tracking search:', error);
  }
};

/**
 * Update popular searches based on analytics
 * @param {Object} analytics - Search analytics data
 */
const updatePopularSearches = (analytics) => {
  try {
    // Get search terms with their counts (excluding timestamp keys)
    const searchTerms = Object.keys(analytics)
      .filter(key => !key.endsWith('_timestamps'))
      .map(term => ({
        term,
        count: analytics[term],
        lastSearched: Math.max(...(analytics[`${term}_timestamps`] || [0]))
      }))
      .sort((a, b) => {
        // Sort by count first, then by recency
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return b.lastSearched - a.lastSearched;
      })
      .slice(0, 10) // Keep top 10
      .map(item => item.term);

    localStorage.setItem(POPULAR_SEARCHES_KEY, JSON.stringify(searchTerms));
  } catch (error) {
    console.error('Error updating popular searches:', error);
  }
};

/**
 * Get popular searches
 * @returns {Array} Array of popular search terms
 */
export const getPopularSearches = () => {
  try {
    return JSON.parse(localStorage.getItem(POPULAR_SEARCHES_KEY) || '[]');
  } catch (error) {
    console.error('Error getting popular searches:', error);
    return [];
  }
};

/**
 * Get search analytics
 * @returns {Object} Search analytics data
 */
export const getSearchAnalytics = () => {
  try {
    return JSON.parse(localStorage.getItem(SEARCH_ANALYTICS_KEY) || '{}');
  } catch (error) {
    console.error('Error getting search analytics:', error);
    return {};
  }
};

/**
 * Get search suggestions based on current input
 * @param {string} input - Current search input
 * @param {number} limit - Maximum number of suggestions
 * @returns {Array} Array of search suggestions
 */
export const getSearchSuggestions = (input, limit = 5) => {
  if (!input || input.trim().length < 1) return [];

  const term = input.trim().toLowerCase();
  const analytics = getSearchAnalytics();
  
  // Get all search terms that contain the input
  const matchingTerms = Object.keys(analytics)
    .filter(key => !key.endsWith('_timestamps'))
    .filter(searchTerm => searchTerm.includes(term))
    .map(searchTerm => ({
      term: searchTerm,
      count: analytics[searchTerm],
      lastSearched: Math.max(...(analytics[`${searchTerm}_timestamps`] || [0]))
    }))
    .sort((a, b) => {
      // Prioritize exact matches, then by count, then by recency
      const aExact = a.term === term;
      const bExact = b.term === term;
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return b.lastSearched - a.lastSearched;
    })
    .slice(0, limit)
    .map(item => item.term);

  return matchingTerms;
};

/**
 * Clear search analytics
 */
export const clearSearchAnalytics = () => {
  localStorage.removeItem(SEARCH_ANALYTICS_KEY);
  localStorage.removeItem(POPULAR_SEARCHES_KEY);
};

/**
 * Get search trends (searches in the last 7 days)
 * @returns {Array} Array of recent search trends
 */
export const getSearchTrends = () => {
  try {
    const analytics = getSearchAnalytics();
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    const recentSearches = Object.keys(analytics)
      .filter(key => !key.endsWith('_timestamps'))
      .map(term => {
        const timestamps = analytics[`${term}_timestamps`] || [];
        const recentCount = timestamps.filter(timestamp => timestamp > sevenDaysAgo).length;
        
        return {
          term,
          totalCount: analytics[term],
          recentCount,
          lastSearched: Math.max(...timestamps)
        };
      })
      .filter(item => item.recentCount > 0)
      .sort((a, b) => b.recentCount - a.recentCount)
      .slice(0, 10);

    return recentSearches;
  } catch (error) {
    console.error('Error getting search trends:', error);
    return [];
  }
};

/**
 * Frontend Cache Utilities
 * 
 * Provides local caching layer that works alongside backend Redis caching
 * This is optional and can be used for additional performance optimization
 */

const CACHE_PREFIX = 'app_cache_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached data from localStorage
 * @param {string} key - Cache key
 * @returns {any|null} Cached data or null if expired/not found
 */
export const getCache = (key) => {
  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!cached) return null;

    const { data, expiresAt } = JSON.parse(cached);
    
    if (Date.now() > expiresAt) {
      // Cache expired, remove it
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
};

/**
 * Set cached data in localStorage
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in milliseconds
 */
export const setCache = (key, data, ttl = DEFAULT_TTL) => {
  try {
    const expiresAt = Date.now() + ttl;
    localStorage.setItem(
      `${CACHE_PREFIX}${key}`,
      JSON.stringify({ data, expiresAt })
    );
  } catch (error) {
    console.error('Error setting cache:', error);
    // If localStorage is full, clear old cache entries
    clearExpiredCache();
  }
};

/**
 * Remove cached data
 * @param {string} key - Cache key
 */
export const removeCache = (key) => {
  try {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
  } catch (error) {
    console.error('Error removing cache:', error);
  }
};

/**
 * Clear all expired cache entries
 */
export const clearExpiredCache = () => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        const cached = localStorage.getItem(key);
        if (cached) {
          try {
            const { expiresAt } = JSON.parse(cached);
            if (Date.now() > expiresAt) {
              localStorage.removeItem(key);
            }
          } catch {
            // Invalid cache entry, remove it
            localStorage.removeItem(key);
          }
        }
      }
    });
  } catch (error) {
    console.error('Error clearing expired cache:', error);
  }
};

/**
 * Clear all cache entries
 */
export const clearAllCache = () => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error clearing all cache:', error);
  }
};

/**
 * Generate cache key from parameters
 * @param {string} baseKey - Base cache key
 * @param {Object} params - Parameters to include in key
 * @returns {string} Generated cache key
 */
export const generateCacheKey = (baseKey, params = {}) => {
  const paramString = Object.keys(params)
    .sort()
    .map((key) => `${key}:${params[key]}`)
    .join('|');
  
  return paramString ? `${baseKey}_${paramString}` : baseKey;
};

export default {
  getCache,
  setCache,
  removeCache,
  clearExpiredCache,
  clearAllCache,
  generateCacheKey,
};


import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache constants
export const SEARCH_CACHE_KEY = 'recent_searches_cache';
export const SEARCH_CACHE_RESULTS_KEY = 'search_results_cache_';
export const SEARCH_CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes
export const MAX_RECENT_SEARCHES = 10;

/**
 * Generate a cache key for search params
 * @param prefix The prefix for the cache key
 * @param params The search parameters object
 * @param filters Optional filters array
 * @param sort Optional sort option
 * @returns A unique string key
 */
export const generateCacheKey = (
  prefix: string,
  params: any,
  filters?: string[],
  sort?: string
): string => {
  // Create a normalized object with all parameters
  const normalizedParams = {
    ...params,
    filters: filters ? [...filters].sort() : [],
    sort: sort || 'default'
  };
  
  // Convert to stable string
  const paramsStr = JSON.stringify(normalizedParams, Object.keys(normalizedParams).sort());
  
  // Use a simple hash function for the string
  let hash = 0;
  for (let i = 0; i < paramsStr.length; i++) {
    const char = paramsStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return `${prefix}${hash}`;
};

/**
 * Save a search term to recent searches cache
 */
export const saveRecentSearch = async (searchTerm: string): Promise<void> => {
  try {
    // Get existing recent searches
    const cachedSearchesJSON = await AsyncStorage.getItem(SEARCH_CACHE_KEY);
    let recentSearches: string[] = [];
    
    if (cachedSearchesJSON) {
      recentSearches = JSON.parse(cachedSearchesJSON);
    }
    
    // Add the new search term to the front (if it doesn't exist)
    if (!recentSearches.includes(searchTerm)) {
      recentSearches.unshift(searchTerm);
      
      // Limit to MAX_RECENT_SEARCHES items
      if (recentSearches.length > MAX_RECENT_SEARCHES) {
        recentSearches = recentSearches.slice(0, MAX_RECENT_SEARCHES);
      }
      
      // Save back to cache
      await AsyncStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(recentSearches));
    } else {
      // If it exists, move it to the front
      recentSearches = recentSearches.filter(term => term !== searchTerm);
      recentSearches.unshift(searchTerm);
      await AsyncStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(recentSearches));
    }
  } catch (error) {
    console.warn('[SearchUtils] Error saving recent search:', error);
  }
};

/**
 * Load recent searches from cache
 */
export const loadRecentSearches = async (): Promise<string[]> => {
  try {
    const cachedSearchesJSON = await AsyncStorage.getItem(SEARCH_CACHE_KEY);
    
    if (cachedSearchesJSON) {
      return JSON.parse(cachedSearchesJSON);
    }
    
    return [];
  } catch (error) {
    console.warn('[SearchUtils] Error loading recent searches:', error);
    return [];
  }
};

/**
 * Save search results to cache
 * @param searchParams Search parameters used
 * @param result Search results to cache
 * @param filters Applied filters (string array)
 * @param sort Applied sort option
 * @param expiryTime Optional custom expiry time in milliseconds
 */
export const cacheSearchResults = async (
  searchParams: any, 
  result: any, 
  filters: string[], 
  sort: string,
  expiryTime?: number
): Promise<void> => {
  try {
    // Generate cache key using the updated function
    const cacheKey = generateCacheKey(SEARCH_CACHE_RESULTS_KEY, searchParams, filters, sort);
    
    // Save to cache with timestamp
    await AsyncStorage.setItem(
      cacheKey,
      JSON.stringify({
        data: result,
        timestamp: Date.now(),
        filters,
        sort,
        expiryTime: expiryTime || SEARCH_CACHE_EXPIRY_TIME
      })
    );
    
    console.log(`[searchUtils] Cached search results with key: ${cacheKey}`);
  } catch (error) {
    console.error('Failed to cache search results:', error);
  }
};

/**
 * Get cached search results
 * @param searchParams Search parameters
 * @param filters Applied filters (string array)
 * @param sort Applied sort option
 * @param expiryTime Optional custom expiry time in milliseconds
 * @returns Cached search results if found and not expired, null otherwise
 */
export const getCachedSearchResults = async (
  searchParams: any, 
  filters: string[], 
  sort: string,
  expiryTime?: number
): Promise<any | null> => {
  try {
    // Generate cache key using the updated function
    const cacheKey = generateCacheKey(SEARCH_CACHE_RESULTS_KEY, searchParams, filters, sort);
    
    // Try to get from cache
    const cachedItem = await AsyncStorage.getItem(cacheKey);
    
    if (cachedItem) {
      const { data, timestamp, filters: cachedFilters, sort: cachedSort, expiryTime: cachedExpiryTime } = JSON.parse(cachedItem);
      
      // Check if filters and sort match
      const filtersMatch = JSON.stringify(filters.sort()) === JSON.stringify(cachedFilters.sort());
      const sortMatch = sort === cachedSort;
      
      // Use provided expiry time, cached expiry time, or default
      const actualExpiryTime = expiryTime || cachedExpiryTime || SEARCH_CACHE_EXPIRY_TIME;
      const isExpired = Date.now() - timestamp > actualExpiryTime;
      
      if (!isExpired && filtersMatch && sortMatch) {
        console.log(`[searchUtils] Using cached search results for key: ${cacheKey}`);
        return data;
      } else {
        console.log(`[searchUtils] Cached search results expired or filters/sort changed for key: ${cacheKey}`);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get cached search results:', error);
    return null;
  }
}; 
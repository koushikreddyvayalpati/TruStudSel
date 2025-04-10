import { useState, useCallback, useMemo, useEffect } from 'react';
import { Alert } from 'react-native';
import { debounce } from 'lodash';
import {
  searchProducts,
  SearchProductsParams
} from '../../api/products';
import {
  saveRecentSearch,
  loadRecentSearches,
  cacheSearchResults,
  getCachedSearchResults
} from './searchUtils';

// Increase cache expiry time to reduce API calls
const SEARCH_CACHE_LIFETIME = 30 * 60 * 1000; // 30 minutes

/**
 * Custom hook for the search functionality in HomeScreen
 */
export const useSearch = (userUniversity: string, userCity: string) => {
  // Search related states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [paginationToken, setPaginationToken] = useState<string | null>(null);
  const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [selectedSort, setSelectedSort] = useState('default');
  const [lastSearchParams, setLastSearchParams] = useState<SearchProductsParams | null>(null);
  const [searchRefreshCount, setSearchRefreshCount] = useState<number>(0);
  
  // Load recent searches on initialization
  useEffect(() => {
    const fetchRecentSearches = async () => {
      const searches = await loadRecentSearches();
      setRecentSearches(searches);
    };
    
    fetchRecentSearches();
  }, []);
  
  // Function to increment search refresh counter (called from parent)
  const incrementSearchRefreshCount = useCallback(() => {
    setSearchRefreshCount(prev => prev + 1);
    console.log('[HomeScreen] Search refresh count incremented');
  }, []);
  
  // Function to reset search refresh counter (called after fresh API data)
  const resetSearchRefreshCount = useCallback(() => {
    setSearchRefreshCount(0);
    console.log('[HomeScreen] Search refresh count reset');
  }, []);
  
  // Search handler
  const handleSearch = useCallback(async () => {
    if (!searchQuery || searchQuery.length < 3) {
      // Show a validation message if search term is too short
      Alert.alert(
        'Search Error', 
        'Search terms must be at least 3 characters',
        [{ text: 'OK', onPress: () => console.log('OK Pressed') }]
      );
      return;
    }
    
    if (!userUniversity && !userCity) {
      // Must have either university or city to search
      Alert.alert(
        'Search Error', 
        'Location information (university or city) is required for search',
        [{ text: 'OK', onPress: () => console.log('OK Pressed') }]
      );
      return;
    }
    
    setIsSearching(true);
    setShowSearchResults(true);
    setSearchError(null);
    
    // Save this search term to recent searches
    await saveRecentSearch(searchQuery);
    
    console.log(`[HomeScreen] Searching for: ${searchQuery}`);
    
    try {
      // Construct search parameters
      const searchParams: SearchProductsParams = {
        keyword: searchQuery,
        university: userUniversity || undefined,
        city: userUniversity ? undefined : userCity,
        size: 20
      };
      
      // Add filters if selected
      if (selectedFilters.length > 0) {
        // Map condition filters to backend format
        const conditionFilters = selectedFilters.filter(filter => 
          ['brand-new', 'like-new', 'very-good', 'good', 'acceptable', 'for-parts'].includes(filter)
        );
        
        // Extract selling type filters
        const sellingTypeFilters = selectedFilters.filter(filter => 
          ['rent', 'sell'].includes(filter)
        );
        
        // Only add conditions if there are any
        if (conditionFilters.length > 0) {
          searchParams.condition = conditionFilters;
        }
        
        // Only add selling types if there are any
        if (sellingTypeFilters.length > 0) {
          searchParams.sellingType = sellingTypeFilters;
        }
        
        // Add price filter for "free" (price = 0)
        if (selectedFilters.includes('free')) {
          searchParams.maxPrice = 0;
        }
      }
      
      // Add sorting if selected
      if (selectedSort !== 'default') {
        // Map frontend sort options to backend parameters
        switch (selectedSort) {
          case 'price_low_to_high':
            searchParams.sortBy = 'price';
            searchParams.sortDirection = 'asc';
            break;
          case 'price_high_to_low':
            searchParams.sortBy = 'price';
            searchParams.sortDirection = 'desc';
            break;
          case 'newest':
            searchParams.sortBy = 'postingdate';
            searchParams.sortDirection = 'desc';
            break;
          case 'popularity':
            searchParams.sortBy = 'popularity';
            searchParams.sortDirection = 'desc';
            break;
        }
      }
      
      // Store search params for potential reuse
      setLastSearchParams(searchParams);
      
      console.log(`[HomeScreen] Search params:`, searchParams);
      
      // Check if we should use cache based on refresh count
      const useCache = searchRefreshCount < 2;
      
      if (useCache) {
        // Check cache first with longer expiry time
        const cachedResults = await getCachedSearchResults(
          searchParams, 
          selectedFilters, 
          selectedSort
        );
        
        if (cachedResults) {
          // Use cached results
          setSearchResults(cachedResults.products || []);
          setHasMoreSearchResults(cachedResults.hasMorePages || false);
          setPaginationToken(cachedResults.nextPageToken || null);
          setCurrentPage(cachedResults.currentPage || 0);
          setTotalPages(cachedResults.totalPages || 1);
          console.log(`[HomeScreen] Using cached search results for: ${searchQuery}`);
          return;
        }
      } else {
        console.log(`[HomeScreen] Skipping search cache due to refresh count (${searchRefreshCount})`);
      }
      
      // If no cache or cache skipped, fetch from API
      const result = await searchProducts(searchParams);
      
      // Update results state
      setSearchResults(result.products || []);
      setHasMoreSearchResults(result.hasMorePages || false);
      setPaginationToken(result.nextPageToken || null);
      setCurrentPage(result.currentPage || 0);
      setTotalPages(result.totalPages || 1);
      console.log(`[HomeScreen] Search found ${result.products?.length || 0} results`);
      
      // Save to cache with longer expiry
      await cacheSearchResults(searchParams, result, selectedFilters, selectedSort, SEARCH_CACHE_LIFETIME);
      
      // Reset search refresh counter after fresh data
      resetSearchRefreshCount();
      
    } catch (error) {
      console.error('[HomeScreen] Search error:', error);
      setSearchError(error instanceof Error ? error.message : 'Failed to search products');
      
      // Display empty results with error
      setSearchResults([]);
      setHasMoreSearchResults(false);
      setPaginationToken(null);
    } finally {
      setIsSearching(false);
    }
  }, [
    searchQuery, 
    userUniversity, 
    userCity, 
    selectedFilters, 
    selectedSort, 
    searchRefreshCount, 
    resetSearchRefreshCount
  ]);
  
  // Load more results
  const handleLoadMoreSearchResults = useCallback(async () => {
    if (isLoadingMore || !hasMoreSearchResults || !lastSearchParams) return;
    
    setIsLoadingMore(true);
    setLoadMoreError(null);
    
    try {
      // Use last search params and add pagination
      const searchParams = { ...lastSearchParams };
      
      // Handle both token-based and page-based pagination
      if (paginationToken) {
        // Token-based pagination (preferred)
        searchParams.paginationToken = paginationToken;
      } else {
        // Page-based pagination (fallback)
        searchParams.page = currentPage + 1;
      }
      
      console.log(`[HomeScreen] Loading more search results with params:`, searchParams);
      
      const result = await searchProducts(searchParams);
      
      // Append new results to existing results
      setSearchResults(prev => [...prev, ...(result.products || [])]);
      setHasMoreSearchResults(result.hasMorePages || false);
      setPaginationToken(result.nextPageToken || null);
      setCurrentPage(result.currentPage || currentPage + 1);
      setTotalPages(result.totalPages || totalPages);
      
      console.log(`[HomeScreen] Loaded ${result.products?.length || 0} more search results`);
      
    } catch (error) {
      console.error('[HomeScreen] Error loading more search results:', error);
      setLoadMoreError(error instanceof Error ? error.message : 'Failed to load more results');
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    isLoadingMore, 
    hasMoreSearchResults, 
    lastSearchParams,
    paginationToken, 
    currentPage, 
    totalPages
  ]);
  
  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setShowSearchResults(false);
    setSearchResults([]);
    setSearchError(null);
    setPaginationToken(null);
    setHasMoreSearchResults(false);
    setLastSearchParams(null);
    console.log('[HomeScreen] Search cleared');
  }, []);
  
  // Function to handle selecting a recent search
  const handleSelectRecentSearch = useCallback((term: string) => {
    setSearchQuery(term);
    setShowRecentSearches(false);
    // Instead of triggering search immediately, let user press button/enter
    // This prevents multiple API calls when selecting recent searches
  }, [setSearchQuery]);
  
  // Create a debounced search function (now only used internally)
  const debouncedSearch = useMemo(
    () => debounce((searchText: string) => {
      if (searchText && searchText.length >= 3) {
        // This is now only triggered explicitly, not automatically on typing
        console.log(`[HomeScreen] Executing debounced search for: ${searchText}`);
        handleSearch();
      }
    }, 500), // 500ms debounce
    [handleSearch]
  );
  
  // Explicit function to perform search (no automatic search while typing)
  const handleSearchButtonPress = useCallback(() => {
    console.log('[HomeScreen] Search button pressed or Enter key pressed');
    if (searchQuery && searchQuery.length >= 3) {
      handleSearch();
    } else if (searchQuery.length > 0) {
      // Show a validation message if search term is too short
      Alert.alert(
        'Search Error', 
        'Search terms must be at least 3 characters',
        [{ text: 'OK', onPress: () => console.log('OK Pressed') }]
      );
    }
  }, [searchQuery, handleSearch]);
  
  return {
    // States
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    isLoadingMore,
    hasMoreSearchResults,
    showSearchResults,
    setShowSearchResults,
    searchError,
    loadMoreError,
    currentPage,
    totalPages,
    recentSearches,
    showRecentSearches,
    setShowRecentSearches,
    selectedFilters,
    setSelectedFilters,
    selectedSort,
    setSelectedSort,
    searchRefreshCount,
    
    // Handlers
    handleSearch,
    handleSearchButtonPress,
    handleLoadMoreSearchResults,
    handleClearSearch,
    handleSelectRecentSearch,
    debouncedSearch,
    incrementSearchRefreshCount,
    resetSearchRefreshCount
  };
}; 
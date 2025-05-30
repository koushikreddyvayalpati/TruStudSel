import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../types/product';
import {
  getProductsByCategory,
  getProductsByUniversity,
  getProductsByCity,
  getFeaturedProducts,
  getNewArrivals,
  ProductFilters,
} from '../api/products';

// Cache constants
export const CATEGORY_PRODUCTS_CACHE_KEY = 'category_products_cache_';
export const PRODUCTS_CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes

// Define the store state type
interface CategoryState {
  // Product data
  products: Product[];
  productsOriginal: Product[];

  // Loading states
  loading: boolean;
  loadingMoreData: boolean;
  error: string | null;
  refreshing: boolean;

  // Pagination state
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasMoreData: boolean;

  // Search, sort and filter states
  searchQuery: string;
  selectedSortOption: string;
  selectedFilters: string[];

  // UI states
  isSortDropdownVisible: boolean;
  isFilterDropdownVisible: boolean;

  // Current category context
  currentCategory: {
    name: string;
    id: number;
    university: string;
    city: string;
  };

  // Set current category context
  setCurrentCategory: (name: string, id: number, university: string, city: string) => void;

  // Actions
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  setRefreshing: (isRefreshing: boolean) => void;
  setSortDropdownVisible: (isVisible: boolean) => void;
  setFilterDropdownVisible: (isVisible: boolean) => void;
  setSelectedSortOption: (option: string) => void;
  setSelectedFilters: (filters: string[]) => void;
  setLoading: (isLoading: boolean) => void;
  setState: (partialState: Partial<CategoryState>) => void;

  // Load category products, supporting both initial load and pagination
  loadCategoryProducts: (
    categoryName: string,
    categoryId: number,
    userUniversity: string,
    userCity: string,
    page?: number,
    shouldAppend?: boolean,
    options?: any
  ) => Promise<void>;

  // Handle search
  searchProducts: (query: string) => Promise<void>;

  // Handle refresh
  handleRefresh: (currentUniversity: string, currentCity: string) => Promise<void>;

  // Handle filters
  applyFilters: () => void;
  clearFilters: () => void;

  // Handle load more
  loadMore: () => Promise<void>;

  // Helper function for caching
  cacheProducts: (categoryName: string, userParams: any, products: Product[], paginationData: any) => Promise<void>;
  getCachedProducts: (categoryName: string, userParams: any) => Promise<any>;

  // Generate a hash for cache keys
  generateCacheKey: (categoryName: string, params: any) => string;
}

// Create a simple hash function for cache keys
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
};

// Create the store
const useCategoryStore = create<CategoryState>((set, get) => ({
  // Initial state
  products: [],
  productsOriginal: [],

  loading: false,
  loadingMoreData: false,
  error: null,
  refreshing: false,

  currentPage: 0,
  totalPages: 1,
  totalCount: 0,
  hasMoreData: false,

  searchQuery: '',
  selectedSortOption: 'default',
  selectedFilters: [],

  isSortDropdownVisible: false,
  isFilterDropdownVisible: false,

  // Current category context
  currentCategory: {
    name: '',
    id: 0,
    university: '',
    city: '',
  },

  // Set current category context
  setCurrentCategory: (name, id, university, city) => set({ currentCategory: { name, id, university, city } }),

  // Actions
  setError: (error) => set({ error }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setRefreshing: (isRefreshing) => set({ refreshing: isRefreshing }),
  setSortDropdownVisible: (isVisible) => set({ isSortDropdownVisible: isVisible }),
  setFilterDropdownVisible: (isVisible) => set({ isFilterDropdownVisible: isVisible }),
  setSelectedSortOption: (option) => set({ selectedSortOption: option }),
  setSelectedFilters: (filters) => set({ selectedFilters: filters }),
  setLoading: (isLoading) => set({ loading: isLoading }),
  setState: (partialState) => set(state => ({ ...state, ...partialState })),

  // Helper function to generate cache key
  generateCacheKey: (categoryName, params) => {
    // Determine the product type based on categoryName and params
    const { userUniversity, userCity, categoryId, searchQuery, page } = params;
    const isFeatured = categoryName === 'Featured Products';
    const isNewArrivals = categoryName === 'New Arrivals';
    const isUniversityType = (categoryName.includes('University') || 
                        (categoryName.endsWith('Products') && !categoryName.match(/^[A-Z][a-z]+ Products$/))) && 
                        userUniversity && userUniversity.length > 0;
    const isCityType = (categoryId === 0 && 
                   userCity && 
                   userCity.length > 0 && 
                   (categoryName === `${userCity} Products` || categoryName.match(/^[A-Z][a-z]+ Products$/))) &&
                   !isFeatured && 
                   !isNewArrivals && 
                   !isUniversityType;
    
    let primaryIdentifier = categoryId !== 0 ? categoryId : categoryName;
    let keyParams: any = {
      query: searchQuery?.trim() || undefined,
      page: page || 0,
    };

    // Add specific identifiers based on the determined type
    if (isUniversityType) {
      keyParams.university = userUniversity;
      primaryIdentifier = `university-${userUniversity}`; // Use university as part of the primary ID
    } else if (isCityType) {
      keyParams.city = userCity;
      primaryIdentifier = `city-${userCity}`; // Use city as part of the primary ID
    } else if (isFeatured || isNewArrivals) {
      // Featured/New Arrivals might depend on both or either
      keyParams.university = userUniversity || undefined;
      keyParams.city = userCity || undefined;
    } else {
      // Regular category - no extra identifiers needed in keyParams usually
    }

    const filterString = JSON.stringify(keyParams);
    // Use the more specific primaryIdentifier in the key
    return `${CATEGORY_PRODUCTS_CACHE_KEY}${primaryIdentifier}_${simpleHash(filterString)}`;
  },

  // Helper function to cache products
  cacheProducts: async (categoryName, userParams, products, paginationData) => {
    try {
      const cacheKey = get().generateCacheKey(categoryName, userParams);
      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({
          data: products,
          timestamp: Date.now(),
          totalPages: paginationData.totalPages || 1,
          totalCount: paginationData.totalCount || products.length,
        })
      );

      console.log(`[CategoryStore] Cached ${products.length} products with key: ${cacheKey}`);
    } catch (error) {
      console.error('[CategoryStore] Error caching products:', error);
    }
  },

  // Helper function to get products from cache
  getCachedProducts: async (categoryName, userParams) => {
    try {
      const cacheKey = get().generateCacheKey(categoryName, userParams);
      const cachedData = await AsyncStorage.getItem(cacheKey);

      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        const { data, timestamp, totalPages, totalCount } = parsedData;
        const isExpired = Date.now() - timestamp > PRODUCTS_CACHE_EXPIRY_TIME;

        if (!isExpired && Array.isArray(data) && data.length > 0) {
          console.log(`[CategoryStore] Using cached products from: ${cacheKey}`);
          return { data, totalPages, totalCount };
        } else {
          console.log(`[CategoryStore] Cache expired or empty for: ${cacheKey}`);
        }
      }
      return null;
    } catch (error) {
      console.error('[CategoryStore] Error retrieving cached products:', error);
      return null;
    }
  },

  // Load category products
  loadCategoryProducts: async (
    categoryName, 
    categoryId, 
    userUniversity, 
    userCity, 
    page = 0, 
    shouldAppend = false,
    options = {}
  ) => {
    // Don't set loading true if we're loading more data (pagination)
    if (!shouldAppend) {
      console.log(`[CategoryStore] Loading initial products for ${categoryName}`);
      set({ loading: true, error: null });
    } else {
      console.log(`[CategoryStore] Loading more products for ${categoryName}, page ${page}`);
      set({ loadingMoreData: true, error: null });
    }

    const currentState = get();
    const searchQuery = currentState.searchQuery;

    try {
      // Create user params object for cache key generation
      const userParams = {
        userUniversity,
        userCity,
        categoryId,
        searchQuery,
        page,
      };

      // Check if this is a university filtered request
      const isUniversityFiltered = userUniversity && userUniversity.length > 0;
      
      // Only check cache for first page, when no search query is provided, and not a university filtered request
      const shouldCheckCache = page === 0 && !searchQuery && !isUniversityFiltered;
      const cachedData = shouldCheckCache ? 
        await get().getCachedProducts(categoryName, userParams) : null;

      if (cachedData && !shouldAppend) {
        const { data, totalPages, totalCount } = cachedData;

        set({
          products: data,
          productsOriginal: data,
          totalCount: totalCount || data.length,
          totalPages: totalPages || 1,
          hasMoreData: page < (totalPages - 1 || 0),
          currentPage: page,
          loading: false,
          loadingMoreData: false,
        });
        return;
      }

      // Create API filters including pagination
      const apiSearchFilters: ProductFilters = {
        page: page,
        size: 10, // Number of items per page
      };

      // Add search query if present
      if (searchQuery) {
        // API expects 'keyword' not 'query'
        apiSearchFilters.keyword = searchQuery;
      }

      // Check if special options for university filtering were provided
      const useUniversityEndpoint = options?.useUniversityEndpoint === true;
      const categoryFilter = options?.categoryFilter;
      
      // Add category filter if provided
      if (categoryFilter) {
        console.log(`[CategoryStore] Adding category filter: ${categoryFilter}`);
        apiSearchFilters.category = categoryFilter.toLowerCase(); // Ensure category is lowercase
      }

      // Determine if this is a featured, new arrivals, university, city or regular category
      const isFeatured = categoryName === 'Featured Products';
      const isNewArrivals = categoryName === 'New Arrivals';
      const isUniversity = useUniversityEndpoint || 
                         ((categoryName.includes('University') || 
                          (categoryName.endsWith('Products') && !categoryName.match(/^[A-Z][a-z]+ Products$/))) && 
                          userUniversity && userUniversity.length > 0);
      const isCity = (categoryId === 0 && 
                     userCity && 
                     userCity.length > 0 && 
                     (categoryName === `${userCity} Products` || categoryName.match(/^[A-Z][a-z]+ Products$/))) &&
                     !isFeatured && 
                     !isNewArrivals && 
                     !isUniversity;

      // After defining the product types, add detailed logging
      console.log(`[CategoryStore] Category detection:
        Name: ${categoryName}
        CategoryId: ${categoryId}
        University: ${userUniversity}
        City: ${userCity}
        isFeatured: ${isFeatured}
        isNewArrivals: ${isNewArrivals}
        isUniversity: ${isUniversity}
        isCity: ${isCity}
      `);

      // Always include university in API filters if provided
      if (userUniversity && userUniversity.length > 0) {
        console.log(`[CategoryStore] Including university filter: ${userUniversity}`);
        apiSearchFilters.university = userUniversity;
      }

      let result;
      // Determine which API to call based on the type
      if (isFeatured) {
        console.log(`[CategoryStore] Fetching featured products with pagination, page ${page}`);
        result = await getFeaturedProducts(userUniversity, userCity, page > 0 ? String(page) : null, 10);
      } else if (isNewArrivals) {
        console.log(`[CategoryStore] Fetching new arrivals with pagination, page ${page}`);
        if (!userUniversity) {
          throw new Error('University is required for new arrivals');
        }
        result = await getNewArrivals(userUniversity, page > 0 ? String(page) : null, 10);
      } else if (isUniversity && userUniversity) {
        console.log(`[CategoryStore] Fetching university products with pagination, page ${page}`);
        result = await getProductsByUniversity(userUniversity, apiSearchFilters);
      } else if (isCity && userCity) {
        console.log(`[CategoryStore] Fetching city products for city: "${userCity}" with pagination, page ${page}`);
        console.log(`[CategoryStore] API search filters:`, JSON.stringify(apiSearchFilters));
        
        // Always include the userCity parameter in the apiSearchFilters for city products
        if (userCity) {
          apiSearchFilters.city = userCity;
        }
        
        // Add university parameter if available
        if (userUniversity) {
          apiSearchFilters.university = userUniversity;
        }
        
        result = await getProductsByCity(userCity, apiSearchFilters);
        console.log(`[CategoryStore] City products API response received:`, 
                    `${result && 'products' in result ? result.products.length : 0} products`);
      } else {
        console.log(`[CategoryStore] Fetching category products with pagination, page ${page}`);
        result = await getProductsByCategory(categoryName.toLowerCase(), apiSearchFilters);
      }

      // Handle different response formats from different APIs
      let productsList: Product[] = [];
      let totalItems = 0;
      let pagesTotal = 1;

      console.log(`[CategoryStore] Result type: ${typeof result}`,
                  `isArray: ${Array.isArray(result)}`,
                  `hasProducts: ${result && typeof result === 'object' && 'products' in result}`);

      if (Array.isArray(result)) {
        // Legacy API response (array of products)
        console.log(`[CategoryStore] Processing array response with ${result.length} items`);
        productsList = result;
        totalItems = result.length;
        pagesTotal = 1; // If it's just an array, assume single page
      } else if (result && typeof result === 'object') {
        if (Array.isArray(result.products)) {
          // New paginated response format with products array
          console.log(`[CategoryStore] Processing paginated response with ${result.products.length} items`);
          productsList = result.products;
          totalItems = result.totalItems || result.products.length;
          pagesTotal = result.totalPages || 1;
        } else {
          // Handle unexpected object format - attempt to extract products
          console.warn('[CategoryStore] Unexpected object response format:', JSON.stringify(result).substring(0, 200));

          // Try to extract any product-like objects
          if ((result as any).data && Array.isArray((result as any).data)) {
            console.log(`[CategoryStore] Found products in result.data (${(result as any).data.length} items)`);
            // Cast the unknown format to any to extract data array
            const anyResult = result as any;
            productsList = anyResult.data;
            totalItems = anyResult.totalCount || anyResult.data.length;
            pagesTotal = anyResult.totalPages || 1;
          } else {
            // Last resort - treat the entire object as a single product if it has an id
            if ((result as any).id) {
              console.log(`[CategoryStore] Treating object as single product with id: ${(result as any).id}`);
              productsList = [(result as unknown) as Product];
              totalItems = 1;
              pagesTotal = 1;
            } else {
              console.error('[CategoryStore] Could not extract products from response:', JSON.stringify(result).substring(0, 200));
            }
          }
        }
      } else {
        console.error('[CategoryStore] Invalid response format - received:', result);
      }

      console.log(`[CategoryStore] Loaded ${productsList.length} products, page ${page}/${pagesTotal - 1}, total: ${totalItems}`);

      // Update store state
      if (shouldAppend) {
        // Append new products to existing list for pagination
        set(state => ({
          products: [...state.products, ...productsList],
          productsOriginal: [...state.productsOriginal, ...productsList],
          totalCount: totalItems,
          totalPages: pagesTotal,
          currentPage: page,
          hasMoreData: page < pagesTotal - 1,
          loading: false,
          loadingMoreData: false,
        }));
      } else {
        // Replace products for initial load or refresh
        set({
          products: productsList,
          productsOriginal: productsList,
          totalCount: totalItems,
          totalPages: pagesTotal,
          currentPage: page,
          hasMoreData: page < pagesTotal - 1,
          loading: false,
          loadingMoreData: false,
        });
      }

      // Save to cache (only first page)
      if (page === 0) {
        await get().cacheProducts(categoryName, userParams, productsList, {
          totalPages: pagesTotal,
          totalCount: totalItems,
        });
      }
    } catch (err: any) {
      console.error('[CategoryStore] Error loading products:', err);
      set({
        error: err?.message || 'Failed to load products',
        loading: false,
        loadingMoreData: false,
      });

      if (!shouldAppend) {
        // Only clear products on initial load error
        set({
          products: [],
          productsOriginal: [],
          totalCount: 0,
          hasMoreData: false,
        });
      }
    }
  },

  // Handle search
  searchProducts: async (query) => {
    set({ searchQuery: query });
    const currentState = get();
    const { productsOriginal } = currentState;

    console.log(`[CategoryStore] Searching for "${query}" in current products`);
    
    if (!query.trim()) {
      // If query is empty, restore original products
      set({ products: productsOriginal });
      return;
    }
    
    // Front-end filtering - convert query to lowercase for case-insensitive search
    const lowercaseQuery = query.trim().toLowerCase();
    
    // Filter products that match the search query in name or description
    const filteredProducts = productsOriginal.filter(product => {
      const name = product.name?.toLowerCase() || '';
      const description = product.description?.toLowerCase() || '';
      
      return name.includes(lowercaseQuery) || description.includes(lowercaseQuery);
    });
    
    console.log(`[CategoryStore] Found ${filteredProducts.length} products matching "${query}"`);
    
    // Update the products in state with the filtered results
    set({ products: filteredProducts });
  },

  // Handle refresh
  handleRefresh: async (currentUniversity, currentCity) => {
    set({ refreshing: true });
    const currentState = get();
    // Use the CURRENT context passed from the screen, not the potentially stale
    // context stored in currentCategory from the initial load.
    const { name: categoryName, id: categoryId } = currentState.currentCategory; 

    console.log(`[CategoryStore] Refresh triggered for ${categoryName}. Using current University: ${currentUniversity}, City: ${currentCity}`);

    // Reload the current category from page 0 using the provided context
    await currentState.loadCategoryProducts(
      categoryName,
      categoryId,
      currentUniversity, // Use argument
      currentCity,       // Use argument
      0, // Restart from page 0
      false // Replace existing, don't append
    );

    set({ refreshing: false });
  },

  // Apply sort and filters to the original products
  applyFilters: () => {
    const state = get();

    // Skip if no original products
    if (state.productsOriginal.length === 0) {return;}

    // Start with a fresh copy of the original products
    let filteredProducts = [...state.productsOriginal];

    // Track if any operations were applied
    let operationsApplied = false;

    // Apply filters first
    if (state.selectedFilters.length > 0) {
      operationsApplied = true;

      // Pre-process filter arrays for faster lookups
      const conditionFilters = new Set(
        state.selectedFilters.filter(filter =>
          ['brand-new', 'like-new', 'very-good', 'good', 'acceptable', 'for-parts'].includes(filter)
        )
      );

      const sellingTypeFilters = new Set(
        state.selectedFilters.filter(filter =>
          ['rent', 'sell', 'free'].includes(filter)
        )
      );

      const hasFreeFilter = sellingTypeFilters.has('free');
      const hasConditionFilters = conditionFilters.size > 0;
      const hasSellingTypeFilters = sellingTypeFilters.size > 0;

      // Apply all filters in a single pass
      filteredProducts = filteredProducts.filter(product => {
        // Check condition filters if needed
        if (hasConditionFilters) {
          const productCondition = product.productage || '';
          if (!conditionFilters.has(productCondition)) {
            return false;
          }
        }

        // Check selling type filters if needed
        if (hasSellingTypeFilters) {
          const productSellingType = product.sellingtype || '';
          const isFree = parseFloat(product.price) === 0;

          // Special case for free items
          if (hasFreeFilter && isFree) {
            return true;
          }

          // Regular selling type checks
          if ((sellingTypeFilters.has('rent') && productSellingType === 'rent') ||
              (sellingTypeFilters.has('sell') && productSellingType === 'sell')) {
            return true;
          }

          // If we have selling type filters but nothing matched, filter out
          return false;
        }

        return true;
      });
    }

    // Then apply sorting
    if (state.selectedSortOption !== 'default') {
      operationsApplied = true;

      // Use more efficient sorting algorithms
      switch (state.selectedSortOption) {
        case 'price_low_high':
          // Convert price to number once for better performance
          filteredProducts.sort((a, b) => {
            const priceA = parseFloat(a.price || '0');
            const priceB = parseFloat(b.price || '0');
            return priceA - priceB;
          });
          break;
        case 'price_high_low':
          filteredProducts.sort((a, b) => {
            const priceA = parseFloat(a.price || '0');
            const priceB = parseFloat(b.price || '0');
            return priceB - priceA;
          });
          break;
        case 'newest':
          // Cache date objects for better performance
          const getDateValue = (product: any) => {
            if (!product.postingdate) {return 0;}
            // Use a simple timestamp number instead of Date object for better performance
            return new Date(product.postingdate).getTime();
          };

          // Create a cache of computed values
          const dateCache = new Map<string, number>();

          // Populate cache
          filteredProducts.forEach(product => {
            dateCache.set(product.id, getDateValue(product));
          });

          // Sort using cache
          filteredProducts.sort((a, b) => {
            const dateA = dateCache.get(a.id) || 0;
            const dateB = dateCache.get(b.id) || 0;
            return dateB - dateA;
          });
          break;
        case 'popularity':
          // For now, we'll just use ID as a proxy for popularity
          filteredProducts.sort((a, b) => a.id.localeCompare(b.id));
          break;
        default:
          break;
      }
    }

    // Only update the state if changes were made
    if (operationsApplied) {
      // Update the products state with filtered and sorted products
      set({ products: filteredProducts });
    }
  },

  // Clear all filters and sorting
  clearFilters: () => {
    console.log('[CategoryStore] Clearing all filters and restoring original products');

    set(state => {
      // Create a deep copy of the original products to avoid reference issues
      const restoredProducts = [...state.productsOriginal];

      return {
        selectedFilters: [],
        selectedSortOption: 'default',
        searchQuery: '',
        // Restore the original product list exactly as it was
        products: restoredProducts,
        // Close any open dropdowns
        isSortDropdownVisible: false,
        isFilterDropdownVisible: false,
      };
    });
  },

  // Load more products (pagination)
  loadMore: async () => {
    const state = get();

    // Skip if already loading, no more data, or refreshing
    if (state.loadingMoreData || !state.hasMoreData || state.loading || state.refreshing) {
      return;
    }

    const nextPage = state.currentPage + 1;
    const { currentCategory } = state;

    console.log(`[CategoryStore] Loading more products for ${currentCategory.name}, page ${nextPage}`);

    // Call loadCategoryProducts with the next page number and append=true
    await state.loadCategoryProducts(
      currentCategory.name,
      currentCategory.id,
      currentCategory.university,
      currentCategory.city,
      nextPage,
      true // Append to existing products
    );
  },
}));

export default useCategoryStore;

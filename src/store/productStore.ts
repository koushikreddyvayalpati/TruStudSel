import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../types/product';
import { 
  getFeaturedProducts,
  getNewArrivals,
  getProductsByUniversity, 
  getProductsByCity 
} from '../api/products';
import { createFilterMaps } from '../utils/filterUtils';

// Cache constants
export const FEATURED_PRODUCTS_CACHE_KEY = 'featured_products_cache_';
export const NEW_ARRIVALS_CACHE_KEY = 'new_arrivals_cache_';
export const UNIVERSITY_PRODUCTS_CACHE_KEY = 'university_products_cache_';
export const CITY_PRODUCTS_CACHE_KEY = 'city_products_cache_';
export const FORCE_REFRESH_KEY = 'force_refresh_flag';
export const PRODUCTS_CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes

// Define the store state type
interface ProductState {
  // Product data
  featuredProducts: Product[];
  featuredProductsOriginal: Product[];
  newArrivalsProducts: Product[];
  newArrivalsProductsOriginal: Product[];
  universityProducts: Product[];
  universityProductsOriginal: Product[];
  cityProducts: Product[];
  cityProductsOriginal: Product[];
  
  // Filter maps for optimization
  featuredFilterMaps: any;
  newArrivalsFilterMaps: any;
  universityFilterMaps: any;
  cityFilterMaps: any;
  
  // Loading states
  loadingFeatured: boolean;
  loadingNewArrivals: boolean;
  loadingUniversity: boolean;
  loadingCity: boolean;
  
  // Total counts
  totalFeaturedCount: number;
  totalUniversityCount: number;
  
  // Refresh state
  isRefreshing: boolean;
  refreshCount: number;
  shouldForceRefresh: boolean;
  error: string | null;
  
  // Helper functions
  cacheProducts: (key: string, products: any, university?: string, city?: string) => Promise<void>;
  getCachedProducts: (key: string, university?: string, city?: string) => Promise<any>;
  
  // Actions
  setError: (error: string | null) => void;
  incrementRefreshCount: () => number;
  setForceRefresh: (value: boolean) => Promise<void>;
  clearProductCaches: (university?: string, city?: string) => Promise<void>;
  
  // Product loading functions
  loadFeaturedProducts: (university: string, city: string) => Promise<void>;
  loadNewArrivals: (university: string) => Promise<void>;
  loadUniversityProducts: (university: string) => Promise<void>;
  loadCityProducts: (city: string) => Promise<void>;
  
  // Refresh handling
  handleRefresh: (university: string, city: string) => Promise<void>;
}

// Create the store
const useProductStore = create<ProductState>((set, get) => ({
  // Initial state
  featuredProducts: [],
  featuredProductsOriginal: [],
  newArrivalsProducts: [],
  newArrivalsProductsOriginal: [],
  universityProducts: [],
  universityProductsOriginal: [],
  cityProducts: [],
  cityProductsOriginal: [],
  
  featuredFilterMaps: {},
  newArrivalsFilterMaps: {},
  universityFilterMaps: {},
  cityFilterMaps: {},
  
  loadingFeatured: false,
  loadingNewArrivals: false,
  loadingUniversity: false,
  loadingCity: false,
  
  totalFeaturedCount: 0,
  totalUniversityCount: 0,
  
  isRefreshing: false,
  refreshCount: 0,
  shouldForceRefresh: false,
  error: null,
  
  // Action to set error
  setError: (error) => set({ error }),
  
  // Helper function to cache products
  cacheProducts: async (key: string, products: any, university?: string, city?: string) => {
    try {
      const cacheKey = `${key}${university ? '_' + university : ''}${city ? '_' + city : ''}`;
      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({
          data: products,
          timestamp: Date.now()
        })
      );
      
      console.log(`[ProductStore] Cached ${products.length} products with key: ${cacheKey}`);
      
      // Reset force refresh flag after caching if needed
      if (get().shouldForceRefresh) {
        await get().setForceRefresh(false);
      }
    } catch (error) {
      console.error(`[ProductStore] Error caching products:`, error);
    }
  },
  
  // Helper function to get products from cache
  getCachedProducts: async (key: string, university?: string, city?: string) => {
    try {
      // Skip cache if force refresh is enabled
      if (get().shouldForceRefresh) {
        console.log(`[ProductStore] Force refresh is enabled, skipping cache for ${key}`);
        return null;
      }
      
      // Double-check AsyncStorage as well
      const forceRefreshValue = await AsyncStorage.getItem(FORCE_REFRESH_KEY);
      if (forceRefreshValue === 'true') {
        console.log(`[ProductStore] Force refresh flag found in storage, skipping cache for ${key}`);
        // Update local state to match storage
        if (!get().shouldForceRefresh) {
          await get().setForceRefresh(true);
        }
        return null;
      }
      
      const cacheKey = `${key}${university ? '_' + university : ''}${city ? '_' + city : ''}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        const isExpired = Date.now() - timestamp > PRODUCTS_CACHE_EXPIRY_TIME;
        
        if (!isExpired) {
          console.log(`[ProductStore] Using cached products from: ${cacheKey}`);
          return data;
        } else {
          console.log(`[ProductStore] Cache expired for: ${cacheKey}`);
        }
      }
      return null;
    } catch (error) {
      console.error(`[ProductStore] Error retrieving cached products:`, error);
      return null;
    }
  },
  
  // Clear all product caches
  clearProductCaches: async (university?: string, city?: string) => {
    try {
      console.log('[ProductStore] Clearing product cache keys');
      
      const keysToRemove = [];
      
      if (university && city) {
        keysToRemove.push(`${FEATURED_PRODUCTS_CACHE_KEY}${university}_${city}`);
      }
      
      if (university) {
        keysToRemove.push(`${NEW_ARRIVALS_CACHE_KEY}${university}`);
        keysToRemove.push(`${UNIVERSITY_PRODUCTS_CACHE_KEY}${university}`);
      }
      
      if (city) {
        keysToRemove.push(`${CITY_PRODUCTS_CACHE_KEY}${city}`);
      }
      
      await Promise.all(keysToRemove.map(key => AsyncStorage.removeItem(key)));
      
      console.log(`[ProductStore] Cleared ${keysToRemove.length} cache keys`);
    } catch (error) {
      console.error('[ProductStore] Error clearing product caches:', error);
    }
  },
  
  // Increment refresh count and possibly trigger force refresh
  incrementRefreshCount: () => {
    const newCount = get().refreshCount + 1;
    console.log(`[ProductStore] Refresh counter incremented to ${newCount}`);
    
    set({ refreshCount: newCount });
    
    // After 2 refreshes, enable force refresh
    if (newCount >= 2) {
      console.log('[ProductStore] Setting force refresh to bypass cache');
      get().setForceRefresh(true);
    }
    
    return newCount;
  },
  
  // Set force refresh state
  setForceRefresh: async (value) => {
    set({ shouldForceRefresh: value });
    
    // Update AsyncStorage
    await AsyncStorage.setItem(FORCE_REFRESH_KEY, value ? 'true' : 'false');
    
    // Reset refresh count if turning off force refresh
    if (!value) {
      set({ refreshCount: 0 });
    }
    
    console.log(`[ProductStore] Force refresh set to ${value}`);
  },
  
  // Load featured products
  loadFeaturedProducts: async (university, city) => {
    try {
      set({ loadingFeatured: true });
      
      // Check if force refresh is enabled
      if (get().shouldForceRefresh) {
        console.log(`[ProductStore] Force refresh enabled, fetching fresh featured products`);
        const response = await getFeaturedProducts(university || '', city || '');
        
        // Handle the response based on its format
        if (Array.isArray(response)) {
          // Legacy format - response is an array of products
          set({
            featuredProducts: response,
            featuredProductsOriginal: response,
            totalFeaturedCount: response.length,
            featuredFilterMaps: response.length > 0 ? createFilterMaps(response) : {}
          });
          
          // Cache the result
          await get().cacheProducts(FEATURED_PRODUCTS_CACHE_KEY, response, university, city);
        } else if (response && response.products) {
          // New paginated response format
          set({
            featuredProducts: response.products,
            featuredProductsOriginal: response.products,
            totalFeaturedCount: response.totalItems || response.products.length,
            featuredFilterMaps: response.products.length > 0 ? createFilterMaps(response.products) : {}
          });
          
          // Cache the result
          await get().cacheProducts(FEATURED_PRODUCTS_CACHE_KEY, response.products, university, city);
        } else {
          console.error('Unexpected response format from getFeaturedProducts:', response);
          set({
            featuredProducts: [],
            featuredProductsOriginal: [],
            totalFeaturedCount: 0
          });
        }
        
        set({ loadingFeatured: false });
        return;
      }
      
      // Try to get from cache first
      const cachedProducts = await get().getCachedProducts(FEATURED_PRODUCTS_CACHE_KEY, university, city);
      
      if (cachedProducts) {
        // Use cached data
        set({
          featuredProducts: cachedProducts,
          featuredProductsOriginal: cachedProducts,
          totalFeaturedCount: cachedProducts.length,
          featuredFilterMaps: cachedProducts.length > 0 ? createFilterMaps(cachedProducts) : {},
          loadingFeatured: false
        });
      } else {
        // Fetch from API
        console.log(`[ProductStore] Fetching fresh featured products: univ=${university}, city=${city}`);
        const response = await getFeaturedProducts(university || '', city || '');
        
        // Handle the response based on its format
        if (Array.isArray(response)) {
          // Legacy format - response is an array of products
          set({
            featuredProducts: response,
            featuredProductsOriginal: response,
            totalFeaturedCount: response.length,
            featuredFilterMaps: response.length > 0 ? createFilterMaps(response) : {}
          });
          
          // Cache the result
          await get().cacheProducts(FEATURED_PRODUCTS_CACHE_KEY, response, university, city);
        } else if (response && response.products) {
          // New paginated response format
          set({
            featuredProducts: response.products,
            featuredProductsOriginal: response.products,
            totalFeaturedCount: response.totalItems || response.products.length,
            featuredFilterMaps: response.products.length > 0 ? createFilterMaps(response.products) : {}
          });
          
          // Cache the result
          await get().cacheProducts(FEATURED_PRODUCTS_CACHE_KEY, response.products, university, city);
        } else {
          console.error('Unexpected response format from getFeaturedProducts:', response);
          set({
            featuredProducts: [],
            featuredProductsOriginal: [],
            totalFeaturedCount: 0
          });
        }
        
        set({ loadingFeatured: false });
      }
    } catch (err) {
      console.error('Error loading featured products:', err);
      set({
        error: 'Failed to load featured products',
        loadingFeatured: false
      });
    }
  },
  
  // Load new arrivals
  loadNewArrivals: async (university) => {
    try {
      set({ loadingNewArrivals: true });
      
      // Check if force refresh is enabled
      if (get().shouldForceRefresh) {
        console.log(`[ProductStore] Force refresh enabled, fetching fresh new arrivals`);
        const response = await getNewArrivals(university || '');
        
        // Handle the response based on its format
        if (Array.isArray(response)) {
          // Legacy format - response is an array of products
          set({
            newArrivalsProducts: response,
            newArrivalsProductsOriginal: response,
            newArrivalsFilterMaps: response.length > 0 ? createFilterMaps(response) : {}
          });
          
          // Cache the result
          await get().cacheProducts(NEW_ARRIVALS_CACHE_KEY, response, university);
        } else if (response && response.products) {
          // New paginated response format
          set({
            newArrivalsProducts: response.products,
            newArrivalsProductsOriginal: response.products,
            newArrivalsFilterMaps: response.products.length > 0 ? createFilterMaps(response.products) : {}
          });
          
          // Cache the result
          await get().cacheProducts(NEW_ARRIVALS_CACHE_KEY, response.products, university);
        } else {
          console.error('Unexpected response format from getNewArrivals:', response);
          set({
            newArrivalsProducts: [],
            newArrivalsProductsOriginal: []
          });
        }
        
        set({ loadingNewArrivals: false });
        return;
      }
      
      // Try to get from cache first
      const cachedProducts = await get().getCachedProducts(NEW_ARRIVALS_CACHE_KEY, university);
      
      if (cachedProducts) {
        // Use cached data
        set({
          newArrivalsProducts: cachedProducts,
          newArrivalsProductsOriginal: cachedProducts,
          newArrivalsFilterMaps: cachedProducts.length > 0 ? createFilterMaps(cachedProducts) : {},
          loadingNewArrivals: false
        });
      } else {
        // Fetch from API
        console.log(`[ProductStore] Fetching fresh new arrivals: univ=${university}`);
        const response = await getNewArrivals(university || '');
        
        // Handle the response based on its format
        if (Array.isArray(response)) {
          // Legacy format - response is an array of products
          set({
            newArrivalsProducts: response,
            newArrivalsProductsOriginal: response,
            newArrivalsFilterMaps: response.length > 0 ? createFilterMaps(response) : {}
          });
          
          // Cache the result
          await get().cacheProducts(NEW_ARRIVALS_CACHE_KEY, response, university);
        } else if (response && response.products) {
          // New paginated response format
          set({
            newArrivalsProducts: response.products,
            newArrivalsProductsOriginal: response.products,
            newArrivalsFilterMaps: response.products.length > 0 ? createFilterMaps(response.products) : {}
          });
          
          // Cache the result
          await get().cacheProducts(NEW_ARRIVALS_CACHE_KEY, response.products, university);
        } else {
          console.error('Unexpected response format from getNewArrivals:', response);
          set({
            newArrivalsProducts: [],
            newArrivalsProductsOriginal: []
          });
        }
        
        set({ loadingNewArrivals: false });
      }
    } catch (err) {
      console.error('Error loading new arrivals:', err);
      set({
        error: 'Failed to load new arrivals',
        loadingNewArrivals: false
      });
    }
  },
  
  // Load university products
  loadUniversityProducts: async (university) => {
    if (!university) return;
    
    try {
      set({ loadingUniversity: true });
      
      // Check if force refresh is enabled
      if (get().shouldForceRefresh) {
        console.log(`[ProductStore] Force refresh enabled, fetching fresh university products`);
        const response = await getProductsByUniversity(university);
        
        set({
          universityProducts: response.products || [],
          universityProductsOriginal: response.products || [],
          totalUniversityCount: response.products?.length || 0,
          universityFilterMaps: response.products && response.products.length > 0 
            ? createFilterMaps(response.products) 
            : {}
        });
        
        // Cache the result
        await get().cacheProducts(UNIVERSITY_PRODUCTS_CACHE_KEY, response, university);
        
        set({ loadingUniversity: false });
        return;
      }
      
      // Try to get from cache first
      const cachedProducts = await get().getCachedProducts(UNIVERSITY_PRODUCTS_CACHE_KEY, university);
      
      if (cachedProducts) {
        // Use cached data
        set({
          universityProducts: cachedProducts.products || [],
          universityProductsOriginal: cachedProducts.products || [],
          totalUniversityCount: cachedProducts.products?.length || 0,
          universityFilterMaps: cachedProducts.products && cachedProducts.products.length > 0 
            ? createFilterMaps(cachedProducts.products) 
            : {},
          loadingUniversity: false
        });
      } else {
        // Fetch from API
        console.log(`[ProductStore] Fetching fresh university products: univ=${university}`);
        const response = await getProductsByUniversity(university);
        
        set({
          universityProducts: response.products || [],
          universityProductsOriginal: response.products || [],
          totalUniversityCount: response.products?.length || 0,
          universityFilterMaps: response.products && response.products.length > 0 
            ? createFilterMaps(response.products) 
            : {}
        });
        
        // Cache the result
        await get().cacheProducts(UNIVERSITY_PRODUCTS_CACHE_KEY, response, university);
        
        set({ loadingUniversity: false });
      }
    } catch (err) {
      console.error('Error loading university products:', err);
      set({
        error: 'Failed to load university products',
        loadingUniversity: false
      });
    }
  },
  
  // Load city products
  loadCityProducts: async (city) => {
    if (!city) return;
    
    try {
      set({ loadingCity: true });
      
      // Check if force refresh is enabled
      if (get().shouldForceRefresh) {
        console.log(`[ProductStore] Force refresh enabled, fetching fresh city products`);
        const response = await getProductsByCity(city);
        
        set({
          cityProducts: response.products || [],
          cityProductsOriginal: response.products || [],
          cityFilterMaps: response.products && response.products.length > 0 
            ? createFilterMaps(response.products) 
            : {}
        });
        
        // Cache the result
        await get().cacheProducts(CITY_PRODUCTS_CACHE_KEY, response, undefined, city);
        
        set({ loadingCity: false });
        return;
      }
      
      // Try to get from cache first
      const cachedProducts = await get().getCachedProducts(CITY_PRODUCTS_CACHE_KEY, undefined, city);
      
      if (cachedProducts) {
        // Use cached data
        set({
          cityProducts: cachedProducts.products || [],
          cityProductsOriginal: cachedProducts.products || [],
          cityFilterMaps: cachedProducts.products && cachedProducts.products.length > 0 
            ? createFilterMaps(cachedProducts.products) 
            : {},
          loadingCity: false
        });
      } else {
        // Fetch from API
        console.log(`[ProductStore] Fetching fresh city products: city=${city}`);
        const response = await getProductsByCity(city);
        
        set({
          cityProducts: response.products || [],
          cityProductsOriginal: response.products || [],
          cityFilterMaps: response.products && response.products.length > 0 
            ? createFilterMaps(response.products) 
            : {}
        });
        
        // Cache the result
        await get().cacheProducts(CITY_PRODUCTS_CACHE_KEY, response, undefined, city);
        
        set({ loadingCity: false });
      }
    } catch (err) {
      console.error('Error loading city products:', err);
      set({
        error: 'Failed to load city products',
        loadingCity: false
      });
    }
  },
  
  // Handle refresh action
  handleRefresh: async (university, city) => {
    set({ isRefreshing: true, error: null });
    
    // Increment refresh counter
    const newCount = get().incrementRefreshCount();
    
    // If we're force refreshing, clear cache first
    if (newCount >= 2) {
      await get().clearProductCaches(university, city);
      
      // Small delay to ensure state updates
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    try {
      // Log refresh status
      console.log(`[ProductStore] Starting refresh with forceRefresh=${get().shouldForceRefresh}`);
      
      // Load all product types
      await Promise.all([
        get().loadFeaturedProducts(university, city),
        get().loadNewArrivals(university),
        get().loadUniversityProducts(university),
        get().loadCityProducts(city)
      ]);
    } catch (err) {
      console.error('Error refreshing products:', err);
      set({ error: 'Failed to refresh products' });
    } finally {
      set({ isRefreshing: false });
    }
  }
}));

export default useProductStore; 
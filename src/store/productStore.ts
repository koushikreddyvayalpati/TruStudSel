import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../types/product';
import {
  getFeaturedProducts,
  getNewArrivals,
  getProductsByUniversity,
  getProductsByCity,
} from '../api/products';
import { createFilterMaps } from '../utils/filterUtils';
import { API_URL } from '../api/config';

// Cache constants
export const FEATURED_PRODUCTS_CACHE_KEY = 'featured_products_cache_';
export const NEW_ARRIVALS_CACHE_KEY = 'new_arrivals_cache_';
export const UNIVERSITY_PRODUCTS_CACHE_KEY = 'university_products_cache_';
export const CITY_PRODUCTS_CACHE_KEY = 'city_products_cache_';
export const INTERESTED_CATEGORY_CACHE_KEY = 'interested_category_cache_';
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
  interestedCategoryProducts: Product[];

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
  loadingInterestedCategory: boolean;

  // Selected category
  selectedInterestCategory: string | null;

  // Total counts
  totalFeaturedCount: number;
  totalUniversityCount: number;

  // Refresh state
  isRefreshing: boolean;
  refreshCount: number;
  shouldForceRefresh: boolean;
  error: string | null;
  interestedCategoryError: string | null;

  // Helper functions
  cacheProducts: (key: string, products: any, university?: string, city?: string, category?: string) => Promise<void>;
  getCachedProducts: (key: string, university?: string, city?: string, category?: string) => Promise<any>;

  // Actions
  setError: (error: string | null) => void;
  setInterestedCategoryError: (error: string | null) => void;
  incrementRefreshCount: () => number;
  setForceRefresh: (value: boolean) => Promise<void>;
  clearProductCaches: (university?: string, city?: string) => Promise<void>;
  setSelectedInterestCategory: (category: string | null) => void;

  // Product loading functions
  loadFeaturedProducts: (university: string, city: string) => Promise<void>;
  loadNewArrivals: (university: string) => Promise<void>;
  loadUniversityProducts: (university: string) => Promise<void>;
  loadCityProducts: (city: string) => Promise<void>;
  loadInterestedCategoryProducts: (category: string, university?: string, city?: string) => Promise<void>;

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
  interestedCategoryProducts: [],

  featuredFilterMaps: {},
  newArrivalsFilterMaps: {},
  universityFilterMaps: {},
  cityFilterMaps: {},

  loadingFeatured: false,
  loadingNewArrivals: false,
  loadingUniversity: false,
  loadingCity: false,
  loadingInterestedCategory: false,

  selectedInterestCategory: null,

  totalFeaturedCount: 0,
  totalUniversityCount: 0,

  isRefreshing: false,
  refreshCount: 0,
  shouldForceRefresh: false,
  error: null,
  interestedCategoryError: null,

  // Action to set error
  setError: (error) => set({ error }),

  // Action to set interested category error
  setInterestedCategoryError: (error) => set({ interestedCategoryError: error }),

  // Action to set selected interest category
  setSelectedInterestCategory: (category) => set({ selectedInterestCategory: category }),

  // Helper function to cache products
  cacheProducts: async (key: string, products: any, university?: string, city?: string, category?: string) => {
    try {
      // Build cache key with optional parameters
      let cacheKey = key;
      if (university) {cacheKey += `_${university}`;}
      if (city) {cacheKey += `_${city}`;}
      if (category) {cacheKey += `_${category}`;}

      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({
          data: products,
          timestamp: Date.now(),
        })
      );

      // console.log(`[ProductStore] Cached ${products.length} products with key: ${cacheKey}`);

      // Reset force refresh flag after caching if needed
      if (get().shouldForceRefresh) {
        await get().setForceRefresh(false);
      }
    } catch (error) {
      console.error('[ProductStore] Error caching products:', error);
    }
  },

  // Helper function to get products from cache
  getCachedProducts: async (key: string, university?: string, city?: string, category?: string) => {
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

      // Build cache key with optional parameters
      let cacheKey = key;
      if (university) {cacheKey += `_${university}`;}
      if (city) {cacheKey += `_${city}`;}
      if (category) {cacheKey += `_${category}`;}

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
      console.error('[ProductStore] Error retrieving cached products:', error);
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

      // Also clear interested category cache if applicable
      const selectedCategory = get().selectedInterestCategory;
      if (selectedCategory) {
        keysToRemove.push(`${INTERESTED_CATEGORY_CACHE_KEY}${selectedCategory}`);
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
        console.log('[ProductStore] Force refresh enabled, fetching fresh featured products');
        const response = await getFeaturedProducts(university || '', city || '');

        // Handle the response based on its format
        if (Array.isArray(response)) {
          // Legacy format - response is an array of products
          set({
            featuredProducts: response,
            featuredProductsOriginal: response,
            totalFeaturedCount: response.length,
            featuredFilterMaps: response.length > 0 ? createFilterMaps(response) : {},
          });

          // Cache the result
          await get().cacheProducts(FEATURED_PRODUCTS_CACHE_KEY, response, university, city);
        } else if (response && response.products) {
          // New paginated response format
          set({
            featuredProducts: response.products,
            featuredProductsOriginal: response.products,
            totalFeaturedCount: response.totalItems || response.products.length,
            featuredFilterMaps: response.products.length > 0 ? createFilterMaps(response.products) : {},
          });

          // Cache the result
          await get().cacheProducts(FEATURED_PRODUCTS_CACHE_KEY, response.products, university, city);
        } else {
          console.error('Unexpected response format from getFeaturedProducts:', response);
          set({
            featuredProducts: [],
            featuredProductsOriginal: [],
            totalFeaturedCount: 0,
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
          loadingFeatured: false,
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
            featuredFilterMaps: response.length > 0 ? createFilterMaps(response) : {},
          });

          // Cache the result
          await get().cacheProducts(FEATURED_PRODUCTS_CACHE_KEY, response, university, city);
        } else if (response && response.products) {
          // New paginated response format
          set({
            featuredProducts: response.products,
            featuredProductsOriginal: response.products,
            totalFeaturedCount: response.totalItems || response.products.length,
            featuredFilterMaps: response.products.length > 0 ? createFilterMaps(response.products) : {},
          });

          // Cache the result
          await get().cacheProducts(FEATURED_PRODUCTS_CACHE_KEY, response.products, university, city);
        } else {
          console.error('Unexpected response format from getFeaturedProducts:', response);
          set({
            featuredProducts: [],
            featuredProductsOriginal: [],
            totalFeaturedCount: 0,
          });
        }

        set({ loadingFeatured: false });
      }
    } catch (err) {
      console.error('Error loading featured products:', err);
      set({
        error: 'Failed to load featured products',
        loadingFeatured: false,
      });
    }
  },

  // Load new arrivals
  loadNewArrivals: async (university) => {
    try {
      set({ loadingNewArrivals: true });

      // Check if force refresh is enabled
      if (get().shouldForceRefresh) {
        console.log('[ProductStore] Force refresh enabled, fetching fresh new arrivals');
        const response = await getNewArrivals(university || '');

        // Handle the response based on its format
        if (Array.isArray(response)) {
          // Legacy format - response is an array of products
          set({
            newArrivalsProducts: response,
            newArrivalsProductsOriginal: response,
            newArrivalsFilterMaps: response.length > 0 ? createFilterMaps(response) : {},
          });

          // Cache the result
          await get().cacheProducts(NEW_ARRIVALS_CACHE_KEY, response, university);
        } else if (response && response.products) {
          // New paginated response format
          set({
            newArrivalsProducts: response.products,
            newArrivalsProductsOriginal: response.products,
            newArrivalsFilterMaps: response.products.length > 0 ? createFilterMaps(response.products) : {},
          });

          // Cache the result
          await get().cacheProducts(NEW_ARRIVALS_CACHE_KEY, response.products, university);
        } else {
          console.error('Unexpected response format from getNewArrivals:', response);
          set({
            newArrivalsProducts: [],
            newArrivalsProductsOriginal: [],
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
          loadingNewArrivals: false,
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
            newArrivalsFilterMaps: response.length > 0 ? createFilterMaps(response) : {},
          });

          // Cache the result
          await get().cacheProducts(NEW_ARRIVALS_CACHE_KEY, response, university);
        } else if (response && response.products) {
          // New paginated response format
          set({
            newArrivalsProducts: response.products,
            newArrivalsProductsOriginal: response.products,
            newArrivalsFilterMaps: response.products.length > 0 ? createFilterMaps(response.products) : {},
          });

          // Cache the result
          await get().cacheProducts(NEW_ARRIVALS_CACHE_KEY, response.products, university);
        } else {
          console.error('Unexpected response format from getNewArrivals:', response);
          set({
            newArrivalsProducts: [],
            newArrivalsProductsOriginal: [],
          });
        }

        set({ loadingNewArrivals: false });
      }
    } catch (err) {
      console.error('Error loading new arrivals:', err);
      set({
        error: 'Failed to load new arrivals',
        loadingNewArrivals: false,
      });
    }
  },

  // Load university products
  loadUniversityProducts: async (university) => {
    if (!university) {return;}

    try {
      set({ loadingUniversity: true });

      // Check if force refresh is enabled
      if (get().shouldForceRefresh) {
        console.log('[ProductStore] Force refresh enabled, fetching fresh university products');
        const response = await getProductsByUniversity(university);

        set({
          universityProducts: response.products || [],
          universityProductsOriginal: response.products || [],
          totalUniversityCount: response.products?.length || 0,
          universityFilterMaps: response.products && response.products.length > 0
            ? createFilterMaps(response.products)
            : {},
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
          loadingUniversity: false,
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
            : {},
        });

        // Cache the result
        await get().cacheProducts(UNIVERSITY_PRODUCTS_CACHE_KEY, response, university);

        set({ loadingUniversity: false });
      }
    } catch (err) {
      console.error('Error loading university products:', err);
      set({
        error: 'Failed to load university products',
        loadingUniversity: false,
      });
    }
  },

  // Load city products
  loadCityProducts: async (city) => {
    if (!city) {return;}

    try {
      set({ loadingCity: true });

      // Check if force refresh is enabled
      if (get().shouldForceRefresh) {
        console.log('[ProductStore] Force refresh enabled, fetching fresh city products');
        const response = await getProductsByCity(city);

        set({
          cityProducts: response.products || [],
          cityProductsOriginal: response.products || [],
          cityFilterMaps: response.products && response.products.length > 0
            ? createFilterMaps(response.products)
            : {},
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
          loadingCity: false,
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
            : {},
        });

        // Cache the result
        await get().cacheProducts(CITY_PRODUCTS_CACHE_KEY, response, undefined, city);

        set({ loadingCity: false });
      }
    } catch (err) {
      console.error('Error loading city products:', err);
      set({
        error: 'Failed to load city products',
        loadingCity: false,
      });
    }
  },

  // Load interested category products
  loadInterestedCategoryProducts: async (category, university, city) => {
    try {
      if (!category) {
        console.log('[ProductStore] No interested category selected, skipping fetch');
        return;
      }

      set({ loadingInterestedCategory: true, interestedCategoryError: null });
      console.log(`[ProductStore] STARTING TO LOAD products for interested category: "${category}"`);
      console.log(`[ProductStore] User university: "${university}", User city: "${city}"`);

      // Try to get from cache first
      const cachedProducts = await get().getCachedProducts(INTERESTED_CATEGORY_CACHE_KEY, university, city, category);

      if (cachedProducts) {
        set({
          interestedCategoryProducts: cachedProducts,
          loadingInterestedCategory: false,
        });
        return;
      }

      // Create query params including university if available
      const queryParams = new URLSearchParams();
      if (university) {
        queryParams.append('university', university);
      }
      if (city) {
        queryParams.append('city', city);
      }

      // Add pagination params
      queryParams.append('page', '0');
      queryParams.append('size', '10');

      const url = `${API_URL}/api/products/category/${encodeURIComponent(category.toLowerCase())}/paginated?${queryParams}`;
      // console.log(`[ProductStore] Making API call to: ${url}`);

      // Make API call
      const response = await fetch(url, { method: 'GET' });

      console.log(`[ProductStore] API response status: ${response.status}`);

      if (!response.ok) {
        throw new Error(`Error fetching products: ${response.status}`);
      }

      const responseText = await response.text();
      // console.log(`[ProductStore] Raw API response (first 100 chars): ${responseText.substring(0, 100)}`);

      // Parse the JSON manually
      const data = JSON.parse(responseText);
      console.log(`[ProductStore] API response parsed successfully, data type: ${typeof data}`);

      // Process the products
      let productsList: Product[] = [];
      if (data && Array.isArray(data.products)) {
        console.log(`[ProductStore] Found products array in response with ${data.products.length} items`);
        productsList = data.products;
      } else if (Array.isArray(data)) {
        console.log(`[ProductStore] Response is a direct array with ${data.length} items`);
        productsList = data;
      } else {
        console.log('[ProductStore] Unexpected response format:', JSON.stringify(data).substring(0, 200));
      }

      console.log(`[ProductStore] Final processed products list contains ${productsList.length} items`);

      // Process image URLs if needed
      productsList = productsList.map(product => {
        // Handle image URLs
        if (product.primaryImage && !product.primaryImage.startsWith('http')) {
          // console.log(`[ProductStore] Processing image URL: ${product.primaryImage}`);
          product.primaryImage = `https://trustudsel-products.s3.amazonaws.com/${product.primaryImage}`;
        }
        return product;
      });

      // Set the products in state
      set({ interestedCategoryProducts: productsList });

      // Cache the products
      await get().cacheProducts(INTERESTED_CATEGORY_CACHE_KEY, productsList, university, city, category);

      console.log(`[ProductStore] State updated with ${productsList.length} interested category products`);
    } catch (error) {
      console.error('[ProductStore] ERROR loading interested category products:', error);
      set({ interestedCategoryError: 'Failed to load products for your interests' });
    } finally {
      set({ loadingInterestedCategory: false });
      console.log('[ProductStore] Finished loading attempt for interested category products');
    }
  },

  // Handle refresh action
  handleRefresh: async (university, city) => {
    try {
      set({ isRefreshing: true });

      // Increment the refresh count
      const refreshCount = get().incrementRefreshCount();
      console.log(`[ProductStore] Handling refresh #${refreshCount} for university: ${university}, city: ${city}`);

      // Clear caches if this is a force refresh
      if (get().shouldForceRefresh) {
        await get().clearProductCaches(university, city);
      }

      // Get selectedInterestCategory to avoid using it directly in the array
      const selectedCategory = get().selectedInterestCategory;

      // Load all types of products in parallel
      await Promise.all([
        get().loadFeaturedProducts(university, city),
        university ? get().loadNewArrivals(university) : Promise.resolve(),
        university ? get().loadUniversityProducts(university) : Promise.resolve(),
        city ? get().loadCityProducts(city) : Promise.resolve(),
        // Add interested category products refresh
        selectedCategory ? get().loadInterestedCategoryProducts(selectedCategory, university, city) : Promise.resolve(),
      ]);

      console.log('[ProductStore] Refresh completed successfully');
    } catch (error) {
      console.error('[ProductStore] Error during refresh:', error);
      set({ error: 'Failed to refresh products' });
    } finally {
      set({ isRefreshing: false });
    }
  },
}));

export default useProductStore;

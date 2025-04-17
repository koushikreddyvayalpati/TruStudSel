import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchUserProfileById } from '../api/users';
import { fetchUserProducts, Product } from '../api/products';

// Cache constants
const USER_PROFILE_CACHE_KEY = 'user_profile_cache_';
const USER_PRODUCTS_CACHE_KEY = 'user_products_cache_';
const CACHE_EXPIRY_TIME = 15 * 60 * 1000; // 15 minutes
const PRODUCTS_CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes
const MIN_API_REQUEST_INTERVAL = 30 * 1000; // 30 seconds

// In-memory caches to avoid excessive AsyncStorage reads
const profileCache = new Map();
const productsCache = new Map();
const API_REQUEST_TIMESTAMPS = new Map();
const PRODUCTS_API_REQUEST_TIMESTAMPS = new Map();

// A simple map to cache numeric IDs for product UUIDs
const uuidToNumericIdCache = new Map<string, number>();

// Convert API product to Post interface
const convertProductToPost = (product: Product): Post => {
  // Check if we already have a cached numeric ID for this UUID
  const cachedId = uuidToNumericIdCache.get(product.id);
  if (cachedId !== undefined) {
    return {
      id: cachedId,
      image: product.primaryImage || product.imageUrls?.[0] || 'https://via.placeholder.com/150',
      caption: product.name,
      price: `$${product.price}`,
      condition: product.productage || 'Unknown',
      status: product.status === 'sold' ? 'sold' : (product.status === 'archived' ? 'archived' : 'available'),
      originalId: product.id // Store the original UUID for reference
    };
  }
  
  // Generate a consistent numeric ID by hashing the UUID
  // This ensures the same UUID always maps to the same numeric ID
  const generateNumericId = (uuid: string): number => {
    if (!uuid || uuid.length === 0) return 0;
    
    // Faster hash function that still provides good distribution
    let hash = 0;
    const len = Math.min(uuid.length, 20); // Only use first 20 chars for faster hashing
    
    for (let i = 0; i < len; i++) {
      hash = ((hash << 5) - hash) + uuid.charCodeAt(i);
      hash |= 0; // Convert to 32-bit integer
    }
    
    // Make sure the hash is positive and within a reasonable range
    return Math.abs(hash) % 1000000;
  };
  
  // Generate and cache the numeric ID
  const numericId = generateNumericId(product.id);
  uuidToNumericIdCache.set(product.id, numericId);
  
  // Only log in development mode
  if (__DEV__ && uuidToNumericIdCache.size % 10 === 0) {
    console.log(`[ProfileStore] ID cache size: ${uuidToNumericIdCache.size}`);
  }
  
  return {
    id: numericId,
    image: product.primaryImage || product.imageUrls?.[0] || 'https://via.placeholder.com/150',
    caption: product.name,
    price: `$${product.price}`,
    condition: product.productage || 'Unknown',
    status: product.status === 'sold' ? 'sold' : (product.status === 'archived' ? 'archived' : 'available'),
    originalId: product.id // Store the original UUID for reference
  };
};

// Post item type
interface Post {
  id: number;
  image: string;
  caption: string;
  price?: string;
  condition?: string;
  status?: 'available' | 'sold' | 'archived';
  originalId: string;
}

// Define tab types
type TabType = 'inMarket' | 'archive' | 'sold';

// Add this interface for backend user data
interface BackendUserData {
  email: string;
  city?: string;
  mobile?: string;
  name?: string;
  productsCategoriesIntrested?: string[] | null;
  productsListed?: string;
  productssold?: string;
  productswishlist?: string[];
  state?: string;
  university?: string;
  userphoto?: string;
  zipcode?: string;
  userRating?: string;
}

interface ProcessedUserData {
  name: string;
  email: string;
  university: string;
  photo: string | null;
  soldProducts: string;
  totalProducts: number;
  userRating: string;
}

// Process the user data for display
const processUserData = (user: any, backendUser: BackendUserData | null): ProcessedUserData => {
  return {
    name: backendUser?.name || user?.name || user?.displayName || 'User',
    email: backendUser?.email || user?.email || '',
    university: backendUser?.university || user?.university || 'Unknown University',
    photo: backendUser?.userphoto || user?.photoURL || null,
    soldProducts: backendUser?.productssold || '0',
    totalProducts: parseInt(backendUser?.productsListed || '0', 10) || 0,
    userRating: backendUser?.userRating || '0'
  };
};

// Define the store state
interface ProfileState {
  // User data
  backendUserData: BackendUserData | null;
  processedUserData: ProcessedUserData | null;
  
  // Products data
  products: Post[];
  productsMap: Map<number, Product>;
  filteredProducts: Post[];
  
  // UI state
  activeTab: TabType;
  
  // Loading states
  isLoading: boolean;
  isLoadingProducts: boolean;
  isRefreshing: boolean;
  error: string | null;
  productsError: string | null;
  
  // Refresh count
  refreshCount: number;
  
  // Actions
  setActiveTab: (tab: TabType) => void;
  incrementRefreshCount: () => void;
  
  // Data fetching
  fetchUserProfile: (email: string, forceRefresh?: boolean) => Promise<void>;
  fetchUserProducts: (email: string, forceRefresh?: boolean) => Promise<void>;
  refreshAllData: (email: string) => Promise<void>;
  
  // Filtered products
  getFilteredProducts: () => Post[];
  
  // Product modification
  removeProduct: (productId: string) => void;
}

// Create the Zustand store
const useProfileStore = create<ProfileState>((set, get) => ({
  // Initial state
  backendUserData: null,
  processedUserData: null,
  products: [],
  productsMap: new Map(),
  filteredProducts: [],
  activeTab: 'inMarket',
  isLoading: false,
  isLoadingProducts: false,
  isRefreshing: false,
  error: null,
  productsError: null,
  refreshCount: 0,
  
  // Set active tab
  setActiveTab: (tab) => {
    set({ activeTab: tab });
    // Update filtered products when tab changes
    const state = get();
    const filtered = state.getFilteredProducts();
    set({ filteredProducts: filtered });
  },
  
  // Increment refresh count
  incrementRefreshCount: () => {
    set(state => ({ refreshCount: state.refreshCount + 1 }));
  },
  
  // Get filtered products based on active tab
  getFilteredProducts: () => {
    const { products, activeTab } = get();
    
    if (activeTab === 'inMarket') {
      return products.filter(post => post.status === 'available');
    } else if (activeTab === 'archive') {
      return products.filter(post => post.status === 'archived');
    } else if (activeTab === 'sold') {
      return products.filter(post => post.status === 'sold');
    }
    
    return products;
  },
  
  // Fetch user profile
  fetchUserProfile: async (email, forceRefresh = false) => {
    if (!email) {
      set({ error: 'No email provided' });
      return;
    }
    
    set(state => ({
      isLoading: !state.isRefreshing,
      error: null
    }));
    
    try {
      // Check if we should force refresh
      const shouldForceRefresh = forceRefresh || get().refreshCount >= 2;
      
      // Try to get from cache first if not forcing refresh
      if (!shouldForceRefresh && !get().isRefreshing) {
        // Check in-memory cache
        if (profileCache.has(email)) {
          const { data, timestamp } = profileCache.get(email);
          const isExpired = Date.now() - timestamp > CACHE_EXPIRY_TIME;
          
          if (!isExpired) {
            console.log('[ProfileStore] Using in-memory cached profile data');
            
            // Process the user data
            const processedData = processUserData(null, data);
            
            set({
              backendUserData: data,
              processedUserData: processedData,
              isLoading: false
            });
            
            return;
          }
        }
        
        // Try AsyncStorage cache
        const cacheKey = `${USER_PROFILE_CACHE_KEY}${email}`;
        const cachedData = await AsyncStorage.getItem(cacheKey);
        
        if (cachedData) {
          const { data, timestamp } = JSON.parse(cachedData);
          const isExpired = Date.now() - timestamp > CACHE_EXPIRY_TIME;
          
          if (!isExpired) {
            console.log('[ProfileStore] Using AsyncStorage cached profile data');
            
            // Update in-memory cache
            profileCache.set(email, { data, timestamp });
            
            // Process the user data
            const processedData = processUserData(null, data);
            
            set({
              backendUserData: data,
              processedUserData: processedData,
              isLoading: false
            });
            
            return;
          }
        }
      }
      
      // Fetch from API
      console.log('[ProfileStore] Fetching user profile from API');
      const userData = await fetchUserProfileById(email);
      
      // Cache the data
      const timestamp = Date.now();
      profileCache.set(email, { data: userData, timestamp });
      const cacheKey = `${USER_PROFILE_CACHE_KEY}${email}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify({ 
        data: userData, 
        timestamp 
      }));
      
      // Process the user data
      const processedData = processUserData(null, userData);
      
      // Update store state
      set({
        backendUserData: userData,
        processedUserData: processedData,
        isLoading: false
      });
      
      // Reset refresh count on successful fetch
      if (forceRefresh) {
        set({ refreshCount: 0 });
      }
    } catch (error: any) {
      console.error('[ProfileStore] Error fetching user profile:', error);
      set({
        error: error?.message || 'Failed to load user profile',
        isLoading: false
      });
    }
  },
  
  // Fetch user products
  fetchUserProducts: async (email, forceRefresh = false) => {
    if (!email) {
      set({ productsError: 'No email provided' });
      return;
    }
    
    set(state => ({
      isLoadingProducts: !state.isRefreshing,
      productsError: null
    }));
    
    try {
      // Check if we should force refresh
      const shouldForceRefresh = forceRefresh || get().refreshCount >= 2;
      console.log(`[ProfileStore] Fetching user products - forceRefresh: ${forceRefresh}, shouldForceRefresh: ${shouldForceRefresh}`);
      
      // Rate limiting check
      const currentTime = Date.now();
      const lastRequestTime = PRODUCTS_API_REQUEST_TIMESTAMPS.get(email);
      
      // Try to get from cache first if not forcing refresh
      if (!shouldForceRefresh && !get().isRefreshing) {
        if (lastRequestTime && (currentTime - lastRequestTime < MIN_API_REQUEST_INTERVAL)) {
          console.log(`[ProfileStore] Rate limiting products API request for ${email}`);
          
          if (productsCache.has(email)) {
            const { data } = productsCache.get(email);
            
            // Create a map of products
            const newProductsMap = new Map<number, Product>();
            
            // Convert API products to Post format
            const formattedPosts = data.map((product: Product) => {
              const post = convertProductToPost(product);
              newProductsMap.set(post.id, product);
              return post;
            });
            
            const filteredPosts = get().activeTab === 'inMarket'
              ? formattedPosts.filter(post => post.status === 'available')
              : formattedPosts.filter(post => post.status === 'archived');
            
            set({
              products: formattedPosts,
              productsMap: newProductsMap,
              filteredProducts: filteredPosts,
              isLoadingProducts: false
            });
            
            return;
          }
        }
        
        // Try to get from cache first if not forcing refresh
        if (!shouldForceRefresh && !get().isRefreshing) {
          // Check in-memory cache
          if (productsCache.has(email)) {
            const { data, timestamp } = productsCache.get(email);
            const isExpired = Date.now() - timestamp > PRODUCTS_CACHE_EXPIRY_TIME;
            
            if (!isExpired) {
              console.log('[ProfileStore] Using in-memory cached products data');
              
              // Create a map of products
              const newProductsMap = new Map<number, Product>();
              
              // Convert API products to Post format
              const formattedPosts = data.map((product: Product) => {
                const post = convertProductToPost(product);
                newProductsMap.set(post.id, product);
                return post;
              });
              
              const filteredPosts = get().activeTab === 'inMarket'
                ? formattedPosts.filter(post => post.status === 'available')
                : formattedPosts.filter(post => post.status === 'archived');
              
              set({
                products: formattedPosts,
                productsMap: newProductsMap,
                filteredProducts: filteredPosts,
                isLoadingProducts: false
              });
              
              return;
            }
          }
          
          // Try AsyncStorage cache
          const cacheKey = `${USER_PRODUCTS_CACHE_KEY}${email}`;
          const cachedData = await AsyncStorage.getItem(cacheKey);
          
          if (cachedData) {
            const { data, timestamp } = JSON.parse(cachedData);
            const isExpired = Date.now() - timestamp > PRODUCTS_CACHE_EXPIRY_TIME;
            
            if (!isExpired) {
              console.log('[ProfileStore] Using AsyncStorage cached products data');
              
              // Update in-memory cache
              productsCache.set(email, { data, timestamp });
              
              // Create a map of products
              const newProductsMap = new Map<number, Product>();
              
              // Convert API products to Post format
              const formattedPosts = data.map((product: Product) => {
                const post = convertProductToPost(product);
                newProductsMap.set(post.id, product);
                return post;
              });
              
              const filteredPosts = get().activeTab === 'inMarket'
                ? formattedPosts.filter(post => post.status === 'available')
                : formattedPosts.filter(post => post.status === 'archived');
              
              set({
                products: formattedPosts,
                productsMap: newProductsMap,
                filteredProducts: filteredPosts,
                isLoadingProducts: false
              });
              
              return;
            }
          }
        }
      }
      
      // Fetch from API
      console.log('[ProfileStore] Fetching user products from API');
      PRODUCTS_API_REQUEST_TIMESTAMPS.set(email, currentTime);
      
      const productsData = await fetchUserProducts(email);
      console.log(`[ProfileStore] Fetched ${productsData.length} products from API`);
      
      // Log product statuses for debugging
      const statusCounts = productsData.reduce((acc: Record<string, number>, product: Product) => {
        const status = product.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      console.log(`[ProfileStore] Product status counts:`, statusCounts);
      
      // Cache the data
      const timestamp = Date.now();
      productsCache.set(email, { data: productsData, timestamp });
      const cacheKey = `${USER_PRODUCTS_CACHE_KEY}${email}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify({ 
        data: productsData, 
        timestamp 
      }));
      
      // Create a map of products
      const newProductsMap = new Map<number, Product>();
      
      // Convert API products to Post format
      const formattedPosts = productsData.map((product: Product) => {
        const post = convertProductToPost(product);
        newProductsMap.set(post.id, product);
        return post;
      });
      
      // Get filtered products based on active tab
      const activeTab = get().activeTab;
      let filteredPosts;
      
      if (activeTab === 'inMarket') {
        filteredPosts = formattedPosts.filter(post => post.status === 'available');
        console.log(`[ProfileStore] Filtered ${filteredPosts.length} available products`);
      } else if (activeTab === 'archive') {
        filteredPosts = formattedPosts.filter(post => post.status === 'archived');
        console.log(`[ProfileStore] Filtered ${filteredPosts.length} archived products`);
      } else if (activeTab === 'sold') {
        filteredPosts = formattedPosts.filter(post => post.status === 'sold');
        console.log(`[ProfileStore] Filtered ${filteredPosts.length} sold products`);
      } else {
        filteredPosts = formattedPosts;
      }
      
      // Update store state
      set({
        products: formattedPosts,
        productsMap: newProductsMap,
        filteredProducts: filteredPosts,
        isLoadingProducts: false
      });
      
      // Reset refresh count on successful fetch
      if (forceRefresh) {
        set({ refreshCount: 0 });
      }
    } catch (error: any) {
      console.error('[ProfileStore] Error fetching user products:', error);
      set({
        productsError: error?.message || 'Failed to load user products',
        isLoadingProducts: false
      });
    }
  },
  
  // Refresh all data
  refreshAllData: async (email) => {
    set({ isRefreshing: true });
    
    try {
      // Increment refresh count
      get().incrementRefreshCount();
      
      // Fetch all data in parallel
      await Promise.all([
        get().fetchUserProfile(email, true),
        get().fetchUserProducts(email, true)
      ]);
    } catch (error) {
      console.error('[ProfileStore] Error refreshing data:', error);
    } finally {
      set({ isRefreshing: false });
    }
  },
  
  // Add method to remove product from store
  removeProduct: (productId: string) => {
    console.log(`[ProfileStore] Removing product with ID: ${productId}`);
    
    try {
      // Find the numeric ID from the original ID
      let numericIdToRemove: number | undefined;
      let foundProduct = false;
      
      // Try to find product by direct ID match (UUID)
      for (const [numericId, product] of get().productsMap.entries()) {
        if (product.id === productId) {
          numericIdToRemove = numericId;
          foundProduct = true;
          console.log(`[ProfileStore] Found product with numericId: ${numericId}`);
          break;
        }
      }
      
      // If we couldn't find by direct ID match, try with the originalId field
      if (!foundProduct) {
        for (const post of get().products) {
          if (post.originalId === productId) {
            numericIdToRemove = post.id;
            foundProduct = true;
            console.log(`[ProfileStore] Found product with originalId match: ${post.id}`);
            break;
          }
        }
      }
      
      // Create a list of IDs to remove (we might have multiple views of the same product)
      const idsToRemove: number[] = [];
      
      if (numericIdToRemove !== undefined) {
        idsToRemove.push(numericIdToRemove);
      }
      
      // Search for any product with this originalId and add to removal list
      get().products.forEach(post => {
        if (post.originalId === productId && !idsToRemove.includes(post.id)) {
          idsToRemove.push(post.id);
        }
      });
      
      if (idsToRemove.length === 0) {
        console.warn(`[ProfileStore] Could not find any IDs for product ${productId}, will attempt full refresh`);
      } else {
        console.log(`[ProfileStore] Found ${idsToRemove.length} IDs to remove:`, idsToRemove);
      }
      
      // Create a new map without the removed product
      const newProductsMap = new Map(get().productsMap);
      idsToRemove.forEach(id => {
        newProductsMap.delete(id);
        console.log(`[ProfileStore] Removed ID ${id} from productsMap`);
      });
      
      // Filter out the product from products array - using ID or UUID
      const newProducts = get().products.filter((post: Post) => {
        // Remove if ID is in our list to remove
        if (idsToRemove.includes(post.id)) {
          return false;
        }
        
        // Also remove if originalId matches
        if (post.originalId === productId) {
          return false;
        }
        
        return true;
      });
      
      console.log(`[ProfileStore] Filtered products from ${get().products.length} to ${newProducts.length}`);
      
      // Update filtered products based on active tab
      const activeTab = get().activeTab;
      
      const newFilteredProducts = newProducts.filter((post: Post) => {
        if (activeTab === 'inMarket') {
          return post.status === 'available';
        } else if (activeTab === 'archive') {
          return post.status === 'archived';
        } else if (activeTab === 'sold') {
          return post.status === 'sold';
        }
        return true;
      });
      
      console.log(`[ProfileStore] Filtered ${newFilteredProducts.length} products for tab ${activeTab}`);
      
      // Update state
      set({
        products: newProducts,
        productsMap: newProductsMap,
        filteredProducts: newFilteredProducts
      });
      
      // Also update the cache to avoid reappearing products
      if (productsCache.size > 0) {
        for (const [email, cache] of productsCache.entries()) {
          if (cache && cache.data) {
            const originalLength = cache.data.length;
            const cacheData = cache.data.filter((product: Product) => product.id !== productId);
            
            if (cacheData.length !== originalLength) {
              console.log(`[ProfileStore] Updated cache for email ${email}: removed ${originalLength - cacheData.length} products`);
              productsCache.set(email, { 
                data: cacheData, 
                timestamp: Date.now() 
              });
            }
          }
        }
      }
      
    } catch (error) {
      console.error('[ProfileStore] Error in removeProduct:', error);
    }
  }
}));

export default useProfileStore; 
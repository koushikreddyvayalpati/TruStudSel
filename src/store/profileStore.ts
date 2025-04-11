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

// Convert API product to Post interface
const convertProductToPost = (product: Product): Post => ({
  id: parseInt(product.id) || Math.floor(Math.random() * 1000),
  image: product.primaryImage || product.imageUrls?.[0] || 'https://via.placeholder.com/150',
  caption: product.name,
  price: `$${product.price}`,
  condition: product.productage || 'Unknown',
  status: product.status === 'SOLD' ? 'sold' : (product.status === 'ARCHIVED' ? 'archived' : 'active')
});

// Post item type
interface Post {
  id: number;
  image: string;
  caption: string;
  price?: string;
  condition?: string;
  status?: 'active' | 'sold' | 'archived';
}

// Define tab types
type TabType = 'inMarket' | 'archive';

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
}

interface ProcessedUserData {
  name: string;
  email: string;
  university: string;
  photo: string | null;
  soldProducts: string;
  totalProducts: number;
}

// Process the user data for display
const processUserData = (user: any, backendUser: BackendUserData | null): ProcessedUserData => {
  return {
    name: backendUser?.name || user?.name || user?.displayName || 'User',
    email: backendUser?.email || user?.email || '',
    university: backendUser?.university || user?.university || 'Unknown University',
    photo: backendUser?.userphoto || user?.photoURL || null,
    soldProducts: backendUser?.productssold || '0',
    totalProducts: parseInt(backendUser?.productsListed || '0', 10) || 0
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
      return products.filter(post => post.status === 'active');
    } else if (activeTab === 'archive') {
      return products.filter(post => post.status === 'sold' || post.status === 'archived');
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
              ? formattedPosts.filter(post => post.status === 'active')
              : formattedPosts.filter(post => post.status === 'sold' || post.status === 'archived');
            
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
              ? formattedPosts.filter(post => post.status === 'active')
              : formattedPosts.filter(post => post.status === 'sold' || post.status === 'archived');
            
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
      
      // Check rate limiting
      const lastRequestTime = PRODUCTS_API_REQUEST_TIMESTAMPS.get(email);
      const now = Date.now();
      
      if (!shouldForceRefresh && lastRequestTime && (now - lastRequestTime < MIN_API_REQUEST_INTERVAL) && !get().isRefreshing) {
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
            ? formattedPosts.filter(post => post.status === 'active')
            : formattedPosts.filter(post => post.status === 'sold' || post.status === 'archived');
          
          set({
            products: formattedPosts,
            productsMap: newProductsMap,
            filteredProducts: filteredPosts,
            isLoadingProducts: false
          });
          
          return;
        }
      }
      
      // Fetch from API
      console.log('[ProfileStore] Fetching user products from API');
      PRODUCTS_API_REQUEST_TIMESTAMPS.set(email, now);
      
      const productsData = await fetchUserProducts(email);
      
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
      
      const filteredPosts = get().activeTab === 'inMarket'
        ? formattedPosts.filter(post => post.status === 'active')
        : formattedPosts.filter(post => post.status === 'sold' || post.status === 'archived');
      
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
  }
}));

export default useProfileStore; 
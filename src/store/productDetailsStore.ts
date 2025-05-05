import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Share, Alert, Platform } from 'react-native';
import { getProductById, getProductsByCategory } from '../api/products';
import { API_URL } from '../api/config';
// Add a base URL constant for API calls
const API_BASE_URL = API_URL;

// Extended Product type that includes seller information
interface ExtendedProduct {
  id: number | string;
  name: string;
  price: string;
  image: string;
  description?: string;
  condition?: string;
  type?: string;
  images?: string[];
  postingdate?: string;
  seller?: {
    name: string;
    rating?: number;
    id?: string;
    contactNumber?: string;
    email?: string;
  };
  sellerName?: string;
  email?: string;
  category?: string;
  sellingtype?: string;
  city?: string;
  primaryImage?: string;
  additionalImages?: string[];
  allImages?: string[];
  imageUrls?: string[];
  productage?: string;
  subcategory?: string;
}

// Base product type
interface BaseProduct {
  id: number | string;
  name: string;
  price: string;
  image: string;
  description?: string;
  condition?: string;
  type?: string;
  images?: string[];
  postingdate?: string;
  sellerName?: string;
  email?: string;
  sellingtype?: string;
  city?: string;
}

// Sample product data (fallback if no product is provided)
const sampleProduct: ExtendedProduct = {
  id: 1,
  name: 'Product Name',
  price: '$24.99',
  image: 'https://via.placeholder.com/300',
  condition: 'New',
  type: 'Electronics',
  description: 'This is a sample product description. It includes details about the product, its features, and its benefits.',
  images: [
    'https://via.placeholder.com/300',
    'https://via.placeholder.com/300/FF0000',
    'https://via.placeholder.com/300/00FF00',
  ],
  postingdate: new Date().toISOString(),
  seller: {
    id: 'seller1',
    name: 'Koushik Reddy',
    rating: 4.8,
    contactNumber: '+1234567890',
    email: 'seller@example.com',
  },
  sellerName: 'Koushik Reddy',
  email: 'seller@example.com',
  city: 'Sample City',
};

interface ProductDetailsState {
  // Product data
  productData: ExtendedProduct | null;
  product: ExtendedProduct;
  productImages: string[];
  similarProductsData: BaseProduct[];

  // UI states
  isLoading: boolean;
  loadingSimilarProducts: boolean;
  isInWishlist: boolean;
  expandDescription: boolean;
  zoomVisible: boolean;
  selectedImage: string;
  lastCacheRefresh: number;

  // User info
  userEmail: string | null;

  // Actions
  setProductData: (data: ExtendedProduct | null) => void;
  setProductFromRoute: (productFromRoute: BaseProduct | null, productId?: string | number) => void;
  fetchProductData: (productId: string | number) => Promise<void>;
  fetchSimilarProducts: () => Promise<void>;
  handleShare: () => Promise<void>;
  handleImagePress: (index: number) => void;
  closeZoom: () => void;
  toggleExpandDescription: () => void;

  // Wishlist functions
  checkWishlistStatus: () => Promise<void>;
  refreshWishlistCache: () => Promise<void>;
  toggleWishlist: () => Promise<void>;
  setUserEmail: (email: string | null) => void;

  // Helper functions
  getProductImages: (product: ExtendedProduct) => string[];
  checkProductInWishlist: (productId: string | number) => Promise<boolean>;
  addProductToWishlist: (productId: string | number) => Promise<boolean>;
  removeProductFromWishlist: (productId: string | number) => Promise<boolean>;
  isCurrentUserSeller: () => boolean;
  isGuestMode: () => boolean;
}

const useProductDetailsStore = create<ProductDetailsState>((set, get) => ({
  // Initial state
  productData: null,
  product: sampleProduct,
  productImages: [sampleProduct.image || 'https://via.placeholder.com/300'],
  similarProductsData: [],

  isLoading: false,
  loadingSimilarProducts: false,
  isInWishlist: false,
  expandDescription: false,
  zoomVisible: false,
  selectedImage: '',
  lastCacheRefresh: 0,

  userEmail: null,

  // Set product data
  setProductData: (data) => {
    set({ productData: data });
    if (data) {
      // Update product and images when product data changes
      const product = { ...data };
      set({
        product,
        productImages: get().getProductImages(product),
      });

      // Fetch similar products when product changes
      get().fetchSimilarProducts();
    }
  },

  // Set product from route params
  setProductFromRoute: (productFromRoute, productId) => {
    // Always set initial product data if available to show something immediately
    if (productFromRoute) {
      set({
        product: productFromRoute as ExtendedProduct,
        productImages: get().getProductImages(productFromRoute as ExtendedProduct),
      });
    }
    
    // Check if we're in guest mode (no userEmail)
    const { userEmail } = get();
    const isGuestMode = !userEmail;
    
    // Only fetch from API if not in guest mode and we have a productId
    if (productId && !isGuestMode) {
      console.log(`[ProductDetailsStore] Fetching fresh product data for ID: ${productId}`);
      get().fetchProductData(productId);
    } else if (isGuestMode && productId) {
      console.log(`[ProductDetailsStore] In guest mode - skipping API call for product ID: ${productId}`);
      // Just use the product from route or a simple placeholder in guest mode
      if (!productFromRoute) {
        // Create a minimal placeholder if we don't have route product data
        const placeholderProduct: ExtendedProduct = {
          id: productId,
          name: "Product Preview",
          price: "0",
          description: "Sign in to view full product details.",
          image: "https://via.placeholder.com/300?text=Sign+In+To+View",
          images: ["https://via.placeholder.com/300?text=Sign+In+To+View"],
        };
        set({
          product: placeholderProduct,
          productImages: get().getProductImages(placeholderProduct),
        });
      }
    } else if (productFromRoute && !productId) {
      // Only rely on route product data if no productId is provided
      // and fetch similar products only if not in guest mode
      if (!isGuestMode) {
        get().fetchSimilarProducts();
      }
    }
  },

  // Get formatted product images - Make this more robust
  getProductImages: (product) => {
    const defaultImage = 'https://via.placeholder.com/300';
    let potentialImages: (string | undefined)[] = [];

    // Check various potential fields in order of preference
    if (product.allImages && Array.isArray(product.allImages) && product.allImages.length > 0) {
      potentialImages = product.allImages;
    } else if (product.imageUrls && Array.isArray(product.imageUrls) && product.imageUrls.length > 0) {
      potentialImages = product.imageUrls;
    } else if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      potentialImages = product.images;
    } else if (product.primaryImage) {
      // Combine primary and additional if they exist
      potentialImages = [product.primaryImage, ...(product.additionalImages || [])];
    } else if (product.image) {
      // Fallback to single legacy image field
      potentialImages = [product.image];
    }

    // Ensure all items are valid non-empty strings, falling back to default
    const validImages = potentialImages
      .map(img => (typeof img === 'string' && img.trim() !== '') ? img.trim() : undefined)
      .filter((img): img is string => img !== undefined);

    // If no valid images were found, return the default image
    return validImages.length > 0 ? validImages : [defaultImage];
  },

  // Fetch product data by ID
  fetchProductData: async (productId) => {
    try {
      set({ isLoading: true });

      // Skip API call if in guest mode
      if (get().isGuestMode()) {
        console.log('[ProductDetailsStore] Skipping API call in guest mode');
        set({ isLoading: false });
        return;
      }

      // Convert productId to string to match the getProductById parameter type
      const productIdString = productId.toString();
      const fetchedProduct = await getProductById(productIdString);

      set({
        productData: fetchedProduct as unknown as ExtendedProduct,
        isLoading: false,
      });

      // Update product and images when product data changes
      if (fetchedProduct) {
        const product = fetchedProduct as unknown as ExtendedProduct;
        set({
          product,
          productImages: get().getProductImages(product),
        });

        // Fetch similar products when product changes
        get().fetchSimilarProducts();
      }
    } catch (error) {
      console.error('[ProductDetailsStore] Error fetching product:', error);
      set({ isLoading: false });
      Alert.alert('Error', 'Unable to load product details. Please try again.');
    }
  },

  // Check if we're in guest mode (no userEmail)
  isGuestMode: () => {
    const { userEmail } = get();
    return !userEmail;
  },

  // Fetch similar products
  fetchSimilarProducts: async () => {
    // Skip entirely in guest mode
    if (get().isGuestMode()) {
      console.log('[ProductDetailsStore] Skipping similar products in guest mode');
      set({ loadingSimilarProducts: false, similarProductsData: [] });
      return;
    }
    
    const { product, userEmail } = get();

    // Only fetch if we have a valid product with category
    if (!product) {return;}
    
    // Skip API call if no user email (guest mode) - extra safety check
    if (!userEmail) {
      console.log('[ProductDetailsStore] Skipping similar products API call in guest mode');
      set({ loadingSimilarProducts: false, similarProductsData: [] });
      return;
    }

    // Try to get category from the product
    const category = product.category || product.type;

    if (!category) {
      console.log('[ProductDetailsStore] No category found for similar products');
      return;
    }

    try {
      set({ loadingSimilarProducts: true });

      // Convert category to lowercase for consistency with API
      const normalizedCategory = category.toLowerCase();
      console.log(`[ProductDetailsStore] Fetching similar products for category: ${normalizedCategory}`);

      // Fetch products by category
      const result = await getProductsByCategory(normalizedCategory, {
        // Limit results to 10 similar products
        size: 10,
      });

      // Filter out the current product from results
      let similarItems = Array.isArray(result.products)
        ? result.products
        : [];

      // Remove the current product from similar items
      similarItems = similarItems.filter(item => item.id !== product.id);

      // Limit to 5 similar products max
      similarItems = similarItems.slice(0, 5);

      console.log(`[ProductDetailsStore] Found ${similarItems.length} similar products`);

      // Convert API Product type to BaseProduct type for state
      const convertedSimilarItems: BaseProduct[] = similarItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price || '0.00',
        image: item.image || item.primaryImage || 'https://via.placeholder.com/150',
        description: item.description,
        condition: item.condition || 'Used',
        type: item.type,
        sellerName: item.sellerName || (item.seller?.name || ''),
        email: item.email || '',
        images: item.images || item.imageUrls || [],
        sellingtype: item.sellingtype || '',
        postingdate: item.postingdate || '',
        city: item.city || '',
      }));

      // Update state with similar products
      set({
        similarProductsData: convertedSimilarItems,
        loadingSimilarProducts: false,
      });
    } catch (error) {
      console.error('[ProductDetailsStore] Error fetching similar products:', error);
      // Keep the array empty on error
      set({
        similarProductsData: [],
        loadingSimilarProducts: false,
      });
    }
  },

  // Handle image press for zoom
  handleImagePress: (index) => {
    const { productImages } = get();
    if (index >= 0 && index < productImages.length) {
      set({
        selectedImage: productImages[index],
        zoomVisible: true,
      });
    }
  },

  // Close zoom modal
  closeZoom: () => set({ zoomVisible: false }),

  // Toggle description expansion
  toggleExpandDescription: () => set(state => ({ expandDescription: !state.expandDescription })),

  // Handle product sharing
  handleShare: async () => {
    const { product } = get();
    if (!product || !product.id) {
      console.error('Cannot share, product data is missing.');
      Alert.alert('Error', 'Could not share product details.');
      return;
    }

    // --- Construct the deep link --- 
    // Ensure product.id is a string
    const productId = product.id.toString(); 
    const deepLinkUrl = `trustudsel://product/${productId}`;

    // --- Construct the share content ---
    const title = `TruStudSel Product: ${product.name}`;
    
    // Create a message that's platform-friendly
    const message = `Check out this product on TruStudSel: ${product.name} for $${product.price}`;
    
    try {
      console.log(`[ProductDetailsStore] Sharing product: ${productId} with URL: ${deepLinkUrl}`);
      
      // Use different sharing options depending on platform
      if (Platform.OS === 'ios') {
        // On iOS, use url parameter for proper link handling
        await Share.share({
          message, 
          url: deepLinkUrl,
          title
        });
      } else {
        // On Android, include the URL in the message
        // Some Android share targets will make this clickable
        await Share.share({
          message: `${message}\n\n${deepLinkUrl}`,
          title
        });
      }
    } catch (error: any) {
      console.error('Error sharing product:', error);
      // Provide more specific error feedback if possible
      if (error.message !== 'User dismissed UI') {
        Alert.alert('Sharing Failed', 'Could not share the product link at this time.');
      }
    }
  },

  // Set user email
  setUserEmail: (email) => set({ userEmail: email }),

  // Check if product is in wishlist
  checkProductInWishlist: async (productId: string | number) => {
    try {
      const { userEmail } = get();
      if (!userEmail) {
        console.error('[ProductDetailsStore] No user email found for wishlist check');
        return false;
      }

      try {
        // Import Auth from Amplify inside the function to avoid circular dependencies
        const { Auth } = require('aws-amplify');

        // Get the current authenticated session to retrieve the JWT token
        const currentSession = await Auth.currentSession();
        const token = currentSession.getIdToken().getJwtToken();

        const productIdString = productId.toString();
        const apiUrl = `${API_BASE_URL}/api/wishlist/${userEmail}/check/${productIdString}`;
        // console.log(`[ProductDetailsStore] Checking wishlist status: ${apiUrl}`);

        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          console.error(`[ProductDetailsStore] API error: ${response.status}`);
          return false;
        }

        try {
          const text = await response.text();
          const data = text ? JSON.parse(text) : {};
          return !!data.inWishlist;
        } catch (parseError) {
          console.error('[ProductDetailsStore] Error parsing response:', parseError);
          return false;
        }
      } catch (fetchError) {
        console.error('[ProductDetailsStore] Fetch error:', fetchError);
        return false;
      }
    } catch (error) {
      console.error('[ProductDetailsStore] Error in checkProductInWishlist:', error);
      return false;
    }
  },

  // Add product to wishlist
  addProductToWishlist: async (productId: string | number) => {
    try {
      const { userEmail } = get();
      if (!userEmail) {
        console.error('[ProductDetailsStore] No user email found for wishlist add');
        return false;
      }

      // Import Auth from Amplify inside the function to avoid circular dependencies
      const { Auth } = require('aws-amplify');

      // Get the current authenticated session to retrieve the JWT token
      const currentSession = await Auth.currentSession();
      const token = currentSession.getIdToken().getJwtToken();

      const productIdString = productId.toString();
      // console.log(`[ProductDetailsStore] Adding product ${productIdString} to wishlist for user ${userEmail}`);
      const apiUrl = `${API_BASE_URL}/api/wishlist/${userEmail}?productId=${productIdString}`;

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.status >= 200 && response.status < 300) {
          console.log('[ProductDetailsStore] Successfully added product to wishlist');
          return true;
        } else {
          console.error(`[ProductDetailsStore] Failed API response: ${response.status}`);
          return false;
        }
      } catch (fetchError) {
        console.error('[ProductDetailsStore] Fetch error:', fetchError);
        return false;
      }
    } catch (error) {
      console.error('[ProductDetailsStore] Error in addProductToWishlist:', error);
      return false;
    }
  },

  // Remove product from wishlist
  removeProductFromWishlist: async (productId: string | number) => {
    try {
      const { userEmail } = get();
      if (!userEmail) {
        console.error('[ProductDetailsStore] No user email found for wishlist remove');
        return false;
      }

      try {
        // Import Auth from Amplify inside the function to avoid circular dependencies
        const { Auth } = require('aws-amplify');

        // Get the current authenticated session to retrieve the JWT token
        const currentSession = await Auth.currentSession();
        const token = currentSession.getIdToken().getJwtToken();

        const productIdString = productId.toString();
        const apiUrl = `${API_BASE_URL}/api/wishlist/${userEmail}/${productIdString}`;
        console.log(`[ProductDetailsStore] Removing product from wishlist: ${apiUrl}`);

        const response = await fetch(apiUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.status >= 200 && response.status < 300) {
          console.log('[ProductDetailsStore] Successfully removed product from wishlist');
          return true;
        } else {
          console.error(`[ProductDetailsStore] Failed API response: ${response.status}`);
          return false;
        }
      } catch (fetchError) {
        console.error('[ProductDetailsStore] Fetch error:', fetchError);
        return false;
      }
    } catch (error) {
      console.error('[ProductDetailsStore] Error in removeProductFromWishlist:', error);
      return false;
    }
  },

  // Refresh wishlist cache
  refreshWishlistCache: async () => {
    const { userEmail, product, checkProductInWishlist } = get();
    if (!userEmail || !product?.id) {return;}

    try {
      const productId = product.id.toString();
      const cacheKey = `wishlist_${userEmail}_${productId}`;
      const cacheTimeKey = `${cacheKey}_timestamp`;

      // Check when the cache was last refreshed
      const lastRefreshStr = await AsyncStorage.getItem(cacheTimeKey);
      const lastRefresh = lastRefreshStr ? parseInt(lastRefreshStr, 10) : 0;
      const now = Date.now();

      // If cache is older than 1 hour (3600000 ms), refresh it
      if (now - lastRefresh > 3600000) {
        console.log('[ProductDetailsStore] Cache is stale, refreshing from API');

        try {
          const inWishlist = await checkProductInWishlist(productId);

          // Only update cache if API call succeeded
          await AsyncStorage.setItem(cacheKey, inWishlist.toString());
          await AsyncStorage.setItem(cacheTimeKey, now.toString());
          set({
            lastCacheRefresh: now,
            isInWishlist: inWishlist,
          });
        } catch (apiError) {
          console.error('[ProductDetailsStore] Error refreshing from API:', apiError);
          // On error, extend cache lifetime but don't change status
          await AsyncStorage.setItem(cacheTimeKey, now.toString());
          set({ lastCacheRefresh: now });
        }
      } else {
        set({ lastCacheRefresh: lastRefresh });
      }
    } catch (error) {
      console.error('[ProductDetailsStore] Error refreshing wishlist cache:', error);
    }
  },

  // Check wishlist status
  checkWishlistStatus: async () => {
    const { product, userEmail, checkProductInWishlist, refreshWishlistCache } = get();
    if (!product || !product.id || !userEmail) {return;}

    const productId = product.id.toString();
    const cacheKey = `wishlist_${userEmail}_${productId}`;
    const cacheTimeKey = `${cacheKey}_timestamp`;

    try {
      // Try to get cached wishlist status first
      let cachedStatus = null;
      try {
        cachedStatus = await AsyncStorage.getItem(cacheKey);
      } catch (cacheError) {
        console.warn('[ProductDetailsStore] Error reading from cache:', cacheError);
      }

      if (cachedStatus !== null) {
        console.log('[ProductDetailsStore] Using cached wishlist status');
        set({ isInWishlist: cachedStatus === 'true' });

        // Check when the cache was last refreshed
        try {
          const lastRefreshStr = await AsyncStorage.getItem(cacheTimeKey);
          const lastRefresh = lastRefreshStr ? parseInt(lastRefreshStr, 10) : 0;
          set({ lastCacheRefresh: lastRefresh });

          // If not refreshed recently, schedule a background refresh
          const now = Date.now();
          if (now - lastRefresh > 3600000) {
            refreshWishlistCache();
          }
        } catch (timeError) {
          console.warn('[ProductDetailsStore] Error reading timestamp:', timeError);
        }

        return;
      }

      // If no cache or cache read failed, check with API
      console.log('[ProductDetailsStore] No cached status, checking with API');
      const inWishlist = await checkProductInWishlist(productId);
      set({ isInWishlist: inWishlist });

      // Cache the result with timestamp
      try {
        const now = Date.now();
        await AsyncStorage.setItem(cacheKey, inWishlist.toString());
        await AsyncStorage.setItem(cacheTimeKey, now.toString());
        set({ lastCacheRefresh: now });
      } catch (saveError) {
        console.warn('[ProductDetailsStore] Error saving to cache:', saveError);
      }
    } catch (error) {
      console.error('[ProductDetailsStore] Error checking wishlist status:', error);
      // Default to not in wishlist on error
      set({ isInWishlist: false });
    }
  },

  // Toggle wishlist
  toggleWishlist: async () => {
    const { product, userEmail, isInWishlist, addProductToWishlist, removeProductFromWishlist } = get();

    if (!product || !userEmail) {
      Alert.alert('Error', 'You must be logged in to manage your wishlist');
      return;
    }

    const productId = product.id.toString();
    const cacheKey = `wishlist_${userEmail}_${productId}`;
    const cacheTimeKey = `${cacheKey}_timestamp`;

    try {
      let success = false;

      // Determine the action based on current state
      const action = isInWishlist ? 'remove' : 'add';
      console.log(`[ProductDetailsStore] Toggling wishlist - ${action} for product ${productId}`);

      if (isInWishlist) {
        // Remove from wishlist
        success = await removeProductFromWishlist(productId);
      } else {
        // Add to wishlist
        success = await addProductToWishlist(productId);
      }

      if (success) {
        // Update the UI state
        set({ isInWishlist: !isInWishlist });

        // Try to update the cache
        try {
          const now = Date.now();
          await AsyncStorage.setItem(cacheKey, (!isInWishlist).toString());
          await AsyncStorage.setItem(cacheTimeKey, now.toString());
          set({ lastCacheRefresh: now });
        } catch (cacheError) {
          console.warn('[ProductDetailsStore] Error updating cache:', cacheError);
        }
      } else {
        // Show a simple error without extra details
        const actionVerb = isInWishlist ? 'removing from' : 'adding to';
        Alert.alert(
          'Wishlist Error',
          `There was a problem ${actionVerb} your wishlist. Please try again.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('[ProductDetailsStore] Error in toggleWishlist:', error);

      // Show a simple error without exposing internal details
      const actionVerb = isInWishlist ? 'removing from' : 'adding to';
      Alert.alert(
        'Wishlist Error',
        `There was a problem ${actionVerb} your wishlist. Please try again.`,
        [{ text: 'OK' }]
      );
    }
  },

  // Check if current user is the seller
  isCurrentUserSeller: () => {
    const { userEmail, product } = get();
    if (!userEmail || !product?.email) {return false;}
    return userEmail.toLowerCase() === product.email.toLowerCase();
  },
}));

export default useProductDetailsStore;

/**
 * Products API Service
 * 
 * This service handles communication with the backend products API endpoints.
 */
import { 
  PRODUCTS_API_URL, 
  fetchWithTimeout, 
  handleResponse,
  API_URL 
} from './config';
import axios from 'axios';

// Define API base URL for product endpoints
const API_BASE_URL = `${API_URL}/api`;

// Utility to process product images (placeholder)
const processProductImages = (product: any): any => {
  const processed = {...product};
  
  // Ensure product has proper URL formatting for images
  if (processed.primaryImage && !processed.primaryImage.startsWith('http')) {
    console.log(`[API:products] Converting primaryImage to full URL: ${processed.primaryImage}`);
    processed.primaryImage = `https://trustudsel-products.s3.amazonaws.com/${processed.primaryImage}`;
  }
  
  // Process image arrays if they exist
  if (Array.isArray(processed.images)) {
    processed.imageUrls = processed.images.map((img: string) => {
      if (img && typeof img === 'string' && !img.startsWith('http')) {
        return `https://trustudsel-products.s3.amazonaws.com/${img}`;
      }
      return img;
    });
  }
  
  return processed;
};

// Product types
export interface Product {
  id: string;
  name: string;
  price: string;
  image?: string;
  condition?: string;
  type?: string;
  description: string;
  email: string;
  city?: string;
  zipcode?: string;
  university?: string;
  primaryImage?: string;
  productage?: string;
  sellingtype?: string;
  status?: string;
  images?: string[];
  imageUrls?: string[]; // Full S3 URLs
  additionalImages?: string[];
  category?: string;
  isAvailable?: boolean;
  postingdate?: string;
  seller?: {
    id: string;
    name: string;
  };
  sellerName?: string;
}

// Product filter options
export interface ProductFilters {
  university?: string;
  city?: string;
  category?: string;
  zipcode?: string;
  postedWithin?: number; // in days
  minPrice?: number | string;
  maxPrice?: number | string;
  condition?: string | string[];
  sellingType?: string | string[];
  sortBy?: string; // Support dynamic sort options
  sortDirection?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

export interface ProductListResponse {
  products: Product[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
}

export interface CreateProductWithImagesRequest {
  name: string;
  category: string;
  subcategory?: string;
  description: string;
  price: string;
  email: string;
  city?: string;
  zipcode?: string;
  university?: string;
  productage?: string;
  sellingtype?: string;
  imageFilenames?: string[];
  allImages?: string[];
  primaryImage?: string;
}

/**
 * Get list of products with optional filtering
 */
export const getProducts = async (filters: ProductFilters = {}): Promise<ProductListResponse> => {
  // Build query string from filters
  const queryParams = new URLSearchParams();
  
  // Process filters properly, handling arrays for condition and sellingType
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        // For array values, add multiple entries with the same key
        value.forEach(item => {
          if (item !== undefined && item !== null && item !== '') {
            queryParams.append(key, item.toString());
          }
        });
      } else {
        queryParams.append(key, value.toString());
      }
    }
  });
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  
  const response = await fetchWithTimeout(
    `${PRODUCTS_API_URL}${queryString}`,
    { method: 'GET' }
  );
  
  const result = await handleResponse<ProductListResponse>(response);
  
  // Process all products to add full image URLs
  result.products = result.products.map(product => processProductImages(product));
  
  return result;
};

/**
 * Get products by university with filtering
 */
export const getProductsByUniversity = async (university: string, filters: ProductFilters = {}): Promise<ProductListResponse> => {
  console.log(`[API:products] Getting products for university: ${university}`, { filters });

  // Use exact same URL that worked with curl, with no query parameters
  const url = `${API_URL}/api/products/university/${encodeURIComponent(university)}`;
  
  console.log(`[API:products] University products URL: ${url}`);
  console.log(`[API:products] Using EXACT same URL that worked with curl - no query parameters`);
  
  // Use the same headers and approach as the successful curl command
  return new Promise<ProductListResponse>((resolve, reject) => {
    try {
      console.log(`[API:products] Using fetch with curl-compatible headers`);
      
      // Create a normal fetch but with headers matching the curl example
      fetch(url, {
        method: 'GET',
        headers: {
          'Accept': '*/*', // Exact same Accept header as curl
          'User-Agent': 'curl/8.7.1' // Exact same User-Agent as curl
        }
      })
      .then(response => {
        console.log(`[API:products] University fetch response status: ${response.status}`);
        
        if (response.ok) {
          return response.text(); // Get as text first to avoid auto-parsing issues
        } else {
          throw new Error(`API error: ${response.status}`);
        }
      })
      .then(text => {
        console.log(`[API:products] Got response text (${text.length} bytes)`);
        console.log(`[API:products] First 100 chars:`, text.substring(0, 100));
        
        // Manually parse as JSON
        const data = JSON.parse(text);
        
        // Process the response
        const result: ProductListResponse = {
          products: data.products || [],
          totalItems: data.totalItems || 0,
          currentPage: data.currentPage || 0,
          totalPages: data.totalPages || 0
        };
        
        // Process products and add full image URLs
        if (Array.isArray(result.products)) {
          console.log(`[API:products] Products array contains ${result.products.length} items`);
          result.products = result.products.map(product => processProductImages(product));
        } else {
          console.warn(`[API:products] Products is not an array: ${typeof result.products}`);
          result.products = [];
        }
        
        resolve(result);
      })
      .catch(error => {
        console.error(`[API:products] Error in fetch promise chain:`, error);
        
        // Special handling for "ListIterators are not supported for this list" error
        if (error.message && error.message.includes('ListIterators are not supported')) {
          console.warn('[API:products] Caught ListIterators error, returning empty product list');
          resolve({ products: [], totalItems: 0, currentPage: 0, totalPages: 0 });
        } else {
          reject(error);
        }
      });
    } catch (error) {
      console.error(`[API:products] Error in university products:`, error);
      reject(error);
    }
  })
  .catch(error => {
    console.error(`[API:products] Error fetching university products for ${university}:`, error);
    console.error(`[API:products] Stack trace:`, error instanceof Error ? error.stack : 'No stack trace');
    
    // Return an empty result structure to avoid breaking the app
    return { products: [], totalItems: 0, currentPage: 0, totalPages: 0 };
  });
};

/**
 * Get products by city with filtering
 */
export const getProductsByCity = async (city: string, filters: ProductFilters = {}): Promise<ProductListResponse> => {
  console.log(`[API:products] Getting products for city: ${city}`, { filters });

  // Build query string from filters
  const queryParams = new URLSearchParams();
  
  // Convert filters to match backend expected format
  const backendFilters = {
    // Convert page from 1-indexed to 0-indexed
    page: filters.page !== undefined ? (filters.page - 1).toString() : '0',
    size: filters.size?.toString() || '20',
    category: filters.category,
    sortBy: filters.sortBy,
    condition: filters.condition,
    sellingType: filters.sellingType,
    // Keep university as is
    university: filters.university
  };
  
  // Add only defined parameters to query string
  Object.entries(backendFilters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, value);
    }
  });
  
  // Ensure the university parameter is included in the URL if provided
  if (filters.university) {
    console.log(`[API:products] Including university in city query: ${filters.university}`);
  }
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  const url = `${API_URL}/api/products/city/${encodeURIComponent(city)}${queryString}`;
  
  console.log(`[API:products] City products URL: ${url}`);
  
  try {
    console.log(`[API:products] Sending request to city endpoint: ${url}`);
    
    // Use explicit headers matching the README example
    const fetchOptions = {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };
    
    console.log(`[API:products] Request headers:`, JSON.stringify(fetchOptions.headers));
    const response = await fetchWithTimeout(url, fetchOptions);
    
    console.log(`[API:products] City products response status:`, response.status);
    console.log(`[API:products] Response headers:`, JSON.stringify(Object.fromEntries([...response.headers.entries()])));
    
    // For debugging 500 errors - try to examine the response before processing
    if (response.status === 500) {
      try {
        const responseClone = response.clone();
        const responseText = await responseClone.text();
        console.log(`[API:products] City 500 error response body:`, responseText.substring(0, 500));
        
        // Try to parse as JSON if possible (for better debugging)
        try {
          const errorJson = JSON.parse(responseText);
          console.log(`[API:products] City 500 error as JSON:`, JSON.stringify(errorJson));
        } catch (jsonParseError) {
          console.log(`[API:products] City 500 error not valid JSON`);
        }
      } catch (textReadError) {
        console.log(`[API:products] Failed to read 500 error response:`, textReadError);
      }
    }
    
    // Use a direct approach for JSON parsing to bypass possible issues
    if (response.ok) {
      try {
        // Clone the response for direct parsing attempt
        const responseClone = response.clone();
        const rawText = await responseClone.text();
        console.log(`[API:products] Raw response text (first 100 chars):`, rawText.substring(0, 100));
        
        // Try manual JSON parsing
        try {
          const manualJson = JSON.parse(rawText);
          console.log(`[API:products] Successfully parsed raw response text as JSON`);
          
          // Process the manually parsed JSON
          const result: ProductListResponse = manualJson;
          
          // Continue with normal processing...
          if (result.products) {
            // Handle possible non-iterable products by checking if it's truly an array
            if (!Array.isArray(result.products)) {
              console.warn('[API:products] City products is not an array. Converting to array.');
              try {
                // Try to convert object to array if it has numeric keys
                const productsArray = Object.keys(result.products)
                  .map(key => (result.products as Record<string, any>)[key])
                  .filter(product => product !== null && typeof product === 'object');
                result.products = productsArray;
              } catch (iteratorError: unknown) {
                console.error('[API:products] Failed to iterate over city products:', iteratorError);
                // If "ListIterators are not supported" error, use empty array
                if (
                  iteratorError instanceof Error && 
                  iteratorError.message && 
                  iteratorError.message.includes('ListIterators are not supported')
                ) {
                  console.warn('[API:products] ListIterators error detected in city products. Using empty products array.');
                  result.products = [];
                } else {
                  throw iteratorError;
                }
              }
            }
            
            // Now safely map over products array
            result.products = result.products.map(product => processProductImages(product));
          } else {
            console.warn('[API:products] Unexpected response format from city products API');
            result.products = [];
          }
          
          return result;
        } catch (manualJsonError) {
          console.error(`[API:products] Failed to manually parse response as JSON:`, manualJsonError);
          // Fall back to normal method if manual parsing fails
        }
      } catch (rawTextError) {
        console.error(`[API:products] Failed to get raw response text:`, rawTextError);
        // Fall back to normal method if getting raw text fails
      }
    }
    
    const result = await handleResponse<ProductListResponse>(response);
    console.log(`[API:products] City products response parsed successfully:`,
      result?.products ? `${result.products.length} products found` : 'No products in response');
    
    // Process all products to add full image URLs
    if (result.products) {
      // Handle possible non-iterable products by checking if it's truly an array
      if (!Array.isArray(result.products)) {
        console.warn('[API:products] City products is not an array. Converting to array.');
        try {
          // Try to convert object to array if it has numeric keys
          const productsArray = Object.keys(result.products)
            .map(key => (result.products as Record<string, any>)[key])
            .filter(product => product !== null && typeof product === 'object');
          result.products = productsArray;
        } catch (iteratorError: unknown) {
          console.error('[API:products] Failed to iterate over city products:', iteratorError);
          // If "ListIterators are not supported" error, use empty array
          if (
            iteratorError instanceof Error && 
            iteratorError.message && 
            iteratorError.message.includes('ListIterators are not supported')
          ) {
            console.warn('[API:products] ListIterators error detected in city products. Using empty products array.');
            result.products = [];
          } else {
            throw iteratorError;
          }
        }
      }
      
      // Now safely map over products array
      result.products = result.products.map(product => processProductImages(product));
    } else {
      console.warn('[API:products] Unexpected response format from city products API');
      result.products = [];
    }
    
    return result;
  } catch (error) {
    console.error(`[API:products] Error fetching city products for ${city}:`, error);
    console.error(`[API:products] Stack trace:`, error instanceof Error ? error.stack : 'No stack trace');
    
    // Special handling for "ListIterators are not supported for this list" error
    if (error instanceof Error && error.message.includes('ListIterators are not supported')) {
      console.warn('[API:products] Caught ListIterators error in city products, returning empty product list');
    }
    
    // Return an empty result structure to avoid breaking the app
    return { products: [], totalItems: 0, currentPage: 1, totalPages: 1 };
  }
};

/**
 * Get products by category
 */
export const getProductsByCategory = async (category: string, filters: ProductFilters = {}): Promise<ProductListResponse> => {
  console.log(`[API:products] Getting products for category: ${category}`);

  // Build query string from filters
  const queryParams = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, value.toString());
    }
  });
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  
  const response = await fetchWithTimeout(
    `${API_URL}/api/products/category/${encodeURIComponent(category)}${queryString}`,
    { method: 'GET' }
  );
  
  try {
    // Get the response as text first for better error handling
    const responseClone = response.clone();
    const responseText = await responseClone.text();
    console.log(`[API:products] Category response raw text (first 100 chars): ${responseText.substring(0, 100)}`);
    
    // Parse the JSON manually
    const data = JSON.parse(responseText);
    
    // Handle both array responses and object responses with products property
    let productsArray: Product[] = [];
    
    if (Array.isArray(data)) {
      console.log(`[API:products] Category response is an array with ${data.length} items`);
      productsArray = data;
    } else if (data && typeof data === 'object' && Array.isArray(data.products)) {
      console.log(`[API:products] Category response is an object with products array (${data.products.length} items)`);
      productsArray = data.products;
    } else {
      console.warn(`[API:products] Unexpected response format for category products`);
      productsArray = [];
    }
    
    // Process all products to add full image URLs
    const processedProducts = productsArray.map(product => processProductImages(product));
    
    // Return in the standard ProductListResponse format
    return {
      products: processedProducts,
      totalItems: processedProducts.length,
      currentPage: 1,
      totalPages: 1
    };
  } catch (error) {
    console.error(`[API:products] Error processing category products response:`, error);
    // Return empty result to avoid breaking the app
    return {
      products: [],
      totalItems: 0,
      currentPage: 1,
      totalPages: 1
    };
  }
};

/**
 * Get featured products for university and city
 */
export const getFeaturedProducts = async (university: string, city: string): Promise<Product[]> => {
  console.log(`[API:products] Getting featured products for university: ${university}, city: ${city}`);
  
  try {
    const response = await fetchWithTimeout(
      `${API_URL}/api/products/featured/${encodeURIComponent(university)}/${encodeURIComponent(city)}`,
      { method: 'GET' }
    );
    
    const products = await handleResponse<Product[]>(response);
    
    // Process products to add full image URLs
    return products.map(product => processProductImages(product));
  } catch (error) {
    console.error('Error fetching featured products:', error);
    return [];
  }
};

/**
 * Get new arrivals for university
 */
export const getNewArrivals = async (university: string): Promise<Product[]> => {
  console.log(`[API:products] Getting new arrivals for university: ${university}`);
  
  try {
    const response = await fetchWithTimeout(
      `${API_URL}/api/products/new-arrivals/${encodeURIComponent(university)}`,
      { method: 'GET' }
    );
    
    const products = await handleResponse<Product[]>(response);
    
    // Process products to add full image URLs
    return products.map(product => processProductImages(product));
  } catch (error) {
    console.error('Error fetching new arrivals:', error);
    return [];
  }
};

/**
 * Create a product with pre-uploaded image filenames
 * 
 * This endpoint is used after uploading images separately to S3
 */
export const createProductWithImageFilenames = async (
  productData: CreateProductWithImagesRequest
): Promise<Product> => {
  console.log('[API:products] Starting createProductWithImageFilenames with data:', 
    JSON.stringify({
      ...productData,
      description: productData.description.length > 50 
        ? productData.description.substring(0, 50) + '...' 
        : productData.description
    })
  );
  
  try {
    const endpoint = `${API_URL}/api/products/with-image-filenames`;
    console.log('[API:products] Sending request to endpoint:', endpoint);
    
    const requestBody = JSON.stringify(productData);
    console.log('[API:products] Request payload size:', requestBody.length, 'bytes');
    console.log('[API:products] Request headers:', {
      'Content-Type': 'application/json'
    });
    
    // Log first 200 characters of request body for debugging
    console.log('[API:products] Request body (truncated):', 
      requestBody.length > 200 ? requestBody.substring(0, 200) + '...' : requestBody);
    
    const response = await fetchWithTimeout(
      endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody
      }
    );
    
    console.log('[API:products] Response status:', response.status);
    console.log('[API:products] Response status text:', response.statusText);
    
    const createdProduct = await handleResponse<Product>(response);
    console.log('[API:products] Product created successfully with ID:', createdProduct.id);
    
    return createdProduct;
  } catch (error) {
    console.error('[API:products] Error in createProductWithImageFilenames:', error);
    throw error;
  }
};

/**
 * Get a single product by ID
 * This ensures proper seller information is included
 */
export const getProductById = async (id: string): Promise<Product> => {
  console.log(`[API:products] Getting product by ID: ${id}`);
  
  try {
    const response = await fetchWithTimeout(
      `${API_URL}/api/products/${encodeURIComponent(id)}`,
      { method: 'GET' }
    );
    
    const product = await handleResponse<Product>(response);

    // Process product to add full image URLs
    const processedProduct = processProductImages(product);
    
    // Ensure seller information exists by creating a default if missing
    if (!processedProduct.seller) {
      console.log('[API:products] Adding default seller information to product');
      processedProduct.seller = {
        id: processedProduct.email || 'unknown-seller',
        name: processedProduct.sellerName || 'Unknown Seller'
      };
    }
    
    // Ensure sellerName is available directly on the product for easy access
    if (!processedProduct.sellerName && processedProduct.seller?.name) {
      processedProduct.sellerName = processedProduct.seller.name;
    }
    
    console.log('[API:products] Product processed:', {
      id: processedProduct.id,
      name: processedProduct.name,
      sellerName: processedProduct.sellerName,
      seller: processedProduct.seller
    });
    
    return processedProduct;
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    throw new Error(`Failed to fetch product with ID: ${id}`);
  }
};

/**
 * Fetches all products listed by a specific user
 * @param email - User's email address
 * @returns Promise resolving to an array of products
 */
export const fetchUserProducts = async (email: string): Promise<Product[]> => {
  try {
    console.log(`[API] Fetching products for user: ${email}`);
    const response = await axios.get(`${API_BASE_URL}/products/user/${email}`);
    
    if (response.status === 200) {
      console.log(`[API] Successfully fetched ${response.data.length} products for user`);
      return response.data.map((product: any) => processProductImages(product));
    } else {
      console.error(`[API] Error fetching user products: ${response.status}`);
      return [];
    }
  } catch (error) {
    console.error('[API] Error fetching user products:', error);
    throw error;
  }
};

// Define interface for search parameters
export interface SearchProductsParams {
  query?: string;
  university?: string;
  category?: string;
  city?: string;
  minPrice?: number | string;
  maxPrice?: number | string;
  condition?: string | string[];
  sellingType?: string | string[];
  sortBy?: string;
  sortDirection?: string;
  page?: number;
  size?: number;
  paginationToken?: string;
}

// Define interface for search results
export interface SearchProductsResponse {
  products: Product[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  hasMorePages?: boolean;
  nextPageToken?: string | null;
}

/**
 * Search products with multiple parameters and filters
 * 
 * @param {SearchProductsParams} searchParams Search parameters and filters
 * @returns {Promise<SearchProductsResponse>} Search results with pagination
 */
export const searchProducts = async (searchParams: SearchProductsParams = {}): Promise<SearchProductsResponse> => {
  console.log(`[API:products] Searching products with params:`, JSON.stringify(searchParams));
  
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    // Add all search parameters
    if (searchParams.query) queryParams.append('query', searchParams.query);
    if (searchParams.university) queryParams.append('university', searchParams.university);
    if (searchParams.category) queryParams.append('category', searchParams.category);
    if (searchParams.city) queryParams.append('city', searchParams.city);
    if (searchParams.minPrice) queryParams.append('minPrice', searchParams.minPrice.toString());
    if (searchParams.maxPrice) queryParams.append('maxPrice', searchParams.maxPrice.toString());
    
    // Handle condition and sellingType which can be arrays safely
    if (searchParams.condition) {
      if (Array.isArray(searchParams.condition)) {
        searchParams.condition.forEach(cond => {
          if (cond) queryParams.append('condition', cond);
        });
      } else if (typeof searchParams.condition === 'string') {
        queryParams.append('condition', searchParams.condition);
      }
    }
    
    if (searchParams.sellingType) {
      if (Array.isArray(searchParams.sellingType)) {
        searchParams.sellingType.forEach(type => {
          if (type) queryParams.append('sellingType', type);
        });
      } else if (typeof searchParams.sellingType === 'string') {
        queryParams.append('sellingType', searchParams.sellingType);
      }
    }
    
    // Sorting
    if (searchParams.sortBy) queryParams.append('sortBy', searchParams.sortBy);
    if (searchParams.sortDirection) queryParams.append('sortDirection', searchParams.sortDirection);
    
    // Pagination
    if (searchParams.page) queryParams.append('page', searchParams.page.toString());
    if (searchParams.size) queryParams.append('size', searchParams.size.toString());
    if (searchParams.paginationToken) queryParams.append('paginationToken', searchParams.paginationToken);
    
    const searchUrl = `${API_URL}/api/products/search?${queryParams}`;
    console.log(`[API:products] Attempting search API at: ${searchUrl}`);
    
    // Try with the search endpoint first
    try {
      const response = await fetchWithTimeout(searchUrl, { method: 'GET' });
      console.log(`[API:products] Search API response status: ${response.status}`);
      
      if (response.ok) {
        // If search API works, use it
        const result = await handleResponse<SearchProductsResponse>(response);
        console.log(`[API:products] Search API returned ${result.products?.length || 0} products`);
        
        // Ensure products is an array and process images
        if (result.products && Array.isArray(result.products)) {
          result.products = result.products.map(product => processProductImages(product));
          return result;
        }
      } else {
        // Log detailed error information
        console.error(`[API:products] Search API error: ${response.status} ${response.statusText}`);
        
        try {
          // Clone response to inspect body without consuming the original
          const responseClone = response.clone();
          const errorText = await responseClone.text();
          console.error('[API:products] Error response details:', errorText.substring(0, 200));
          
          // Try to parse as JSON if possible
          try {
            const errorJson = JSON.parse(errorText);
            console.error('[API:products] Error JSON:', JSON.stringify(errorJson));
          } catch (jsonError) {
            console.log('[API:products] Error response is not valid JSON');
          }
        } catch (readError) {
          console.error('[API:products] Failed to read error response:', readError);
        }
      }
      
      // If we get here, the search API failed but didn't throw an error
      // Fall back to university or category endpoint
      throw new Error(`Search API failed with status: ${response.status}`);
      
    } catch (searchError) {
      // Search API failed, fall back to university or category endpoints
      console.warn(`[API:products] Search API unavailable or failed: ${searchError}`);
      console.log('[API:products] Falling back to alternative API endpoints');
      
      // Determine which fallback endpoint to use
      return await handleSearchFallback(searchParams);
    }
  } catch (error) {
    console.error('[API:products] Error in searchProducts function:', error);
    
    // Try fallback as last resort
    try {
      return await handleSearchFallback(searchParams);
    } catch (fallbackError) {
      console.error('[API:products] Even fallback search failed:', fallbackError);
      
      // Return a safe empty result when all methods fail
      return {
        products: [],
        totalItems: 0,
        currentPage: 1,
        totalPages: 1,
        hasMorePages: false,
        nextPageToken: null
      };
    }
  }
};

/**
 * Handle search fallback when the primary search API fails
 * Uses existing backend endpoints instead of client-side filtering
 */
const handleSearchFallback = async (searchParams: SearchProductsParams): Promise<SearchProductsResponse> => {
  console.log('[API:products] Using backend fallback for search');
  
  try {
    let fallbackResult: ProductListResponse | null = null;
    
    // First priority: Use university endpoint if university is specified
    if (searchParams.university) {
      console.log(`[API:products] Fallback: Using university endpoint with "${searchParams.university}"`);
      
      // Build filter object for university search
      const uniFilters: ProductFilters = {};
      
      // Apply available filters to university request
      if (searchParams.sortBy) uniFilters.sortBy = searchParams.sortBy;
      if (searchParams.condition) uniFilters.condition = searchParams.condition;
      if (searchParams.sellingType) uniFilters.sellingType = searchParams.sellingType;
      if (searchParams.minPrice) uniFilters.minPrice = searchParams.minPrice;
      if (searchParams.maxPrice) uniFilters.maxPrice = searchParams.maxPrice;
      
      try {
        fallbackResult = await getProductsByUniversity(searchParams.university, uniFilters);
        
        // Text filtering on the query parameter must be done client-side for now
        // But this is a fallback mechanism only when search API is down
        if (searchParams.query && fallbackResult.products) {
          const query = searchParams.query.toLowerCase();
          console.log(`[API:products] Fallback: Filtering university results by query "${query}" (${fallbackResult.products.length} before filtering)`);
          
          fallbackResult.products = fallbackResult.products.filter(product => 
            product.name.toLowerCase().includes(query) || 
            (product.description && product.description.toLowerCase().includes(query))
          );
          
          // Update total count
          fallbackResult.totalItems = fallbackResult.products.length;
          fallbackResult.totalPages = Math.ceil(fallbackResult.totalItems / (searchParams.size || 20));
          
          console.log(`[API:products] Fallback: Found ${fallbackResult.products.length} matching university products after filtering`);
        }
      } catch (uniError) {
        console.error(`[API:products] University fallback failed:`, uniError);
      }
    }
    
    // Second priority: Use category endpoint if category is specified and university failed
    if (!fallbackResult && searchParams.category) {
      console.log(`[API:products] Fallback: Using category endpoint with "${searchParams.category}"`);
      
      // Build filter object for category search
      const categoryFilters: ProductFilters = {};
      
      // Apply available filters to category request
      if (searchParams.sortBy) categoryFilters.sortBy = searchParams.sortBy;
      if (searchParams.condition) categoryFilters.condition = searchParams.condition;
      if (searchParams.sellingType) categoryFilters.sellingType = searchParams.sellingType;
      if (searchParams.minPrice) categoryFilters.minPrice = searchParams.minPrice;
      if (searchParams.maxPrice) categoryFilters.maxPrice = searchParams.maxPrice;
      
      try {
        fallbackResult = await getProductsByCategory(searchParams.category, categoryFilters);
        
        // Text filtering on the query parameter must be done client-side for now
        // But this is a fallback mechanism only when search API is down
        if (searchParams.query && fallbackResult.products) {
          const query = searchParams.query.toLowerCase();
          console.log(`[API:products] Fallback: Filtering category results by query "${query}" (${fallbackResult.products.length} before filtering)`);
          
          fallbackResult.products = fallbackResult.products.filter(product => 
            product.name.toLowerCase().includes(query) || 
            (product.description && product.description.toLowerCase().includes(query))
          );
          
          // Update total count
          fallbackResult.totalItems = fallbackResult.products.length;
          fallbackResult.totalPages = Math.ceil(fallbackResult.totalItems / (searchParams.size || 20));
          
          console.log(`[API:products] Fallback: Found ${fallbackResult.products.length} matching category products after filtering`);
        }
      } catch (categoryError) {
        console.error(`[API:products] Category fallback failed:`, categoryError);
      }
    }
    
    // Third priority: Use city endpoint if city is specified and other methods failed
    if (!fallbackResult && searchParams.city) {
      console.log(`[API:products] Fallback: Using city endpoint with "${searchParams.city}"`);
      
      // Build filter object for city search
      const cityFilters: ProductFilters = {};
      
      // Apply available filters to city request
      if (searchParams.sortBy) cityFilters.sortBy = searchParams.sortBy;
      if (searchParams.condition) cityFilters.condition = searchParams.condition;
      if (searchParams.sellingType) cityFilters.sellingType = searchParams.sellingType;
      if (searchParams.minPrice) cityFilters.minPrice = searchParams.minPrice;
      if (searchParams.maxPrice) cityFilters.maxPrice = searchParams.maxPrice;
      
      try {
        fallbackResult = await getProductsByCity(searchParams.city, cityFilters);
        
        // Text filtering on the query parameter must be done client-side for now
        // But this is a fallback mechanism only when search API is down
        if (searchParams.query && fallbackResult.products) {
          const query = searchParams.query.toLowerCase();
          console.log(`[API:products] Fallback: Filtering city results by query "${query}" (${fallbackResult.products.length} before filtering)`);
          
          fallbackResult.products = fallbackResult.products.filter(product => 
            product.name.toLowerCase().includes(query) || 
            (product.description && product.description.toLowerCase().includes(query))
          );
          
          // Update total count
          fallbackResult.totalItems = fallbackResult.products.length;
          fallbackResult.totalPages = Math.ceil(fallbackResult.totalItems / (searchParams.size || 20));
          
          console.log(`[API:products] Fallback: Found ${fallbackResult.products.length} matching city products after filtering`);
        }
      } catch (cityError) {
        console.error(`[API:products] City fallback failed:`, cityError);
      }
    }
    
    // Last resort: Use general products endpoint if everything else failed
    if (!fallbackResult) {
      console.log(`[API:products] Fallback: Using general products endpoint as last resort`);
      
      // Build filter object for general search
      const generalFilters: ProductFilters = {};
      
      // Apply all possible filters
      if (searchParams.sortBy) generalFilters.sortBy = searchParams.sortBy;
      if (searchParams.condition) generalFilters.condition = searchParams.condition;
      if (searchParams.sellingType) generalFilters.sellingType = searchParams.sellingType;
      if (searchParams.minPrice) generalFilters.minPrice = searchParams.minPrice;
      if (searchParams.maxPrice) generalFilters.maxPrice = searchParams.maxPrice;
      if (searchParams.university) generalFilters.university = searchParams.university as string;
      if (searchParams.city) generalFilters.city = searchParams.city;
      if (searchParams.category) generalFilters.category = searchParams.category;
      
      try {
        fallbackResult = await getProducts(generalFilters);
        
        // Text filtering on the query parameter must be done client-side for now
        // But this is a fallback mechanism only when search API is down
        if (searchParams.query && fallbackResult.products) {
          const query = searchParams.query.toLowerCase();
          console.log(`[API:products] Fallback: Filtering general results by query "${query}" (${fallbackResult.products.length} before filtering)`);
          
          fallbackResult.products = fallbackResult.products.filter(product => 
            product.name.toLowerCase().includes(query) || 
            (product.description && product.description.toLowerCase().includes(query))
          );
          
          // Update total count
          fallbackResult.totalItems = fallbackResult.products.length;
          fallbackResult.totalPages = Math.ceil(fallbackResult.totalItems / (searchParams.size || 20));
          
          console.log(`[API:products] Fallback: Found ${fallbackResult.products.length} matching products after filtering`);
        }
      } catch (generalError) {
        console.error(`[API:products] General products fallback failed:`, generalError);
        throw new Error('All search fallback methods failed');
      }
    }
    
    if (!fallbackResult) {
      throw new Error('No search fallback method returned results');
    }
    
    // Convert result to expected SearchProductsResponse format
    const response: SearchProductsResponse = {
      products: fallbackResult.products || [],
      totalItems: fallbackResult.totalItems || fallbackResult.products?.length || 0,
      currentPage: searchParams.page || 1,
      totalPages: fallbackResult.totalPages || Math.ceil((fallbackResult.totalItems || fallbackResult.products?.length || 0) / (searchParams.size || 20)),
      hasMorePages: false,
      nextPageToken: null
    };
    
    // Calculate pagination information
    const currentPage = searchParams.page || 1;
    response.hasMorePages = currentPage < response.totalPages;
    
    if (response.hasMorePages) {
      response.nextPageToken = `page_${currentPage + 1}`;
    }
    
    console.log(`[API:products] Fallback search complete. Returning ${response.products.length} products. Page ${currentPage}/${response.totalPages}`);
    
    return response;
  } catch (error) {
    console.error('[API:products] All fallback methods failed:', error);
    throw error;
  }
};

export default {
  getProducts,
  getProductsByUniversity,
  getProductsByCity,
  getProductsByCategory,
  getFeaturedProducts,
  getNewArrivals,
  createProductWithImageFilenames,
  getProductById,
  fetchUserProducts,
  searchProducts,
}; 
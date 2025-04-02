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

// Utility to process product images (placeholder)
const processProductImages = (product: any): any => {
  // In a real implementation, this would add S3 URL prefixes
  // or do other image processing
  return product;
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
}

export interface ProductFilters {
  category?: string;
  sortBy?: 'price_low_high' | 'price_high_low' | 'newest' | 'popularity';
  condition?: string;
  sellingType?: string;
  page?: number;
  size?: number;
  university?: string; // For university filtering
  city?: string; // For city filtering
  zipcode?: string; // For zipcode-based filtering or proximity search
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
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, value.toString());
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
  
  const result = await handleResponse<ProductListResponse>(response);
  
  // Process all products to add full image URLs
  result.products = result.products.map(product => processProductImages(product));
  
  return result;
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

export default {
  getProducts,
  getProductsByUniversity,
  getProductsByCity,
  getProductsByCategory,
  getFeaturedProducts,
  getNewArrivals,
  createProductWithImageFilenames,
}; 
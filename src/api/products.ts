/**
 * Products API Service
 *
 * This service handles communication with the backend products API endpoints.
 */
import {
  PRODUCTS_API_URL,
  fetchWithTimeout,
  handleResponse,
  API_URL,
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

// Define product status enum for better type safety
export type ProductStatus = 'available' | 'sold' | 'archived' | 'pending';

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
  status?: ProductStatus; // Updated to use the new type
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
  // console.log(`[API:products] Getting products for university: ${university}`, { filters });

  // Use exact same URL that worked with curl, with no query parameters
  const url = `${API_URL}/api/products/university/${encodeURIComponent(university)}`;
  if (__DEV__) {
  console.log(`[API:products] University products URL: `);
  console.log('[API:products] Using EXACT same URL that worked with curl - no query parameters');
}
  // Use the same headers and approach as the successful curl command
  return new Promise<ProductListResponse>((resolve, reject) => {
    try {
      console.log('[API:products] Using fetch with curl-compatible headers');

      // Create a normal fetch but with headers matching the curl example
      fetch(url, {
        method: 'GET',
        headers: {
          'Accept': '*/*', // Exact same Accept header as curl
          'User-Agent': 'curl/8.7.1', // Exact same User-Agent as curl
        },
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
        // console.log(`[API:products] Got response text (${text.length} bytes)`);
        // console.log('[API:products] First 100 chars:', text.substring(0, 100));

        // Manually parse as JSON
        const data = JSON.parse(text);

        // Process the response
        const result: ProductListResponse = {
          products: data.products || [],
          totalItems: data.totalItems || 0,
          currentPage: data.currentPage || 0,
          totalPages: data.totalPages || 0,
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
        console.error('[API:products] Error in fetch promise chain:', error);

        // Special handling for "ListIterators are not supported for this list" error
        if (error.message && error.message.includes('ListIterators are not supported')) {
          console.warn('[API:products] Caught ListIterators error, returning empty product list');
          resolve({ products: [], totalItems: 0, currentPage: 0, totalPages: 0 });
        } else {
          reject(error);
        }
      });
    } catch (error) {
      console.error('[API:products] Error in university products:', error);
      reject(error);
    }
  })
  .catch(error => {
    console.error(`[API:products] Error fetching university products for ${university}:`, error);
    console.error('[API:products] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');

    // Return an empty result structure to avoid breaking the app
    return { products: [], totalItems: 0, currentPage: 0, totalPages: 0 };
  });
};

/**
 * Get products by city with filtering
 */
export const getProductsByCity = async (city: string, filters: ProductFilters = {}): Promise<ProductListResponse> => {
  // console.log(`[API:products] Getting products for city: ${city}`, { filters });

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
    university: filters.university,
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

  console.log(`[API:products] City products URL: `);

  try {
    console.log(`[API:products] Sending request to city endpoint: `);

    // Use explicit headers matching the README example
    const fetchOptions = {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    };

    console.log('[API:products] Request headers:', JSON.stringify(fetchOptions.headers));
    const response = await fetchWithTimeout(url, fetchOptions);

    // console.log('[API:products] City products response status:', response.status);
    // console.log('[API:products] Response headers:', JSON.stringify(Object.fromEntries([...response.headers.entries()])));

    // For debugging 500 errors - try to examine the response before processing
    if (response.status === 500) {
      try {
        const responseClone = response.clone();
        const responseText = await responseClone.text();
        console.log('[API:products] City 500 error response body:', responseText.substring(0, 500));

        // Try to parse as JSON if possible (for better debugging)
        try {
          const errorJson = JSON.parse(responseText);
          console.log('[API:products] City 500 error as JSON:', JSON.stringify(errorJson));
        } catch (jsonParseError) {
          console.log('[API:products] City 500 error not valid JSON');
        }
      } catch (textReadError) {
        console.log('[API:products] Failed to read 500 error response:', textReadError);
      }
    }

    // Use a direct approach for JSON parsing to bypass possible issues
    if (response.ok) {
      try {
        // Clone the response for direct parsing attempt
        const responseClone = response.clone();
        const rawText = await responseClone.text();
        // console.log('[API:products] Raw response text (first 100 chars):', rawText.substring(0, 100));

        // Try manual JSON parsing
        try {
          const manualJson = JSON.parse(rawText);
          console.log('[API:products] Successfully parsed raw response text as JSON');

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
          console.error('[API:products] Failed to manually parse response as JSON:', manualJsonError);
          // Fall back to normal method if manual parsing fails
        }
      } catch (rawTextError) {
        console.error('[API:products] Failed to get raw response text:', rawTextError);
        // Fall back to normal method if getting raw text fails
      }
    }

    const result = await handleResponse<ProductListResponse>(response);
    console.log('[API:products] City products response parsed successfully:',
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
    console.error('[API:products] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');

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
      console.warn('[API:products] Unexpected response format for category products');
      productsArray = [];
    }

    // Process all products to add full image URLs
    const processedProducts = productsArray.map(product => processProductImages(product));

    // Return in the standard ProductListResponse format
    return {
      products: processedProducts,
      totalItems: processedProducts.length,
      currentPage: 1,
      totalPages: 1,
    };
  } catch (error) {
    console.error('[API:products] Error processing category products response:', error);
    // Return empty result to avoid breaking the app
    return {
      products: [],
      totalItems: 0,
      currentPage: 1,
      totalPages: 1,
    };
  }
};

/**
 * Get featured products for university and city
 */
export const getFeaturedProducts = async (university: string, city: string, page: number = 0, size: number = 10): Promise<ProductListResponse> => {
  console.log(`[API:products] Getting featured products for university: ${university}, city: ${city}, page: ${page}, size: ${size}`);

  try {
    const response = await fetchWithTimeout(
      `${API_URL}/api/products/featured/${encodeURIComponent(university)}/${encodeURIComponent(city)}/paginated?page=${page}&size=${size}&pageSize=${size}`,
      { method: 'GET' }
    );

    const result = await handleResponse<ProductListResponse>(response);

    // Process products to add full image URLs
    if (result.products) {
      console.log(`[API:products] Received ${result.products.length} featured products out of total ${result.totalItems}`);
      result.products = result.products.map(product => processProductImages(product));
    } else {
      // Handle case where result is just an array of products (for backward compatibility)
      const products = await handleResponse<Product[]>(response);
      return {
        products: products.map(product => processProductImages(product)),
        totalItems: products.length,
        currentPage: page,
        totalPages: 1,
      };
    }

    return result;
  } catch (error) {
    console.error('Error fetching featured products:', error);
    return { products: [], totalItems: 0, currentPage: page, totalPages: 1 };
  }
};

/**
 * Get new arrivals for university
 */
export const getNewArrivals = async (university: string, page: number = 0, size: number = 10): Promise<ProductListResponse> => {
  console.log(`[API:products] Getting new arrivals for university: ${university}, page: ${page}, size: ${size}`);

  try {
    const response = await fetchWithTimeout(
      `${API_URL}/api/products/new-arrivals/${encodeURIComponent(university)}/paginated?page=${page}&size=${size}&pageSize=${size}`,
      { method: 'GET' }
    );

    const result = await handleResponse<ProductListResponse>(response);

    // Process products to add full image URLs
    if (result.products) {
      console.log(`[API:products] Received ${result.products.length} new arrivals out of total ${result.totalItems}`);
      result.products = result.products.map(product => processProductImages(product));
    } else {
      // Handle case where result is just an array of products (for backward compatibility)
      const products = await handleResponse<Product[]>(response);
      return {
        products: products.map(product => processProductImages(product)),
        totalItems: products.length,
        currentPage: page,
        totalPages: 1,
      };
    }

    return result;
  } catch (error) {
    console.error('Error fetching new arrivals:', error);
    return { products: [], totalItems: 0, currentPage: page, totalPages: 1 };
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
        : productData.description,
    })
  );

  try {
    // Import Auth from Amplify inside the function to avoid circular dependencies
    const { Auth } = require('aws-amplify');

    // Get the current authenticated session to retrieve the JWT token
    const currentSession = await Auth.currentSession();
    const token = currentSession.getIdToken().getJwtToken();

    const endpoint = `${API_URL}/api/products/with-image-filenames`;
    console.log('[API:products] Sending request to endpoint:', endpoint);

    const requestBody = JSON.stringify(productData);
    console.log('[API:products] Request payload size:', requestBody.length, 'bytes');
    console.log('[API:products] Request headers:', {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.substring(0, 15)}...`, // Only log part of token for security
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
          'Authorization': `Bearer ${token}`,
        },
        body: requestBody,
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
    // Import Auth from Amplify inside the function to avoid circular dependencies
    const { Auth } = require('aws-amplify');

    // Get the current authenticated session to retrieve the JWT token
    const currentSession = await Auth.currentSession();
    const token = currentSession.getIdToken().getJwtToken();

    const response = await fetchWithTimeout(
      `${API_URL}/api/products/${encodeURIComponent(id)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const product = await handleResponse<Product>(response);

    // Process product to add full image URLs
    const processedProduct = processProductImages(product);

    // Ensure seller information exists by creating a default if missing
    if (!processedProduct.seller) {
      console.log('[API:products] Adding default seller information to product');
      processedProduct.seller = {
        id: processedProduct.email || 'unknown-seller',
        name: processedProduct.sellerName || 'Unknown Seller',
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
      seller: processedProduct.seller,
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

    // Import Auth from Amplify inside the function to avoid circular dependencies
    const { Auth } = require('aws-amplify');

    // Get the current authenticated session to retrieve the JWT token
    const currentSession = await Auth.currentSession();
    const token = currentSession.getIdToken().getJwtToken();

    const response = await axios.get(`${API_BASE_URL}/products/user/${email}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

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
  keyword: string;              // The search term (renamed from query to keyword)
  university?: string;          // Location context (university)
  city?: string;                // Location context (city)
  category?: string;            // Optional category filter
  condition?: string | string[]; // Optional condition filters
  sellingType?: string | string[]; // Optional selling type filters
  minPrice?: number | string;   // Min price filter
  maxPrice?: number | string;   // Max price filter
  sortBy?: string;              // Sort field
  sortDirection?: string;       // Sort direction
  page?: number;                // Page number (0-based, defaults to 0)
  size?: number;                // Results per page (defaults to 20, max 50)
  paginationToken?: string;     // Token for pagination (if supported)
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
 * Search for products using the new high-performance search API
 */
export const searchProducts = async (searchParams: SearchProductsParams): Promise<SearchProductsResponse> => {
  console.log('[API:products] Searching products with params:', JSON.stringify(searchParams));

  try {
    // Validate keyword - must be at least 3 characters
    if (!searchParams.keyword || searchParams.keyword.length < 3) {
      throw new Error('Search keyword must be at least 3 characters');
    }

    // Validate location context - must have either university or city
    if (!searchParams.university && !searchParams.city) {
      throw new Error('Either university or city parameter must be provided');
    }

    // Build query parameters
    const queryParams = new URLSearchParams();

    // Add required search parameters
    queryParams.append('keyword', searchParams.keyword);

    // Location parameters (university takes precedence if both are provided)
    if (searchParams.university) {
      queryParams.append('university', searchParams.university);
    } else if (searchParams.city) {
      queryParams.append('city', searchParams.city);
    }

    // Add optional filters
    if (searchParams.category) {queryParams.append('category', searchParams.category);}

    // Pagination (0-based page number)
    if (searchParams.page !== undefined) {queryParams.append('page', searchParams.page.toString());}
    const size = searchParams.size || 20;
    queryParams.append('size', Math.min(size, 50).toString()); // Enforce max size of 50

    // Handle condition filters (can be array)
    if (searchParams.condition) {
      if (Array.isArray(searchParams.condition)) {
        // Handle array of conditions
        searchParams.condition.forEach(cond => {
          if (cond) {queryParams.append('condition', cond);}
        });
      } else {
        // Handle single condition as string
        queryParams.append('condition', searchParams.condition);
      }
    }

    // Handle selling type filters (can be array)
    if (searchParams.sellingType) {
      if (Array.isArray(searchParams.sellingType)) {
        // Handle array of selling types
        searchParams.sellingType.forEach(type => {
          if (type) {queryParams.append('sellingType', type);}
        });
      } else {
        // Handle single selling type as string
        queryParams.append('sellingType', searchParams.sellingType);
      }
    }

    // Add price filters
    if (searchParams.minPrice !== undefined) {queryParams.append('minPrice', searchParams.minPrice.toString());}
    if (searchParams.maxPrice !== undefined) {queryParams.append('maxPrice', searchParams.maxPrice.toString());}

    // Add sorting parameters
    if (searchParams.sortBy) {queryParams.append('sortBy', searchParams.sortBy);}
    if (searchParams.sortDirection) {queryParams.append('sortDirection', searchParams.sortDirection);}

    // Use the new search API endpoint
    const searchUrl = `${API_URL}/api/products/search?${queryParams}`;
    console.log(`[API:products] Making search request to: ${searchUrl}`);

    // Adjust fetch call to use AbortController instead of timeout parameter
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    try {
      const response = await fetchWithTimeout(searchUrl, {
        method: 'GET',
        signal: controller.signal, // Use AbortController signal instead of timeout
      });

      clearTimeout(timeoutId); // Clear the timeout once request completes

      console.log(`[API:products] Search API response status: ${response.status}`);

      if (!response.ok) {
        throw new Error(`Search API returned status: ${response.status}`);
      }

        const result = await handleResponse<SearchProductsResponse>(response);

      // Process images in search results
        if (result.products && Array.isArray(result.products)) {
          result.products = result.products.map(product => processProductImages(product));
      } else {
        // Ensure products is always an array
        result.products = [];
      }

      // Ensure correct response format with pagination info
      return {
        products: result.products || [],
        totalItems: result.totalItems || 0,
        currentPage: result.currentPage || 0,
        totalPages: result.totalPages || 1,
        hasMorePages: result.currentPage < result.totalPages - 1,
        nextPageToken: result.nextPageToken || null,
      };
  } catch (error) {
      console.error('[API:products] Error in searchProducts:', error);

      // Return empty results on error
      return {
        products: [],
        totalItems: 0,
        currentPage: 0,
        totalPages: 1,
        hasMorePages: false,
        nextPageToken: null,
      };
    }
  } catch (error) {
    console.error('[API:products] Error in searchProducts:', error);

    // Return empty results on error
    return {
      products: [],
      totalItems: 0,
      currentPage: 0,
      totalPages: 1,
      hasMorePages: false,
      nextPageToken: null,
    };
  }
};

// Add helpful base64 encode function (since btoa isn't available in React Native)
const btoa = (input: string): string => {
  return Buffer.from(input, 'binary').toString('base64');
};

// Add a function to clear product cache for a specific product
export const clearProductCache = async (productId: string): Promise<void> => {
  try {
    console.log(`[API:products] Clearing cache for product: ${productId}`);

    // Add code to clear cached items if you implement product caching
    // For now, this is just a placeholder for future implementation

    return Promise.resolve();
  } catch (error) {
    console.error('[API:products] Error clearing product cache:', error);
    return Promise.resolve();
  }
};

/**
 * Update a product's status
 * @param id Product ID to update
 * @param status New status for the product (e.g., 'sold', 'archived')
 * @returns The updated product
 */
export const updateProductStatus = async (id: string, status: string): Promise<Product> => {
  // Start timing the request (dev only)
  const startTime = __DEV__ ? Date.now() : 0;

  try {
    // Verify and format the ID
    if (!id || typeof id !== 'string') {
      throw new Error(`Invalid product ID: ${id}. Must be a non-empty string.`);
    }

    // Ensure the ID is properly formatted
    const productId = id.trim();

    // Only log in development mode
    
      // console.log(`[API:products] Updating product ${productId} status to: ${status}`);
      // console.log(`[API:products] Product ID type: ${typeof productId}, length: ${productId.length}`);
    
      // Log ID format to help debug UUID issues
      if (productId.includes('-')) {
        console.log(`[API:products] ID appears to be a UUID format: ${productId}`);
      } else {
        console.log(`[API:products] ID does not appear to be in UUID format: ${productId}`);
      }
    // Validate status
    const validStatuses = ['available', 'sold', 'archived', 'reserved', 'hidden', 'pending'];
    if (!validStatuses.includes(status.toLowerCase())) {
      throw new Error(`Invalid product status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Format the status as lowercase to match API requirements
    const statusParam = status.toLowerCase();

    // Make API call with query parameter as specified in the API documentation
    const url = `${API_URL}/api/products/${productId}/status?status=${statusParam}`;

    if (__DEV__) {
      console.log(`[API:products] Making PATCH request to: ${url}`);
    }

    // Import Auth from Amplify inside the function to avoid circular dependencies
    const { Auth } = require('aws-amplify');

    // Get the current authenticated session to retrieve the JWT token
    const currentSession = await Auth.currentSession();
    const token = currentSession.getIdToken().getJwtToken();

    // Make the API request
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      // No body needed as we're using query parameters
    });

    if (__DEV__) {
      console.log(`[API:products] Response status: ${response.status}`);
    }

    // Check for success
    if (!response.ok) {
      // Try to get detailed error information
      let errorText;
      try {
        errorText = await response.text();

        // Only log in development mode
        if (__DEV__) {
          console.log(`[API:products] Error response text: ${errorText}`);

          // Try to parse as JSON if possible
          try {
            const errorJson = JSON.parse(errorText);
            console.log('[API:products] Error JSON:', errorJson);
          } catch (jsonError) {
            // Not JSON, that's fine
          }
        }
      } catch (textError) {
        errorText = 'Could not extract error details';
      }

      throw new Error(`Failed to update product status: ${response.status} - ${errorText}`);
    }

    // Parse the response
    const updatedProduct = await response.json();

    // Only log in development mode
    if (__DEV__) {
      console.log('[API:products] Updated product:', JSON.stringify(updatedProduct, null, 2));

      // Performance tracking
      const endTime = Date.now();
      console.log(`[API:products] updateProductStatus took ${endTime - startTime}ms`);
    }

    // Clear any cached data for this product
    await clearProductCache(productId);

    return processProductImages(updatedProduct);
  } catch (error) {
    console.error('[API:products] Error updating product status:', error);

    // For performance monitoring in dev mode
    if (__DEV__) {
      const endTime = Date.now();
      console.log(`[API:products] updateProductStatus failed after ${endTime - startTime}ms`);
    }

    throw error;
  }
};

/**
 * Delete a product by ID
 * @param id Product ID to delete
 * @returns Promise resolving to true if deletion was successful
 */
export const deleteProduct = async (id: string): Promise<boolean> => {
  // Start timing the request (dev only)
  const startTime = __DEV__ ? Date.now() : 0;

  try {
    // Verify and format the ID
    if (!id || typeof id !== 'string') {
      throw new Error(`Invalid product ID: ${id}. Must be a non-empty string.`);
    }

    // Ensure the ID is properly formatted
    const productId = id.trim();

    // Only log in development mode
    if (__DEV__) {
      console.log(`[API:products] Deleting product ${productId}`);
      console.log(`[API:products] Product ID type: ${typeof productId}, length: ${productId.length}`);
    }

    // Make API call to delete the product
    const url = `${API_URL}/api/products/${productId}`;

    if (__DEV__) {
      console.log(`[API:products] Making DELETE request to: ${url}`);
    }

    // Import Auth from Amplify inside the function to avoid circular dependencies
    const { Auth } = require('aws-amplify');

    // Get the current authenticated session to retrieve the JWT token
    const currentSession = await Auth.currentSession();
    const token = currentSession.getIdToken().getJwtToken();

    // Make the API request
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (__DEV__) {
      console.log(`[API:products] Delete response status: ${response.status}`);
    }

    // Check for success
    if (!response.ok) {
      // Try to get detailed error information
      let errorText;
      try {
        errorText = await response.text();

        // Only log in development mode
        if (__DEV__) {
          console.log(`[API:products] Error response text: ${errorText}`);
        }
      } catch (textError) {
        errorText = 'Could not extract error details';
      }

      throw new Error(`Failed to delete product: ${response.status} - ${errorText}`);
    }

    // Only log in development mode
    if (__DEV__) {
      // Performance tracking
      const endTime = Date.now();
      console.log(`[API:products] deleteProduct took ${endTime - startTime}ms`);
    }

    // Clear any cached data for this product
    await clearProductCache(productId);

    return true;
  } catch (error) {
    console.error('[API:products] Error deleting product:', error);

    // For performance monitoring in dev mode
    if (__DEV__) {
      const endTime = Date.now();
      console.log(`[API:products] deleteProduct failed after ${endTime - startTime}ms`);
    }

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
  updateProductStatus,
  clearProductCache,
  deleteProduct,
};

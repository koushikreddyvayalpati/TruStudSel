/**
 * Products API Service
 * 
 * This service handles communication with the backend products API endpoints.
 */
import { 
  PRODUCTS_API_URL, 
  fetchWithTimeout, 
  handleResponse,
  getAuthenticatedOptions,
  API_URL 
} from './config';
import { processProductImages } from '../utils/imageHelpers';

// Product types
export interface Product {
  id: number;
  name: string;
  price: string;
  image: string;
  condition: string;
  type: string;
  description: string;
  seller: {
    id: string;
    username: string;
    name: string;
    university?: string;
  };
  createdAt: string;
  updatedAt: string;
  images?: string[];
  imageUrls?: string[]; // Full S3 URLs
  primaryImage?: string;
  additionalImages?: string[];
  category?: string;
  isAvailable?: boolean;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  type?: string;
  sortBy?: 'price-asc' | 'price-desc' | 'newest' | 'oldest';
  university?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Interface for product creation with pre-uploaded images
 */
export interface CreateProductWithImagesRequest {
  name: string;
  category: string;
  description: string;
  price: string;
  email: string;
  city: string;
  zipcode: string;
  university: string;
  productage: string;
  sellingtype: string;
  imageFilenames: string[];
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
 * Get a single product by ID
 */
export const getProductById = async (productId: number): Promise<Product> => {
  const response = await fetchWithTimeout(
    `${PRODUCTS_API_URL}/${productId}`,
    { method: 'GET' }
  );
  
  const product = await handleResponse<Product>(response);
  return processProductImages(product);
};

/**
 * Create a new product listing
 */
export const createProduct = async (
  token: string,
  productData: Omit<Product, 'id' | 'seller' | 'createdAt' | 'updatedAt'>
): Promise<Product> => {
  const options = getAuthenticatedOptions(token, {
    method: 'POST',
    body: JSON.stringify(productData),
  });
  
  const response = await fetchWithTimeout(
    PRODUCTS_API_URL,
    options
  );
  
  return handleResponse<Product>(response);
};

/**
 * Update an existing product
 */
export const updateProduct = async (
  token: string,
  productId: number,
  productData: Partial<Product>
): Promise<Product> => {
  const options = getAuthenticatedOptions(token, {
    method: 'PUT',
    body: JSON.stringify(productData),
  });
  
  const response = await fetchWithTimeout(
    `${PRODUCTS_API_URL}/${productId}`,
    options
  );
  
  return handleResponse<Product>(response);
};

/**
 * Delete a product
 */
export const deleteProduct = async (token: string, productId: number): Promise<void> => {
  const options = getAuthenticatedOptions(token, {
    method: 'DELETE',
  });
  
  const response = await fetchWithTimeout(
    `${PRODUCTS_API_URL}/${productId}`,
    options
  );
  
  return handleResponse<void>(response);
};

/**
 * Get user's own products
 */
export const getUserProducts = async (token: string): Promise<ProductListResponse> => {
  const options = getAuthenticatedOptions(token);
  
  const response = await fetchWithTimeout(
    `${PRODUCTS_API_URL}/user`,
    options
  );
  
  const result = await handleResponse<ProductListResponse>(response);
  
  // Process all products to add full image URLs
  result.products = result.products.map(product => processProductImages(product));
  
  return result;
};

/**
 * Add a product to wishlist
 */
export const addToWishlist = async (token: string, productId: number): Promise<void> => {
  const options = getAuthenticatedOptions(token, {
    method: 'POST',
  });
  
  const response = await fetchWithTimeout(
    `${PRODUCTS_API_URL}/${productId}/wishlist`,
    options
  );
  
  return handleResponse<void>(response);
};

/**
 * Remove a product from wishlist
 */
export const removeFromWishlist = async (token: string, productId: number): Promise<void> => {
  const options = getAuthenticatedOptions(token, {
    method: 'DELETE',
  });
  
  const response = await fetchWithTimeout(
    `${PRODUCTS_API_URL}/${productId}/wishlist`,
    options
  );
  
  return handleResponse<void>(response);
};

/**
 * Get user's wishlist
 */
export const getWishlist = async (token: string): Promise<ProductListResponse> => {
  const options = getAuthenticatedOptions(token);
  
  const response = await fetchWithTimeout(
    `${PRODUCTS_API_URL}/wishlist`,
    options
  );
  
  const result = await handleResponse<ProductListResponse>(response);
  
  // Process all wishlist products to add full image URLs
  result.products = result.products.map(product => processProductImages(product));
  
  return result;
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
    
    // For successful responses
    if (response.ok) {
      try {
        const responseText = await response.text();
        console.log('[API:products] Raw response text:', responseText.length > 200 
          ? responseText.substring(0, 200) + '...' 
          : responseText);
        
        // Try to parse as JSON
        const result = JSON.parse(responseText) as Product;
        
        // Process the product to add full image URLs
        const processedProduct = processProductImages(result);
        
        console.log('[API:products] Product created successfully:', 
          JSON.stringify({
            id: processedProduct.id,
            name: processedProduct.name,
            images: processedProduct.images?.length,
            imageUrls: processedProduct.imageUrls
          })
        );
        
        return processedProduct;
      } catch (parseError) {
        console.error('[API:products] Error parsing response as JSON:', parseError);
        throw new Error('Failed to parse product creation response');
      }
    } else {
      // For error responses
      try {
        const errorText = await response.text();
        console.error('[API:products] Server error response:', errorText);
        throw new Error(`Server error: ${response.status} ${response.statusText} - ${errorText.substring(0, 100)}`);
      } catch (textError) {
        console.error('[API:products] Could not read error response:', textError);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
    }
  } catch (error) {
    console.error('[API:products] Error creating product:', error);
    if (error instanceof Error) {
      console.error('[API:products] Error name:', error.name);
      console.error('[API:products] Error message:', error.message);
      console.error('[API:products] Error stack:', error.stack);
    }
    throw error instanceof Error 
      ? error 
      : new Error('Failed to create product');
  }
};

export default {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getUserProducts,
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  createProductWithImageFilenames,
}; 
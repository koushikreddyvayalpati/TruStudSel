/**
 * Products API Service
 * 
 * This service handles communication with the backend products API endpoints.
 */
import { 
  PRODUCTS_API_URL, 
  fetchWithTimeout, 
  handleResponse,
  getAuthenticatedOptions 
} from './config';

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
  
  return handleResponse<ProductListResponse>(response);
};

/**
 * Get a single product by ID
 */
export const getProductById = async (productId: number): Promise<Product> => {
  const response = await fetchWithTimeout(
    `${PRODUCTS_API_URL}/${productId}`,
    { method: 'GET' }
  );
  
  return handleResponse<Product>(response);
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
  
  return handleResponse<ProductListResponse>(response);
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
  
  return handleResponse<ProductListResponse>(response);
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
}; 
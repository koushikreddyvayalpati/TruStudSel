/**
 * Centralized exports for API services
 */
import config from './config';
import authApi from './auth';
import productsApi from './products';
import apiClient, { addAuthHeader, removeAuthHeader, API_CONFIG } from './apiClient';

// Export configuration
export * from './config';

// Export auth API
export * from './auth';
export { authApi };

// Export products API
export * from './products';
export { productsApi };

// Export API client utilities
export { apiClient, addAuthHeader, removeAuthHeader, API_CONFIG };

// Export the entire API as a single object
export default {
  config,
  auth: authApi,
  products: productsApi,
  client: apiClient,
}; 
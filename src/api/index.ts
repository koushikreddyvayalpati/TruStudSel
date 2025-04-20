/**
 * Centralized exports for API services
 */
import config from './config';
import authApi from './auth';
import productsApi from './products';
import usersApi from './users';
import fileUploadApi from './fileUpload';
import reviewsApi from './reviews';
import reportsApi from './reports';
import apiClient, { addAuthHeader, removeAuthHeader, API_CONFIG } from './apiClient';

// Export configuration
export * from './config';

// Export auth API
export * from './auth';
export { authApi };

// Export products API
export * from './products';
export { productsApi };

// Export users API
export * from './users';
export { usersApi };

// Export file upload API
export * from './fileUpload';
export { fileUploadApi };

// Export reviews API
export * from './reviews';
export { reviewsApi };

// Export reports API
export * from './reports';

// Export API client utilities
export { apiClient, addAuthHeader, removeAuthHeader, API_CONFIG };

// Export the entire API as a single object
export default {
  config,
  auth: authApi,
  products: productsApi,
  users: usersApi,
  fileUpload: fileUploadApi,
  reviews: reviewsApi,
  reports: reportsApi,
  client: apiClient,
};

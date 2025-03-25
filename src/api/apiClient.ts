/**
 * API client configuration using Axios
 * 
 * This module provides a pre-configured Axios instance for making API requests.
 * It includes:
 * - Base URL configuration
 * - Request/response interceptors
 * - Default timeout settings
 * - Authentication token handling
 * - Error handling
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, DEFAULT_HEADERS } from './config';
import { API_TIMEOUT } from '../constants';

// API Configuration
const API_CONFIG = {
  API_BASE_URL: API_URL,
  TIMEOUT: API_TIMEOUT,
  TOKEN_KEY: '@auth:token',
  REFRESH_TOKEN_KEY: '@auth:refreshToken',
  REFRESH_TOKEN_ENDPOINT: '/auth/refresh',
  ENABLE_TOKEN_REFRESH: true,
};

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_CONFIG.API_BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: DEFAULT_HEADERS,
});

// Request interceptor for adding auth token and other headers
apiClient.interceptors.request.use(
  async (config) => {
    // Get token from storage (if exists)
    const token = await AsyncStorage.getItem(API_CONFIG.TOKEN_KEY);
    
    // If token exists, add to headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add any additional headers or request transformations here
    
    return config;
  },
  (error) => {
    // Handle request errors
    console.error('API request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling common response cases
apiClient.interceptors.response.use(
  (response) => {
    // Process successful responses
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized errors (token expired)
    if (
      error.response &&
      error.response.status === 401 && 
      !originalRequest._retry &&
      API_CONFIG.ENABLE_TOKEN_REFRESH
    ) {
      originalRequest._retry = true;
      
      try {
        // Get refresh token from storage
        const refreshToken = await AsyncStorage.getItem(API_CONFIG.REFRESH_TOKEN_KEY);
        
        if (refreshToken) {
          // Call refresh token endpoint
          const response = await axios.post(
            `${API_CONFIG.API_BASE_URL}${API_CONFIG.REFRESH_TOKEN_ENDPOINT}`,
            { refreshToken }
          );
          
          const { token } = response.data;
          
          // Store the new token
          await AsyncStorage.setItem(API_CONFIG.TOKEN_KEY, token);
          
          // Update the Authorization header
          originalRequest.headers.Authorization = `Bearer ${token}`;
          
          // Retry the original request
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        
        // Handle refresh token failure (usually logout)
        await AsyncStorage.removeItem(API_CONFIG.TOKEN_KEY);
        await AsyncStorage.removeItem(API_CONFIG.REFRESH_TOKEN_KEY);
        
        // In React Native, we would typically use an event emitter or context
        // to notify the app about authentication failures
      }
    }
    
    // Handle API-specific error formats
    if (error.response && error.response.data) {
      // Format error message from response if available
      const apiError = error.response.data;
      
      if (apiError.message) {
        error.message = apiError.message;
      } else if (apiError.error) {
        error.message = apiError.error;
      }
      
      // Add any additional error metadata
      error.details = apiError.details || apiError.errors || null;
      error.code = apiError.code || error.response.status;
    }
    
    // Handle network errors
    if (error.message === 'Network Error') {
      error.isNetworkError = true;
    }
    
    // Handle timeout errors
    if (error.code === 'ECONNABORTED') {
      error.isTimeoutError = true;
    }
    
    return Promise.reject(error);
  }
);

// Add additional helper methods to the client
export const addAuthHeader = (token: string) => {
  apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
};

export const removeAuthHeader = () => {
  delete apiClient.defaults.headers.common.Authorization;
};

// Export API config for use in other modules
export { API_CONFIG };

export default apiClient; 
/**
 * API Configuration
 */
import { API_TIMEOUT } from '../constants';
import { Platform } from 'react-native';

// Determine API base URL based on environment
const isDevelopment = __DEV__;

// In development, use localhost for the emulator
// Note: On Android emulator, localhost refers to the emulator itself, not your machine
// Use 10.0.2.2 for Android emulator to reach your machine's localhost
const devBaseUrl = Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';

// API base URLs
export const API_URL = isDevelopment ? devBaseUrl : 'https://api.trustudsel.com';

// Log the base URL for debugging
console.log(`[API:config] Using base API URL: ${API_URL} (${isDevelopment ? 'development' : 'production'})`);
console.log(`[API:config] Platform: ${Platform.OS}`);

export const AUTH_API_URL = `${API_URL}/auth`;
export const PRODUCTS_API_URL = `${API_URL}/products`;
export const MESSAGES_API_URL = `${API_URL}/messages`;
export const USERS_API_URL = `${API_URL}/users`;

// Default request headers
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Default fetch options
export const DEFAULT_OPTIONS: RequestInit = {
  headers: DEFAULT_HEADERS,
};

// API request timeout utility
export const fetchWithTimeout = async (url: string, options: RequestInit, timeout = API_TIMEOUT): Promise<Response> => {
  console.log(`[API:config] fetchWithTimeout called for URL: ${url}`);
  console.log(`[API:config] Request method: ${options.method || 'GET'}`);
  console.log(`[API:config] Timeout set to: ${timeout}ms`);
  
  const controller = new AbortController();
  const { signal } = controller;
  
  const timeoutId = setTimeout(() => {
    console.warn(`[API:config] Request timeout reached for ${url} after ${timeout}ms`);
    controller.abort();
  }, timeout);
  
  try {
    console.log('[API:config] Starting fetch request...');
    const response = await fetch(url, { ...options, signal });
    clearTimeout(timeoutId);
    
    console.log(`[API:config] Fetch response received with status: ${response.status} ${response.statusText}`);
    return response;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    
    console.error('[API:config] Fetch error:', error);
    
    if (error instanceof Error) {
      console.error('[API:config] Error name:', error.name);
      console.error('[API:config] Error message:', error.message);
      
      if (error.name === 'AbortError') {
        console.error(`[API:config] Request to ${url} was aborted due to timeout`);
        throw new Error('Request timeout');
      }
      
      if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
        console.error('[API:config] Network request failed - possible connectivity issue');
      }
    }
    
    throw error;
  }
};

// API response handler
export const handleResponse = async <T>(response: Response): Promise<T> => {
  console.log(`[API:config] handleResponse called with status: ${response.status} ${response.statusText}`);
  
  if (!response.ok) {
    console.error(`[API:config] Response not OK: ${response.status} ${response.statusText}`);
    try {
      const errorData = await response.json();
      console.error('[API:config] Error response data:', JSON.stringify(errorData));
      throw new Error(
        errorData?.message || `API error: ${response.status} ${response.statusText}`
      );
    } catch (jsonParseError) {
      console.error('[API:config] Failed to parse error response as JSON:', jsonParseError);
      // If we can't parse JSON, try to get the text
      try {
        const errorText = await response.text();
        console.error('[API:config] Error response text:', errorText);
        throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText.substring(0, 100)}`);
      } catch (textError) {
        console.error('[API:config] Failed to get error response text:', textError);
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
    }
  }
  
  // For 204 No Content responses
  if (response.status === 204) {
    console.log('[API:config] Received 204 No Content response');
    return null as T;
  }
  
  try {
    const jsonData = await response.json();
    console.log('[API:config] Successfully parsed response JSON', 
      typeof jsonData === 'object' 
        ? `with keys: ${Object.keys(jsonData).join(', ')}` 
        : `of type: ${typeof jsonData}`
    );
    return jsonData;
  } catch (error) {
    console.error('[API:config] Error parsing successful response as JSON:', error);
    throw new Error('Failed to parse API response as JSON');
  }
};

// Generate authenticated fetch options
export const getAuthenticatedOptions = (token: string, options: RequestInit = {}): RequestInit => {
  const headers = {
    ...DEFAULT_HEADERS,
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };
  
  return {
    ...DEFAULT_OPTIONS,
    ...options,
    headers,
  };
};

export default {
  API_URL,
  AUTH_API_URL,
  PRODUCTS_API_URL,
  MESSAGES_API_URL,
  USERS_API_URL,
  DEFAULT_HEADERS,
  DEFAULT_OPTIONS,
  fetchWithTimeout,
  handleResponse,
  getAuthenticatedOptions,
}; 
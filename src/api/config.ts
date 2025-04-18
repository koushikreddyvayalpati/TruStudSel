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
const devBaseUrl = Platform.OS === 'android' ? 'https://backendtrustudsel-uannv243ua-uc.a.run.app' : 'http://localhost:8080';

// API base URLs
export const API_URL = isDevelopment ? devBaseUrl : 'https://backendtrustudsel-uannv243ua-uc.a.run.app';

// Log the base URL for debugging
// console.log(`[API:config] Using base API URL: ${API_URL} (${isDevelopment ? 'development' : 'production'})`);
// console.log(`[API:config] Platform: ${Platform.OS}`);

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
    if (__DEV__) {
      console.warn(`[API:config] Request timeout reached for ${url} after ${timeout}ms`);
    }
    controller.abort();
  }, timeout);

  try {
    console.log('[API:config] Starting fetch request...');
    const response = await fetch(url, { ...options, signal });
    clearTimeout(timeoutId);

    if (__DEV__) {
      console.log(`[API:config] Fetch response received with status: ${response.status} ${response.statusText}`);
    }
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

/**
 * Handle API response and parse JSON or handle errors
 */
export const handleResponse = async <T>(response: Response): Promise<T> => {
  console.log(`[API:config] handleResponse called with status: ${response.status}`);

  if (!response.ok) {
    console.log(`[API:config] Response not OK: ${response.status}`);

    // Try to get error information from the response
    try {
      // Clone response to avoid "Already read" errors
      const clonedResponse = response.clone();

      let errorData: any;
      try {
        // First try to parse as JSON
        errorData = await clonedResponse.json();
        console.log('[API:config] Error response data:', errorData);
      } catch (jsonError) {
        // If JSON parse fails, get as text
        try {
          const textResponse = await response.text();
          console.log('[API:config] Error response text:', textResponse);
          errorData = { message: textResponse };
        } catch (textError) {
          console.log('[API:config] Failed to get error response text:', textError);
          errorData = { message: 'Failed to parse error response' };
        }
      }

      throw new Error(`API error: ${response.status}${errorData.message ? ` - ${errorData.message}` : ''}`);
    } catch (error) {
      console.log('[API:config] Failed to parse error response as JSON:', error);
      throw new Error(`API error: ${response.status}`);
    }
  }

  // Check content-type header to ensure it's JSON
  const contentType = response.headers.get('content-type');
  console.log('[API:config] Response Content-Type:', contentType);

  if (contentType && contentType.includes('application/json')) {
    try {
      const jsonData = await response.json();
      const keys = jsonData && typeof jsonData === 'object' ? Object.keys(jsonData) : ['<not-an-object>'];
      console.log('[API:config] Successfully parsed response JSON with keys:', keys.join(', '));

      // Check for common error patterns in the response that might cause issues
      if (jsonData && jsonData.error) {
        console.warn('[API:config] Response contains error field:', jsonData.error);
      }

      // Special handling for array responses
      if (Array.isArray(jsonData)) {
        console.log(`[API:config] Response is an array with ${jsonData.length} items`);

        // Check if list is empty
        if (jsonData.length === 0) {
          console.log('[API:config] Response is an empty array');
        }

        // Check if each item has an id (common issue)
        if (jsonData.length > 0 && !jsonData[0].id) {
          console.warn('[API:config] First array item is missing id property');
        }
      } else if (jsonData && typeof jsonData === 'object') {
        // Check if it might be a non-standard collection that could cause iteration problems
        if (jsonData.products && typeof jsonData.products === 'object' && !Array.isArray(jsonData.products)) {
          console.warn(`[API:config] Response has products property that is not an array: ${typeof jsonData.products}`);
          console.log(`[API:config] Products object prototype: ${Object.getPrototypeOf(jsonData.products)}`);

          try {
            // Try to examine what's in the products object
            if (Object.keys(jsonData.products).length > 0) {
              console.log(`[API:config] Products object keys (first 5): ${Object.keys(jsonData.products).slice(0, 5).join(', ')}`);
              const firstKey = Object.keys(jsonData.products)[0];
              console.log(`[API:config] First product value type: ${typeof jsonData.products[firstKey]}`);
            } else {
              console.log('[API:config] Products object is empty');
            }
          } catch (iterError) {
            console.warn(`[API:config] Failed to iterate products object: ${iterError instanceof Error ? iterError.message : 'Unknown error'}`);

            // Log specific info about ListIterators error
            if (iterError instanceof Error && iterError.message.includes('ListIterators are not supported')) {
              console.warn('[API:config] ListIterators error detected. This could be from a Java List returned in the API response.');
              console.log('[API:config] Will attempt to convert non-iterable object in the API consumer code.');
            }
          }
        }
      }

      return jsonData as T;
    } catch (error) {
      console.error('[API:config] Failed to parse JSON response:', error);
      throw new Error(`Failed to parse response: ${error}`);
    }
  } else {
    console.warn('[API:config] Response is not JSON. Content-Type:', contentType);
    try {
      const text = await response.text();
      console.log('[API:config] Text response (first 100 chars):', text.substring(0, 100));

      // Try to parse as JSON anyway (sometimes content-type is wrong)
      try {
        const jsonData = JSON.parse(text);
        console.log('[API:config] Successfully parsed text as JSON despite content-type');
        return jsonData as T;
      } catch (e) {
        // Not JSON, return as is
        return text as unknown as T;
      }
    } catch (error) {
      console.error('[API:config] Failed to read response text:', error);
      throw new Error(`Failed to read response: ${error}`);
    }
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

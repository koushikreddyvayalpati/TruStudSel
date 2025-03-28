/**
 * API Configuration
 */
import { API_TIMEOUT } from '../constants';

// API base URLs
export const API_URL = 'https://api.trustudsel.com'; // Replace with your actual API URL
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
  const controller = new AbortController();
  const { signal } = controller;
  
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { ...options, signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
};

// API response handler
export const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.message || `API error: ${response.status} ${response.statusText}`
    );
  }
  
  // For 204 No Content responses
  if (response.status === 204) {
    return null as T;
  }
  
  return response.json();
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
/**
 * useApi hook for handling API requests
 * 
 * This hook provides a convenient way to make API requests with:
 * - Loading state tracking
 * - Error handling
 * - Response caching
 * - Request cancelation
 * - Automatic retries
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import axios, { AxiosRequestConfig, AxiosResponse, AxiosError, CancelTokenSource } from 'axios';
import apiClient from '../api/apiClient';

export type ApiState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
  success: boolean;
};

export type UseApiOptions = {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  immediate?: boolean;
  initialData?: any;
  retry?: boolean;
  retryCount?: number;
  retryDelay?: number;
  cacheKey?: string;
  cacheDuration?: number;
};

export type UseApiReturn<T, P = any> = {
  // State
  data: T | null;
  loading: boolean;
  error: Error | null;
  success: boolean;
  
  // API methods
  request: (params?: P, config?: AxiosRequestConfig) => Promise<AxiosResponse<T>>;
  cancel: () => void;
  reset: () => void;
  setData: (data: T | null) => void;
  setError: (error: Error | null) => void;
};

// Simple in-memory cache
const cache: Record<string, { data: any; timestamp: number }> = {};

/**
 * Hook for making API requests with state management
 * @param url - API endpoint URL
 * @param method - HTTP method
 * @param options - Additional options
 * @returns API state and methods
 */
export function useApi<T = any, P = any>(
  url: string,
  method: 'get' | 'post' | 'put' | 'delete' | 'patch' = 'get',
  options: UseApiOptions = {}
): UseApiReturn<T, P> {
  const {
    onSuccess,
    onError,
    immediate = false,
    initialData = null,
    retry = false,
    retryCount = 3,
    retryDelay = 1000,
    cacheKey,
    cacheDuration = 5 * 60 * 1000, // 5 minutes
  } = options;

  const [state, setState] = useState<ApiState<T>>({
    data: initialData,
    loading: immediate,
    error: null,
    success: false,
  });

  const cancelTokenRef = useRef<CancelTokenSource | null>(null);
  const retryCountRef = useRef<number>(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Check if there's cached data for this request
  useEffect(() => {
    if (cacheKey && cache[cacheKey]) {
      const { data, timestamp } = cache[cacheKey];
      const isExpired = Date.now() - timestamp > cacheDuration;
      
      if (!isExpired) {
        setState({
          data,
          loading: false,
          error: null,
          success: true,
        });
      }
    }
  }, [cacheKey, cacheDuration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel('Request canceled due to component unmount');
      }
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Make the API request
  const request = useCallback(
    async (params?: P, config?: AxiosRequestConfig) => {
      // Cancel any existing request
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel('Request superseded by new request');
      }
      
      // Create a new cancel token
      cancelTokenRef.current = axios.CancelToken.source();
      
      // Set initial state
      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
      }));
      
      try {
        // Check cache first
        if (method === 'get' && cacheKey && cache[cacheKey]) {
          const { data, timestamp } = cache[cacheKey];
          const isExpired = Date.now() - timestamp > cacheDuration;
          
          if (!isExpired) {
            if (isMountedRef.current) {
              setState({
                data,
                loading: false,
                error: null,
                success: true,
              });
            }
            return { data } as AxiosResponse<T>;
          }
        }
        
        // Make the API request
        let response: AxiosResponse<T>;
        
        const requestConfig: AxiosRequestConfig = {
          ...config,
          cancelToken: cancelTokenRef.current.token,
        };
        
        switch (method) {
          case 'get':
            response = await apiClient.get<T>(url, {
              ...requestConfig,
              params,
            });
            break;
          case 'post':
            response = await apiClient.post<T>(url, params, requestConfig);
            break;
          case 'put':
            response = await apiClient.put<T>(url, params, requestConfig);
            break;
          case 'delete':
            response = await apiClient.delete<T>(url, {
              ...requestConfig,
              params,
            });
            break;
          case 'patch':
            response = await apiClient.patch<T>(url, params, requestConfig);
            break;
          default:
            throw new Error(`Unsupported method: ${method}`);
        }
        
        // Cache the response if applicable
        if (method === 'get' && cacheKey) {
          cache[cacheKey] = {
            data: response.data,
            timestamp: Date.now(),
          };
        }
        
        // Update state on success
        if (isMountedRef.current) {
          setState({
            data: response.data,
            loading: false,
            error: null,
            success: true,
          });
        }
        
        // Call success callback if provided
        if (onSuccess) {
          onSuccess(response.data);
        }
        
        // Reset retry count
        retryCountRef.current = 0;
        
        return response;
      } catch (error) {
        // Skip error handling for canceled requests
        if (axios.isCancel(error)) {
          return { data: null } as AxiosResponse<T>;
        }
        
        const axiosError = error as AxiosError;
        
        // Handle retry logic
        if (retry && retryCountRef.current < retryCount) {
          retryCountRef.current += 1;
          
          retryTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              request(params, config);
            }
          }, retryDelay);
          
          return { data: null } as AxiosResponse<T>;
        }
        
        // Create error object
        const errorObj = new Error(
          axiosError.response?.data && typeof axiosError.response.data === 'object' && 'message' in axiosError.response.data
            ? (axiosError.response.data as any).message
            : axiosError.message || 'Unknown error'
        );
        
        // Update state on error
        if (isMountedRef.current) {
          setState({
            data: null,
            loading: false,
            error: errorObj,
            success: false,
          });
        }
        
        // Call error callback if provided
        if (onError) {
          onError(errorObj);
        }
        
        throw errorObj;
      }
    },
    [url, method, cacheKey, cacheDuration, onSuccess, onError, retry, retryCount, retryDelay]
  );
  
  // Cancel the current request
  const cancel = useCallback(() => {
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel('Request canceled by user');
      cancelTokenRef.current = null;
    }
  }, []);
  
  // Reset the state
  const reset = useCallback(() => {
    setState({
      data: initialData,
      loading: false,
      error: null,
      success: false,
    });
  }, [initialData]);
  
  // Manual data setter
  const setData = useCallback((data: T | null) => {
    setState((prev) => ({
      ...prev,
      data,
      success: !!data,
    }));
  }, []);
  
  // Manual error setter
  const setError = useCallback((error: Error | null) => {
    setState((prev) => ({
      ...prev,
      error,
      success: false,
    }));
  }, []);
  
  // Make the initial request if immediate is true
  useEffect(() => {
    if (immediate) {
      request();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  return {
    ...state,
    request,
    cancel,
    reset,
    setData,
    setError,
  };
}
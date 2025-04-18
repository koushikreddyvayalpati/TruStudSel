/**
 * useLocalStorage hook for AsyncStorage state management
 *
 * This hook provides a React state-like interface for AsyncStorage operations:
 * - Load and store state in AsyncStorage
 * - Type-safe interface
 * - Automatic JSON serialization/deserialization
 * - Lazy initialization
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Hook for using AsyncStorage with a React state-like interface
 * @param key - AsyncStorage key
 * @param initialValue - Initial value or initializer function
 * @returns Tuple with state value and setter function
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T)
): [T, (value: T | ((val: T) => T)) => Promise<void>, boolean, Error | null] {
  // Initialize state and loading/error indicators
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Keep track of whether this is the first render
  const initialRender = useRef(true);

  // Load value from AsyncStorage on mount
  useEffect(() => {
    const getStoredValue = async () => {
      try {
        setLoading(true);
        setError(null);

        const item = await AsyncStorage.getItem(key);

        if (item !== null) {
          // If value exists in storage, parse it and update state
          setStoredValue(JSON.parse(item));
        } else if (initialRender.current) {
          // If no value in storage but it's the first render, initialize with initial value
          const value = initialValue instanceof Function ? initialValue() : initialValue;

          // Store the initial value in AsyncStorage
          await AsyncStorage.setItem(key, JSON.stringify(value));
        }
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        setLoading(false);
        initialRender.current = false;
      }
    };

    getStoredValue();
  }, [key, initialValue]);

  // Function to update storage and state
  const setValue = useCallback(
    async (value: T | ((val: T) => T)) => {
      try {
        // Handle both direct values and update functions
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;

        // Update state with new value
        setStoredValue(valueToStore);

        // Store in AsyncStorage
        await AsyncStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
        throw e;
      }
    },
    [key, storedValue]
  );

  // Return state, setter, loading and error
  return [storedValue, setValue, loading, error];
}

/**
 * Hook for using AsyncStorage with object values
 * @param key - AsyncStorage key
 * @param initialValue - Initial object value or initializer function
 * @returns Object with value, setter, loading status, error, and additional methods
 */
export function useLocalStorageObject<T extends object>(
  key: string,
  initialValue: T | (() => T)
): {
  value: T;
  setValue: (value: T | ((val: T) => T)) => Promise<void>;
  updateValue: <K extends keyof T>(key: K, value: T[K] | ((val: T[K]) => T[K])) => Promise<void>;
  loading: boolean;
  error: Error | null;
  clearValue: () => Promise<void>;
} {
  const [value, setValue, loading, error] = useLocalStorage<T>(key, initialValue);

  // Method to update a specific property in the object
  const updateValue = useCallback(
    async <K extends keyof T>(
      propertyKey: K,
      propertyValue: T[K] | ((val: T[K]) => T[K])
    ) => {
      setValue((prev) => {
        const newValue = { ...prev };
        newValue[propertyKey] =
          propertyValue instanceof Function
            ? propertyValue(prev[propertyKey])
            : propertyValue;
        return newValue;
      });
    },
    [setValue]
  );

  // Method to clear the stored value
  const clearValue = useCallback(async () => {
    try {
      // Remove from AsyncStorage
      await AsyncStorage.removeItem(key);

      // Reset to initial value
      const initialValueResolved = initialValue instanceof Function ? initialValue() : initialValue;
      setValue(initialValueResolved);
    } catch (e) {
      throw e instanceof Error ? e : new Error(String(e));
    }
  }, [key, initialValue, setValue]);

  // Return an object with value, setter, and helpers
  return {
    value,
    setValue,
    updateValue,
    loading,
    error,
    clearValue,
  };
}

/**
 * Hook for working with a simple AsyncStorage boolean flag
 * @param key - AsyncStorage key
 * @param initialValue - Initial boolean value
 * @returns Object with value, toggle, and set methods
 */
export function useLocalStorageFlag(
  key: string,
  initialValue = false
): {
  flag: boolean;
  loading: boolean;
  error: Error | null;
  toggle: () => Promise<void>;
  setFlag: (value: boolean) => Promise<void>;
} {
  const [flag, setFlag, loading, error] = useLocalStorage<boolean>(key, initialValue);

  // Toggle function
  const toggle = useCallback(async () => {
    setFlag((prev) => !prev);
  }, [setFlag]);

  return {
    flag,
    loading,
    error,
    toggle,
    setFlag,
  };
}

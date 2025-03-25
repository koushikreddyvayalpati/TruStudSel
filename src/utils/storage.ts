/**
 * Storage utility functions
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Save a value to local storage
 * @param key - Storage key
 * @param value - Value to store (will be JSON stringified)
 * @returns Promise resolving when storage is complete
 */
export const storeData = async (key: string, value: any): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (error) {
    console.error('Error storing data:', error);
    throw error;
  }
};

/**
 * Retrieve a value from local storage
 * @param key - Storage key
 * @returns Promise resolving to the stored value or null if not found
 */
export const getData = async <T>(key: string): Promise<T | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error('Error retrieving data:', error);
    throw error;
  }
};

/**
 * Remove a value from local storage
 * @param key - Storage key
 * @returns Promise resolving when removal is complete
 */
export const removeData = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing data:', error);
    throw error;
  }
};

/**
 * Clear all local storage data
 * @returns Promise resolving when clear is complete
 */
export const clearAllData = async (): Promise<void> => {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.error('Error clearing data:', error);
    throw error;
  }
};

/**
 * Get all keys stored in local storage
 * @returns Promise resolving to array of keys
 */
export const getAllKeys = async (): Promise<readonly string[]> => {
  try {
    return await AsyncStorage.getAllKeys();
  } catch (error) {
    console.error('Error getting all keys:', error);
    throw error;
  }
};

/**
 * Store a token in local storage
 * @param key - Token key
 * @param token - Token value
 * @returns Promise resolving when storage is complete
 */
export const storeToken = async (key: string, token: string): Promise<void> => {
  return storeData(key, token);
};

/**
 * Get a token from local storage
 * @param key - Token key
 * @returns Promise resolving to the token or null if not found
 */
export const getToken = async (key: string): Promise<string | null> => {
  return getData<string>(key);
};

/**
 * Remove a token from local storage
 * @param key - Token key
 * @returns Promise resolving when removal is complete
 */
export const removeToken = async (key: string): Promise<void> => {
  return removeData(key);
};

export default {
  storeData,
  getData,
  removeData,
  clearAllData,
  getAllKeys,
  storeToken,
  getToken,
  removeToken,
}; 
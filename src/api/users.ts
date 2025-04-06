/**
 * User API Service
 * 
 * Handles all user profile related API operations
 */

import apiClient from './apiClient';
import { API_URL } from './config';

/**
 * Upload file to the server
 * @param file FormData containing the file to upload
 * @returns The uploaded file data including fileName
 */
export const uploadFile = async (formData: FormData) => {
  try {
    const response = await fetch(`${API_URL}/api/files/upload`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to upload file:', error);
    throw error;
  }
};

// User profile data interface - matches DynamoDB schema
export interface UserProfileData {
  email: string;
  name: string;
  university?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  mobile?: string;
  userphoto?: string;
  productsCategoriesIntrested?: string[] | null;
  productsListed?: string;
  productssold?: string;
  productswishlist?: string[];
}

/**
 * Create or update a user profile
 * @param userData User profile data object
 */
export const createUserProfile = async (userData: UserProfileData) => {
  try {
    // Using exact api path from the curl example
    const response = await apiClient.post(`${API_URL}/api/users`, userData);
    return response.data;
  } catch (error) {
    console.error('Failed to create user profile:', error);
    throw error;
  }
};

/**
 * Get user profile by email
 * @param userEmail User email to fetch
 */
export const fetchUserProfileById = async (userEmail: string) => {
  try {
    const response = await apiClient.get(`${API_URL}/api/users/${userEmail}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch user profile (Email: ${userEmail}):`, error);
    throw error;
  }
};

/**
 * Update user profile
 * @param userEmail User email to update
 * @param userData Updated user data
 */
export const updateUserProfileData = async (userEmail: string, userData: Partial<UserProfileData>) => {
  try {
    const response = await apiClient.put(`${API_URL}/api/users/${userEmail}`, userData);
    return response.data;
  } catch (error) {
    console.error(`Failed to update user profile (Email: ${userEmail}):`, error);
    throw error;
  }
};

export default {
  createUserProfile,
  fetchUserProfileById,
  updateUserProfileData,
  uploadFile
}; 
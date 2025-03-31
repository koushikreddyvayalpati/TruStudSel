/**
 * User API Service
 * 
 * Handles all user profile related API operations
 */

import apiClient from './apiClient';
import { USERS_API_URL } from './config';

// User profile data interface
export interface UserProfileData {
  fullName: string;
  email: string;
  university: string;
  city: string;
  zipcode: string;
  interestedCategories: string[];
  [key: string]: any; // For any additional fields
}

/**
 * Create or update a user profile
 * @param userData User profile data object
 */
export const createUserProfile = async (userData: UserProfileData) => {
  try {
    const response = await apiClient.post(USERS_API_URL, userData);
    return response.data;
  } catch (error) {
    console.error('Failed to create user profile:', error);
    throw error;
  }
};

/**
 * Get user profile by ID
 * @param userId User ID to fetch
 */
export const fetchUserProfileById = async (userId: string) => {
  try {
    const response = await apiClient.get(`${USERS_API_URL}/${userId}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch user profile (ID: ${userId}):`, error);
    throw error;
  }
};

/**
 * Update user profile
 * @param userId User ID to update
 * @param userData Updated user data
 */
export const updateUserProfileData = async (userId: string, userData: Partial<UserProfileData>) => {
  try {
    const response = await apiClient.put(`${USERS_API_URL}/${userId}`, userData);
    return response.data;
  } catch (error) {
    console.error(`Failed to update user profile (ID: ${userId}):`, error);
    throw error;
  }
};

export default {
  createUserProfile,
  fetchUserProfileById,
  updateUserProfileData
}; 
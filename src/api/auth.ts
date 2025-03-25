/**
 * Auth API Service
 * 
 * This service handles communication with the backend authentication API endpoints.
 * Note: This complements the Cognito authentication provided by AuthContext.
 */
import { 
  AUTH_API_URL, 
  DEFAULT_OPTIONS, 
  fetchWithTimeout, 
  handleResponse,
  getAuthenticatedOptions 
} from './config';

// Auth API response types
export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    email: string;
    name?: string;
    university?: string;
    stats?: {
      sold: number;
      purchased: number;
    };
  };
}

export interface RefreshTokenResponse {
  token: string;
}

export interface UserProfileResponse {
  id: string;
  username: string;
  email: string;
  name: string;
  university?: string;
  profileImage?: string;
  stats: {
    sold: number;
    purchased: number;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Login to backend service (not Cognito).
 * This would be used if you have a separate backend auth system.
 */
export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await fetchWithTimeout(
    `${AUTH_API_URL}/login`,
    {
      ...DEFAULT_OPTIONS,
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }
  );
  
  return handleResponse<LoginResponse>(response);
};

/**
 * Refresh authentication token
 */
export const refreshToken = async (refreshToken: string): Promise<RefreshTokenResponse> => {
  const response = await fetchWithTimeout(
    `${AUTH_API_URL}/refresh-token`,
    {
      ...DEFAULT_OPTIONS,
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }
  );
  
  return handleResponse<RefreshTokenResponse>(response);
};

/**
 * Get user profile from backend
 */
export const getUserProfile = async (token: string, userId: string): Promise<UserProfileResponse> => {
  const options = getAuthenticatedOptions(token);
  
  const response = await fetchWithTimeout(
    `${AUTH_API_URL}/users/${userId}/profile`,
    {
      ...options,
      method: 'GET',
    }
  );
  
  return handleResponse<UserProfileResponse>(response);
};

/**
 * Update user profile on backend
 */
export const updateUserProfile = async (
  token: string, 
  userId: string, 
  profileData: Partial<UserProfileResponse>
): Promise<UserProfileResponse> => {
  const options = getAuthenticatedOptions(token);
  
  const response = await fetchWithTimeout(
    `${AUTH_API_URL}/users/${userId}/profile`,
    {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(profileData),
    }
  );
  
  return handleResponse<UserProfileResponse>(response);
};

export default {
  login,
  refreshToken,
  getUserProfile,
  updateUserProfile,
}; 
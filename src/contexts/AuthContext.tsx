import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { Auth } from 'aws-amplify';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as PushNotificationHelper from '../utils/pushNotificationHelper';

// User data type
export interface UserAttributes {
  email: string;
  name?: string;
  university?: string;
  phone_number?: string;
  picture?: string;
  email_verified?: boolean;
  [key: string]: any; // For custom attributes
}

export interface UserData {
  username: string;
  email: string;
  name?: string;
  university?: string;
  city?: string;
  zipcode?: string;
  interestedCategories?: string[];
  isVerified?: boolean;
  profileImage?: string | null;
  stats?: {
    sold: number;
    purchased: number;
  };
  attributes?: UserAttributes;
}

// Auth state type
export type AuthState = {
  isAuthenticated: boolean;
  user: UserData | null;
  loading: boolean;
  error?: Error | null;
};

// Auth actions type
export type AuthActions = {
  signIn: (username: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, attributes: Record<string, string>) => Promise<any>;
  confirmSignUp: (username: string, code: string) => Promise<any>;
  resendConfirmationCode: (username: string) => Promise<any>;
  forgotPassword: (username: string) => Promise<any>;
  forgotPasswordSubmit: (username: string, code: string, newPassword: string) => Promise<any>;
  signOut: () => Promise<void>;
  updateUserInfo: (userData: Partial<UserData>) => void;
  updateUserAttributes: (attributes: Record<string, string>) => Promise<any>;
  refreshSession: () => Promise<void>;
};

// Combined auth context type
export type AuthContextType = AuthState & AuthActions;

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Auth state - ensure error is explicitly initialized
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
    error: null,
  });

  // Helper to generate state updates with proper error handling
  const updateState = (newState: Partial<AuthState>) => {
    setState(prev => ({
      ...prev,
      ...newState,
      // Ensure error is never undefined
      error: newState.error === undefined ? prev.error : newState.error,
    }));
  };

  // Helper to process user data from Cognito
  const processUserData = (cognitoUser: any): UserData => {
    // console.log('Processing Cognito user:', cognitoUser);

    // Extract email from attributes or username if it looks like an email
    let email = cognitoUser.attributes?.email || '';
    if (!email && cognitoUser.username && cognitoUser.username.includes('@')) {
      email = cognitoUser.username;
      console.log('Using username as email:', email);
    }

    const userData = {
      username: cognitoUser.username,
      email: email,
      name: cognitoUser.attributes?.name ||
            cognitoUser.attributes?.['custom:name'] ||
            cognitoUser.username,
      university: cognitoUser.attributes?.['custom:university'] || '',
      city: cognitoUser.attributes?.city || '',
      zipcode: cognitoUser.attributes?.zipcode || '',
      interestedCategories: cognitoUser.attributes?.interestedCategories || [],
      isVerified: cognitoUser.attributes?.email_verified || false,
      profileImage: cognitoUser.attributes?.picture || null,
      stats: {
        sold: 0, // Default values, replace with actual data if available
        purchased: 0,
      },
      attributes: cognitoUser.attributes,
    };

    // console.log('Processed user data:', userData);
    return userData;
  };

  // Check if user is already signed in
  const checkAuthState = useCallback(async () => {
    updateState({ loading: true, error: null });

    try {
      // Try to get basic user info from AsyncStorage for faster initial load
      const cachedUserData = await AsyncStorage.getItem('@cached_user_data');
      if (cachedUserData) {
        const parsedUserData = JSON.parse(cachedUserData);
        const { timestamp, userData } = parsedUserData;
        const isExpired = Date.now() - timestamp > 24 * 60 * 60 * 1000; // 24 hours expiry
        
        if (!isExpired && userData) {
          console.log('[AuthContext] Using cached user data for faster initial load');
          // Update state with cached data first for better UX
          updateState({
            isAuthenticated: true,
            user: userData,
            loading: false, // Stop loading since we have data
            error: null,
          });
          
          // Continue with Auth.currentAuthenticatedUser in background to refresh token
          Auth.currentAuthenticatedUser()
            .then(cognitoUser => {
              const freshUserData = processUserData(cognitoUser);
              
              // Cache fresh user data
              AsyncStorage.setItem('@cached_user_data', JSON.stringify({
                timestamp: Date.now(),
                userData: freshUserData
              }));
              
              // Only update state if data is different to avoid unnecessary rerenders
              if (JSON.stringify(freshUserData) !== JSON.stringify(userData)) {
                updateState({
                  user: freshUserData,
                });
              }

              // Update FCM tokens since we have an authenticated user
              try {
                PushNotificationHelper.updateTokensAfterLogin();
              } catch (error) {
                console.error('[AuthContext] Failed to update FCM tokens during session refresh:', error);
              }
            })
            .catch(error => {
              console.log('[AuthContext] Token refresh failed:', error);
              // Instead of calling signOut directly (which creates a circular dependency)
              // Update the auth state to trigger logout in the UI
              updateState({
                isAuthenticated: false,
                user: null,
                loading: false,
                error: new Error('Session expired. Please sign in again.')
              });
              
              // Clear cached data
              AsyncStorage.removeItem('@cached_user_data');
            });
          
          return; // Exit early since we already updated state
        }
      }
      
      // No valid cache, proceed with normal flow
      const cognitoUser = await Auth.currentAuthenticatedUser();
      const userData = processUserData(cognitoUser);
      
      // Cache the user data for future use
      await AsyncStorage.setItem('@cached_user_data', JSON.stringify({
        timestamp: Date.now(),
        userData
      }));
      
      // Set user university and city for immediate use
      if (userData.university) {
        await AsyncStorage.setItem('@user_university', userData.university);
      }
      if (userData.city) {
        await AsyncStorage.setItem('@user_city', userData.city);
      }

      updateState({
        isAuthenticated: true,
        user: userData,
        loading: false,
        error: null,
      });

      // Update FCM tokens since we found a valid session
      try {
        await PushNotificationHelper.updateTokensAfterLogin();
      } catch (error) {
        console.error('[AuthContext] Failed to update FCM tokens after session check:', error);
      }
    } catch (error) {
      // Clear any cached data on error
      try {
        await AsyncStorage.removeItem('@cached_user_data');
      } catch (e) {
        console.error('[AuthContext] Error clearing cached data:', e);
      }
      
      updateState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: error instanceof Error ? error : new Error('Unknown error during auth check'),
      });
    }
  }, []);

  // Effect to check auth state on mount
  useEffect(() => {
    checkAuthState();
  }, [checkAuthState]);

  // Sign in function
  const signIn = async (username: string, password: string) => {
    // Remove global loading state updates for the sign-in attempt
    // updateState({ loading: true, error: null });
    updateState({ error: null }); // Clear previous error

    try {
      const cognitoUser = await Auth.signIn(username, password);

      // If username looks like an email and there's no email in attributes, add it
      if (username.includes('@') && (!cognitoUser.attributes || !cognitoUser.attributes.email)) {
        console.log('Adding email from username to attributes:', username);
        if (!cognitoUser.attributes) {
          cognitoUser.attributes = {};
        }
        cognitoUser.attributes.email = username;
      }

      const userData = processUserData(cognitoUser);

      // Update state on successful sign-in
      updateState({
        isAuthenticated: true,
        user: userData,
        // loading: false, // Don't change global loading here
        error: null,
      });

      // Update FCM tokens after successful login
      try {
        await PushNotificationHelper.updateTokensAfterLogin();
      } catch (error) {
        console.error('Failed to update FCM tokens after login:', error);
        // Non-fatal error, don't throw
      }

      return cognitoUser;
    } catch (error) {
      // Update only the error state on failure
      updateState({
        // loading: false, // Don't change global loading here
        error: error instanceof Error ? error : new Error('Failed to sign in'),
        isAuthenticated: false, // Ensure isAuthenticated is false on error
        user: null, // Clear user data on error
      });
      throw error;
    }
  };

  // Sign up function
  const signUp = async (email: string, password: string, attributes: Record<string, string>) => {
    updateState({ loading: true, error: null });

    try {
      const result = await Auth.signUp({
        username: email,
        password,
        attributes: {
          email,
          ...attributes,
        },
      });

      updateState({ loading: false });
      return result;
    } catch (error) {
      updateState({
        loading: false,
        error: error instanceof Error ? error : new Error('Failed to sign up'),
      });
      throw error;
    }
  };

  // Confirm sign up function
  const confirmSignUp = async (username: string, code: string) => {
    updateState({ loading: true, error: null });

    try {
      const result = await Auth.confirmSignUp(username, code);
      updateState({ loading: false });
      return result;
    } catch (error) {
      updateState({
        loading: false,
        error: error instanceof Error ? error : new Error('Failed to confirm sign up'),
      });
      throw error;
    }
  };

  // Resend confirmation code
  const resendConfirmationCode = async (username: string) => {
    updateState({ loading: true, error: null });

    try {
      const result = await Auth.resendSignUp(username);
      updateState({ loading: false });
      return result;
    } catch (error) {
      updateState({
        loading: false,
        error: error instanceof Error ? error : new Error('Failed to resend code'),
      });
      throw error;
    }
  };

  // Forgot password
  const forgotPassword = async (username: string) => {
    updateState({ loading: true, error: null });

    try {
      const result = await Auth.forgotPassword(username);
      updateState({ loading: false });
      return result;
    } catch (error) {
      updateState({
        loading: false,
        error: error instanceof Error ? error : new Error('Failed to initiate password reset'),
      });
      throw error;
    }
  };

  // Submit new password
  const forgotPasswordSubmit = async (username: string, code: string, newPassword: string) => {
    updateState({ loading: true, error: null });

    try {
      const result = await Auth.forgotPasswordSubmit(username, code, newPassword);
      updateState({ loading: false });
      return result;
    } catch (error) {
      updateState({
        loading: false,
        error: error instanceof Error ? error : new Error('Failed to reset password'),
      });
      throw error;
    }
  };

  // Sign out function
  const signOut = async () => {
    updateState({ loading: true, error: null });

    try {
      // Remove FCM token from Firestore before signing out
      await PushNotificationHelper.removeTokenFromFirestore();
      
      // Clear user-related cached data
      await AsyncStorage.removeItem('@cached_user_data');
      await AsyncStorage.removeItem('@user_university');
      await AsyncStorage.removeItem('@user_city');
      
      // Clear recent searches cache
      await AsyncStorage.removeItem('recent_searches_cache');
      
      // Set a flag to indicate we're signing out (will be used by AppNavigator)
      await AsyncStorage.setItem('@just_signed_out', 'true');
      
      // Clear user profile and products cache
      const keys = await AsyncStorage.getAllKeys();
      const userRelatedKeys = keys.filter(key => 
        key.startsWith('user_profile_cache_') || 
        key.startsWith('user_products_cache_') ||
        key.startsWith('CONVERSATION_') ||
        key.startsWith('MESSAGES_')
      );
      
      if (userRelatedKeys.length > 0) {
        await AsyncStorage.multiRemove(userRelatedKeys);
        console.log(`[AuthContext] Cleared ${userRelatedKeys.length} user-related cache items`);
      }
      
      await Auth.signOut();
      updateState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null,
      });
    } catch (error) {
      updateState({
        loading: false,
        error: error instanceof Error ? error : new Error('Failed to sign out'),
      });
      console.error('Error signing out:', error);
      throw error;
    }
  };

  // Update user info in state (locally)
  const updateUserInfo = (userData: Partial<UserData>) => {
    if (state.user) {
      updateState({
        user: { ...state.user, ...userData },
      });
    }
  };

  // Update user attributes in Cognito
  const updateUserAttributes = async (attributes: Record<string, string>) => {
    updateState({ loading: true, error: null });

    try {
      const user = await Auth.currentAuthenticatedUser();
      const result = await Auth.updateUserAttributes(user, attributes);

      // Update local state with new attributes
      checkAuthState();

      return result;
    } catch (error) {
      updateState({
        loading: false,
        error: error instanceof Error ? error : new Error('Failed to update attributes'),
      });
      throw error;
    }
  };

  // Refresh session
  const refreshSession = async () => {
    updateState({ loading: true, error: null });

    try {
      await Auth.currentAuthenticatedUser();
      const currentSession = await Auth.currentSession();

      updateState({ loading: false });

      // If session is valid, do nothing
      if (currentSession.isValid()) {
        return;
      }

      // Otherwise refresh the session
      const refreshedSession = await Auth.currentAuthenticatedUser({ bypassCache: true });
      const userData = processUserData(refreshedSession);

      updateState({
        isAuthenticated: true,
        user: userData,
        loading: false,
        error: null,
      });
    } catch (error) {
      // If error, user is not authenticated
      updateState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: error instanceof Error ? error : new Error('Failed to refresh session'),
      });
      throw error;
    }
  };

  // Create context value - using a more direct approach to avoid type issues
  const authContextValue: AuthContextType = {
    // Auth state
    isAuthenticated: state.isAuthenticated,
    user: state.user,
    loading: state.loading,
    error: state.error || null, // Ensure error is never undefined
    // Auth actions
    signIn,
    signUp,
    confirmSignUp,
    resendConfirmationCode,
    forgotPassword,
    forgotPasswordSubmit,
    signOut,
    updateUserInfo,
    updateUserAttributes,
    refreshSession,
  };

  // Check if context is properly formed before providing it
  // This is defensive programming to avoid the "Property 'error' doesn't exist" error
  if (typeof authContextValue.error === 'undefined') {
    // If error is undefined for some reason, initialize it
    console.warn('Auth context error was undefined, initializing with null');
    authContextValue.error = null;
  }

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  // Ensure error is never undefined
  if (typeof context.error === 'undefined') {
    context.error = null;
  }

  return context;
};

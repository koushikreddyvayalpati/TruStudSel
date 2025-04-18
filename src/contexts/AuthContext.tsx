import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { Auth } from 'aws-amplify';

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
      const cognitoUser = await Auth.currentAuthenticatedUser();
      const userData = processUserData(cognitoUser);

      updateState({
        isAuthenticated: true,
        user: userData,
        loading: false,
        error: null,
      });
    } catch (error) {
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

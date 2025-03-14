import React, { createContext, useState, useContext, useEffect } from 'react';
import { Auth } from 'aws-amplify';

type UserData = {
  username: string;
  email: string;
  name?: string;
  attributes?: any;
};

type AuthContextType = {
  isAuthenticated: boolean;
  user: UserData | null;
  signIn: (username: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  loading: boolean;
  updateUserInfo: (userData: Partial<UserData>) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check if user is already signed in
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const userData = await Auth.currentAuthenticatedUser();
      const userInfo = {
        username: userData.username,
        email: userData.attributes?.email || '',
        name: userData.attributes?.name || userData.username,
        attributes: userData.attributes
      };
      setUser(userInfo);
      setIsAuthenticated(true);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (username: string, password: string) => {
    try {
      const userData = await Auth.signIn(username, password);
      const userInfo = {
        username: userData.username,
        email: userData.attributes?.email || username,
        name: userData.attributes?.name || userData.username,
        attributes: userData.attributes
      };
      setUser(userInfo);
      setIsAuthenticated(true);
      return userData;
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await Auth.signOut();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const updateUserInfo = (userData: Partial<UserData>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      signIn, 
      signOut, 
      loading,
      updateUserInfo 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 
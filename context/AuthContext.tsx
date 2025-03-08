import React, { createContext, useContext, useEffect, useState } from 'react';
import { Auth } from 'aws-amplify';

interface AuthContextType {
  user: any;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await Auth.currentAuthenticatedUser();
        setUser(currentUser);
      } catch (error) {
        console.log('No user signed in');
      }
    };

    fetchUser();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { user } = await Auth.signIn(email, password);
    setUser(user);
  };

  const signUp = async (email: string, password: string) => {
    const { user } = await Auth.signUp({
      username: email,
      password,
    });
    setUser(user);
  };

  const signOut = async () => {
    await Auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from './ProductsContext';

// Context state
interface WishlistState {
  items: Product[];
  loading: boolean;
  error: Error | null;
}

// Context actions
interface WishlistActions {
  addToWishlist: (product: Product) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  clearWishlist: () => Promise<void>;
  isInWishlist: (productId: string) => boolean;
}

// Combined context type
export type WishlistContextType = WishlistState & WishlistActions;

// Create context
const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

// Provider component
export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WishlistState>({
    items: [],
    loading: true,
    error: null,
  });

  // Load wishlist from AsyncStorage on mount
  useEffect(() => {
    const loadWishlist = async () => {
      try {
        const storedWishlist = await AsyncStorage.getItem('wishlist');
        if (storedWishlist) {
          setState(prev => ({
            ...prev,
            items: JSON.parse(storedWishlist),
            loading: false,
          }));
        } else {
          setState(prev => ({
            ...prev,
            loading: false,
          }));
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error : new Error('Failed to load wishlist'),
        }));
      }
    };

    loadWishlist();
  }, []);

  // Save wishlist to AsyncStorage whenever it changes
  useEffect(() => {
    const saveWishlist = async () => {
      try {
        await AsyncStorage.setItem('wishlist', JSON.stringify(state.items));
      } catch (error) {
        console.error('Failed to save wishlist to AsyncStorage:', error);
      }
    };

    if (!state.loading) {
      saveWishlist();
    }
  }, [state.items, state.loading]);

  // Add product to wishlist
  const addToWishlist = async (product: Product): Promise<void> => {
    try {
      // Don't add if already in wishlist
      if (state.items.some(item => item.id === product.id)) {
        return;
      }

      setState(prev => ({
        ...prev,
        items: [...prev.items, product],
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Failed to add item to wishlist'),
      }));
    }
  };

  // Remove product from wishlist
  const removeFromWishlist = async (productId: string): Promise<void> => {
    try {
      setState(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== productId),
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Failed to remove item from wishlist'),
      }));
    }
  };

  // Clear the wishlist
  const clearWishlist = async (): Promise<void> => {
    try {
      setState(prev => ({
        ...prev,
        items: [],
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Failed to clear wishlist'),
      }));
    }
  };

  // Check if a product is in the wishlist
  const isInWishlist = (productId: string): boolean => {
    return state.items.some(item => item.id === productId);
  };

  return (
    <WishlistContext.Provider value={{
      ...state,
      addToWishlist,
      removeFromWishlist,
      clearWishlist,
      isInWishlist,
    }}>
      {children}
    </WishlistContext.Provider>
  );
};

// Custom hook for using the wishlist context
export const useWishlist = (): WishlistContextType => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export default WishlistContext;

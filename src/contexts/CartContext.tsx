import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from './ProductsContext';

// Define cart item type with quantity
export interface CartItem {
  product: Product;
  quantity: number;
}

// Context state
interface CartState {
  items: CartItem[];
  loading: boolean;
  error: Error | null;
}

// Context actions
interface CartActions {
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getCartTotal: () => number;
  getItemCount: () => number;
  isInCart: (productId: string) => boolean;
}

// Combined context type
export type CartContextType = CartState & CartActions;

// Create context
const CartContext = createContext<CartContextType | undefined>(undefined);

// Provider component
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<CartState>({
    items: [],
    loading: true,
    error: null,
  });

  // Load cart from AsyncStorage on mount
  useEffect(() => {
    const loadCart = async () => {
      try {
        const storedCart = await AsyncStorage.getItem('cart');
        if (storedCart) {
          setState(prev => ({
            ...prev,
            items: JSON.parse(storedCart),
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
          error: error instanceof Error ? error : new Error('Failed to load cart'),
        }));
      }
    };

    loadCart();
  }, []);

  // Save cart to AsyncStorage whenever it changes
  useEffect(() => {
    const saveCart = async () => {
      try {
        await AsyncStorage.setItem('cart', JSON.stringify(state.items));
      } catch (error) {
        console.error('Failed to save cart to AsyncStorage:', error);
      }
    };

    if (!state.loading) {
      saveCart();
    }
  }, [state.items, state.loading]);

  // Add product to cart
  const addToCart = async (product: Product, quantity: number = 1): Promise<void> => {
    try {
      const existingItemIndex = state.items.findIndex(item => item.product.id === product.id);

      if (existingItemIndex !== -1) {
        // Update quantity if product already in cart
        const updatedItems = [...state.items];
        updatedItems[existingItemIndex].quantity += quantity;

        setState(prev => ({
          ...prev,
          items: updatedItems,
        }));
      } else {
        // Add new item if not in cart
        setState(prev => ({
          ...prev,
          items: [...prev.items, { product, quantity }],
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Failed to add item to cart'),
      }));
    }
  };

  // Remove product from cart
  const removeFromCart = async (productId: string): Promise<void> => {
    try {
      setState(prev => ({
        ...prev,
        items: prev.items.filter(item => item.product.id !== productId),
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Failed to remove item from cart'),
      }));
    }
  };

  // Update product quantity in cart
  const updateQuantity = async (productId: string, quantity: number): Promise<void> => {
    try {
      if (quantity <= 0) {
        // Remove item if quantity is 0 or negative
        await removeFromCart(productId);
        return;
      }

      const existingItemIndex = state.items.findIndex(item => item.product.id === productId);

      if (existingItemIndex !== -1) {
        const updatedItems = [...state.items];
        updatedItems[existingItemIndex].quantity = quantity;

        setState(prev => ({
          ...prev,
          items: updatedItems,
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Failed to update quantity'),
      }));
    }
  };

  // Clear the cart
  const clearCart = async (): Promise<void> => {
    try {
      setState(prev => ({
        ...prev,
        items: [],
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Failed to clear cart'),
      }));
    }
  };

  // Calculate total price of items in cart
  const getCartTotal = (): number => {
    return state.items.reduce((total, item) => {
      // Remove currency symbol and convert to number
      const priceStr = item.product.price.replace(/[^0-9.]/g, '');
      const price = parseFloat(priceStr);

      return total + price * item.quantity;
    }, 0);
  };

  // Get total number of items in cart
  const getItemCount = (): number => {
    return state.items.reduce((count, item) => count + item.quantity, 0);
  };

  // Check if a product is in the cart
  const isInCart = (productId: string): boolean => {
    return state.items.some(item => item.product.id === productId);
  };

  return (
    <CartContext.Provider value={{
      ...state,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getCartTotal,
      getItemCount,
      isInCart,
    }}>
      {children}
    </CartContext.Provider>
  );
};

// Custom hook for using the cart context
export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;

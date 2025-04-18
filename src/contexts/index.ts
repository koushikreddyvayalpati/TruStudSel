/**
 * Centralized exports for contexts
 */
export { AuthProvider, useAuth } from './AuthContext';
export { ThemeProvider, useTheme } from './ThemeContext';
export { ProductsProvider, useProducts } from './ProductsContext';
export { WishlistProvider, useWishlist } from './WishlistContext';
export { CartProvider, useCart } from './CartContext';
export { MessagingProvider, useMessaging } from './MessagingContext';

// Export types
export type { AuthContextType, UserData, UserAttributes } from './AuthContext';
export type { Product, ProductsContextType } from './ProductsContext';
export type { WishlistContextType } from './WishlistContext';
export type { CartContextType, CartItem } from './CartContext';
export type { MessagingContextType, Message, Conversation, ConversationWithUser } from './MessagingContext';

// Export other context providers as they are created
// export { ProductProvider, useProducts } from './ProductContext';

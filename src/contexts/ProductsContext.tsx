import React, { createContext, useState, useContext, useEffect } from 'react';

// Define product types
export interface ProductImage {
  id: string;
  url: string;
}

export interface Product {
  id: string;
  name: string;
  price: string;
  description: string;
  condition: string;
  type: string;
  images: string[] | ProductImage[];
  seller: {
    id: string;
    name: string;
    rating?: number;
  };
  createdAt: string;
  updatedAt: string;
}

// Context state
interface ProductsState {
  products: Product[];
  featuredProducts: Product[];
  recentProducts: Product[];
  loading: boolean;
  error: Error | null;
}

// Context actions
interface ProductsActions {
  fetchProducts: () => Promise<void>;
  fetchProductById: (id: string) => Promise<Product | null>;
  searchProducts: (query: string) => Promise<Product[]>;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<Product>;
  deleteProduct: (id: string) => Promise<boolean>;
}

// Combined context type
export type ProductsContextType = ProductsState & ProductsActions;

// Create context
const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

// Sample data for testing
const sampleProducts: Product[] = [
  {
    id: '1',
    name: 'MacBook Pro',
    price: '$1299',
    description: 'Barely used MacBook Pro 2020, 16GB RAM, 512GB SSD',
    condition: 'Like New',
    type: 'Electronics',
    images: [
      'https://via.placeholder.com/300',
      'https://via.placeholder.com/300/FF0000',
    ],
    seller: {
      id: '101',
      name: 'John Doe',
      rating: 4.8,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Calculus Textbook',
    price: '$45',
    description: 'Calculus: Early Transcendentals, 8th Edition, James Stewart',
    condition: 'Good',
    type: 'Books',
    images: [
      'https://via.placeholder.com/300/00FF00',
    ],
    seller: {
      id: '102',
      name: 'Jane Smith',
      rating: 4.5,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Desk Lamp',
    price: '$25',
    description: 'LED Desk Lamp with USB Charging Port, Adjustable Brightness',
    condition: 'New',
    type: 'Furniture',
    images: [
      'https://via.placeholder.com/300/0000FF',
    ],
    seller: {
      id: '103',
      name: 'Alice Johnson',
      rating: 4.9,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Provider component
export const ProductsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ProductsState>({
    products: sampleProducts,
    featuredProducts: sampleProducts.slice(0, 2),
    recentProducts: [...sampleProducts].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    loading: false,
    error: null,
  });

  // Simulate fetching products from an API
  const fetchProducts = async (): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update state with fetched products
      setState(prev => ({
        ...prev,
        products: sampleProducts,
        featuredProducts: sampleProducts.slice(0, 2),
        recentProducts: [...sampleProducts].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error : new Error('Failed to fetch products'),
      }));
    }
  };

  // Fetch a single product by ID
  const fetchProductById = async (id: string): Promise<Product | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const product = state.products.find(p => p.id === id) || null;
      
      setState(prev => ({
        ...prev,
        loading: false,
      }));
      
      return product;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error : new Error(`Failed to fetch product with ID: ${id}`),
      }));
      return null;
    }
  };

  // Search products by query
  const searchProducts = async (query: string): Promise<Product[]> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const searchResults = state.products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) || 
        p.description.toLowerCase().includes(query.toLowerCase())
      );
      
      setState(prev => ({
        ...prev,
        loading: false,
      }));
      
      return searchResults;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error : new Error('Failed to search products'),
      }));
      return [];
    }
  };

  // Add a new product
  const addProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newProduct: Product = {
        ...product,
        id: `${state.products.length + 1}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      setState(prev => ({
        ...prev,
        products: [...prev.products, newProduct],
        recentProducts: [newProduct, ...prev.recentProducts],
        loading: false,
      }));
      
      return newProduct;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error : new Error('Failed to add product'),
      }));
      throw error;
    }
  };

  // Update an existing product
  const updateProduct = async (id: string, updates: Partial<Product>): Promise<Product> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedProducts = state.products.map(p => 
        p.id === id 
          ? { ...p, ...updates, updatedAt: new Date().toISOString() } 
          : p
      );
      
      const updatedProduct = updatedProducts.find(p => p.id === id);
      
      if (!updatedProduct) {
        throw new Error(`Product with ID ${id} not found`);
      }
      
      setState(prev => ({
        ...prev,
        products: updatedProducts,
        featuredProducts: prev.featuredProducts.map(p => 
          p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        ),
        recentProducts: prev.recentProducts.map(p => 
          p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        ),
        loading: false,
      }));
      
      return updatedProduct;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error : new Error(`Failed to update product with ID: ${id}`),
      }));
      throw error;
    }
  };

  // Delete a product
  const deleteProduct = async (id: string): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setState(prev => ({
        ...prev,
        products: prev.products.filter(p => p.id !== id),
        featuredProducts: prev.featuredProducts.filter(p => p.id !== id),
        recentProducts: prev.recentProducts.filter(p => p.id !== id),
        loading: false,
      }));
      
      return true;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error : new Error(`Failed to delete product with ID: ${id}`),
      }));
      return false;
    }
  };

  // Load initial products
  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <ProductsContext.Provider value={{
      ...state,
      fetchProducts,
      fetchProductById,
      searchProducts,
      addProduct,
      updateProduct,
      deleteProduct,
    }}>
      {children}
    </ProductsContext.Provider>
  );
};

// Custom hook for using the products context
export const useProducts = (): ProductsContextType => {
  const context = useContext(ProductsContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductsProvider');
  }
  return context;
};

export default ProductsContext; 
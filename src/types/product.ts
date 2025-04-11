// Product interface definition
export interface Product {
  id: string;
  name: string;
  price: string;
  description?: string;
  condition?: string;
  type?: string;
  images?: string[];
  email?: string;
  primaryImage?: string;
  productage?: string;
  sellingtype?: string;
  status?: string;
  image?: string; // Legacy field
  sellerName?: string;
  university?: string;
  city?: string;
  zipcode?: string;
  createdAt?: string;
  updatedAt?: string;
  seller?: {
    id: string;
    name: string;
    rating?: number;
    contactNumber?: string;
    email?: string;
  };
  // Add more fields as needed
}

// Product filters for API requests
export interface ProductFilters {
  page?: number;
  size?: number;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  type?: string;
  searchQuery?: string;
  university?: string;
  city?: string;
  zipcode?: string;
  isFeatured?: boolean;
  // Add more filters as needed
}

// Paginated product response from API
export interface ProductListResponse {
  products: Product[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
}

// Filter maps for optimization
export interface FilterMaps {
  conditionMap: Record<string, number>;
  typeMap: Record<string, number>;
  priceRanges: {
    min: number;
    max: number;
  };
}

// Cache structure
export interface ProductCache {
  data: Product[] | any;
  timestamp: number;
  totalPages?: number;
  totalCount?: number;
} 
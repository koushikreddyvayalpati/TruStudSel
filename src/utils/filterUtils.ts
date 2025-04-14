import { ProductFilters } from '../api/products';
import { Product } from '../types/product';

// Thresholds for client vs server filtering
export const PRODUCT_SIZE_THRESHOLD = 500; // If more than 500 products, prefer server filtering
export const SORTING_THRESHOLD = 1000; // Products limit for client-side sorting

// Interface to define filter maps for optimized filtering
export interface FilterMap {
  condition: Map<string, Product[]>;
  sellingType: Map<string, Product[]>;
  price: Map<string, Product[]>;
}

/**
 * Create filter maps for optimized filtering
 * This pre-computes filtered sets for faster runtime performance
 */
export const createFilterMaps = (products: Product[]): FilterMap => {
  const conditionMap = new Map<string, Product[]>();
  const sellingTypeMap = new Map<string, Product[]>();
  const priceMap = new Map<string, Product[]>();
  
  // Create condition maps
  ['brand-new', 'like-new', 'very-good', 'good', 'acceptable', 'for-parts'].forEach(condition => {
    conditionMap.set(condition, products.filter(product => 
      (product.condition?.toLowerCase() === condition) || 
      (product.productage?.toLowerCase() === condition)
    ));
  });
  
  // Create selling type maps
  ['rent', 'sell'].forEach(type => {
    sellingTypeMap.set(type, products.filter(product => 
      product.sellingtype?.toLowerCase() === type
    ));
  });
  
  // Create price map for free items
  priceMap.set('free', products.filter(product => 
    parseFloat(product.price || '0') === 0
  ));
  
  return {
    condition: conditionMap,
    sellingType: sellingTypeMap,
    price: priceMap
  };
};

/**
 * Determine if client-side filtering should be used based on dataset size
 */
export const shouldUseClientSideFiltering = (
  products: Product[], 
  filters: string[], 
  totalCount: number
): boolean => {
  // If no filters are applied, use client-side filtering for immediate results
  if (filters.length === 0) return true;
  
  // If we have all products from the server already, use client-side filtering
  if (products.length === totalCount) return true;
  
  // For small datasets, always use client-side filtering
  if (products.length < PRODUCT_SIZE_THRESHOLD) return true;
  
  // For large datasets with filters, prefer server-side filtering
  return false;
};

/**
 * Apply optimized filtering using pre-computed filter maps
 */
export const applyOptimizedFiltering = (
  products: Product[],
  filters: string[],
  filterMaps: FilterMap
): Product[] => {
  if (!filters.length) return products;
  
  // Extract filter types
  const conditionFilters = filters.filter(filter => 
    ['brand-new', 'like-new', 'very-good', 'good', 'acceptable', 'for-parts'].includes(filter)
  );
  
  const sellingTypeFilters = filters.filter(filter => 
    ['rent', 'sell'].includes(filter)
  );
  
  const hasFreeFilter = filters.includes('free');
  
  // Apply filters using set operations for better performance
  let resultSet = new Set<string>();
  let isFirstFilter = true;
  
  // Process condition filters
  if (conditionFilters.length > 0) {
    const conditionSet = new Set<string>();
    conditionFilters.forEach(condition => {
      const matchingProducts = filterMaps.condition.get(condition) || [];
      matchingProducts.forEach(product => conditionSet.add(product.id));
    });
    
    if (isFirstFilter) {
      resultSet = conditionSet;
      isFirstFilter = false;
    } else {
      resultSet = new Set([...resultSet].filter(id => conditionSet.has(id)));
    }
  }
  
  // Process selling type filters
  if (sellingTypeFilters.length > 0) {
    const sellingTypeSet = new Set<string>();
    sellingTypeFilters.forEach(type => {
      const matchingProducts = filterMaps.sellingType.get(type) || [];
      matchingProducts.forEach(product => sellingTypeSet.add(product.id));
    });
    
    if (isFirstFilter) {
      resultSet = sellingTypeSet;
      isFirstFilter = false;
    } else {
      resultSet = new Set([...resultSet].filter(id => sellingTypeSet.has(id)));
    }
  }
  
  // Process free filter
  if (hasFreeFilter) {
    const freeSet = new Set<string>();
    const freeProducts = filterMaps.price.get('free') || [];
    freeProducts.forEach(product => freeSet.add(product.id));
    
    if (isFirstFilter) {
      resultSet = freeSet;
      isFirstFilter = false;
    } else {
      resultSet = new Set([...resultSet].filter(id => freeSet.has(id)));
    }
  }
  
  // If no filters were applied, return all products
  if (isFirstFilter) return products;
  
  // Convert result set back to products
  return products.filter(product => resultSet.has(product.id));
};

/**
 * Convert UI filter options to API filter format
 */
export const convertToApiFilters = (
  filters: string[], 
  sortOption: string
): ProductFilters => {
  const apiFilters: ProductFilters = {};
  
  // Extract condition filters
  const conditionFilters = filters.filter(filter => 
    ['brand-new', 'like-new', 'very-good', 'good', 'acceptable', 'for-parts'].includes(filter)
  );
  if (conditionFilters.length > 0) {
    apiFilters.condition = conditionFilters;
  }
  
  // Extract selling type filters
  const sellingTypeFilters = filters.filter(filter => 
    ['rent', 'sell'].includes(filter)
  );
  if (sellingTypeFilters.length > 0) {
    apiFilters.sellingType = sellingTypeFilters;
  }
  
  // Handle free items filter
  if (filters.includes('free')) {
    apiFilters.maxPrice = '0';
  }
  
  // Handle sorting
  if (sortOption && sortOption !== 'default') {
    const [field, direction] = sortOption.split('-');
    apiFilters.sortBy = field;
    apiFilters.sortDirection = direction as 'asc' | 'desc';
  }
  
  return apiFilters;
};

/**
 * Determine if we need to re-fetch from server based on filter changes
 */
export const needsServerRefetch = (
  newFilters: string[],
  prevFilters: string[],
  totalCount: number,
  currentProducts: Product[]
): boolean => {
  // If we don't have the complete dataset, we might need to refetch
  if (currentProducts.length < totalCount) {
    // If we're adding a filter, we can just filter the current set client-side
    if (newFilters.length > prevFilters.length) {
      // Check if all new filters include old filters (just adding filters)
      const allOldFiltersIncluded = prevFilters.every(f => newFilters.includes(f));
      if (allOldFiltersIncluded) return false;
    }
    
    // If we're removing filters or changing filters, we need to refetch
    return true;
  }
  
  // We have the complete dataset, no need to refetch
  return false;
}; 
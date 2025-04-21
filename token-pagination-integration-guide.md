# Token-Based Pagination Integration Guide

This guide explains how to use the updated token-based pagination in your React Native application.

## Overview of Changes

We've updated our API endpoints to use token-based pagination instead of page-based pagination. This approach:
- Dramatically reduces DynamoDB read costs by using queries instead of scans
- Works better with large datasets as it uses native DynamoDB pagination
- Only loads the exact data needed for each page
- Handles data changes during pagination better than page numbers

## API Updates

The following API endpoints have been updated to use token-based pagination:

| API Endpoint | Old Pagination | New Pagination | 
|--------------|----------------|----------------|
| Products by Email | `GET /api/products/email/{email}?page=0&size=20` | `GET /api/products/email/{email}?pageToken=xyz&size=20` |
| Products by Category | `GET /api/products/category/{category}?page=0&size=20` | `GET /api/products/category/{category}?pageToken=xyz&size=20` |
| Products by University | `GET /api/products/university/{university}?page=0&size=20` | `GET /api/products/university/{university}?pageToken=xyz&size=20` |
| Products by City | `GET /api/products/city/{city}?page=0&size=20` | `GET /api/products/city/{city}?pageToken=xyz&size=20` |
| University with Filters | `GET /api/products/university/{university}/filters?page=0&size=20` | `GET /api/products/university/{university}/filters?pageToken=xyz&size=20` |
| City with Filters | `GET /api/products/city/{city}/filters?page=0&size=20` | `GET /api/products/city/{city}/filters?pageToken=xyz&size=20` |
| New Arrivals | `GET /api/products/new-arrivals/{university}?page=0&size=20` | `GET /api/products/new-arrivals/{university}?pageToken=xyz&size=20` |
| Featured Products | `GET /api/products/featured/{university}/{city}?page=0&size=20` | `GET /api/products/featured/{university}/{city}?pageToken=xyz&size=20` |

## Response Format Changes

The response format has changed from:

```json
{
  "products": [...],
  "totalItems": 100,
  "currentPage": 0,
  "totalPages": 5
}
```

To:

```json
{
  "products": [...],
  "totalItems": 100,
  "nextPageToken": "eyJsYXN0RXZhbHVhdGVkS2V5Ijp7InVuaXZlcnNpdHkiOiJVbml2ZXJzaXR5IG9mIFdhc2hpbmd0b24iLCJwcm9kdWN0SWQiOiIxMjM0NTY3ODkwIn19",
  "hasMorePages": true
}
```

The `currentPage` and `totalPages` fields are still included for backward compatibility but will be deprecated in the future.

## Frontend Integration

### First Request
When making the initial request, don't include the `pageToken` parameter:

```javascript
// First request - no pageToken
const response = await getProductsByUniversity('University of Washington', { size: 20 });
```

### Subsequent Requests
For subsequent requests (loading more), include the `nextPageToken` from the previous response:

```javascript
// Store the nextPageToken from the first response
const nextPageToken = response.nextPageToken;

// Use it in the next request to load more data
if (nextPageToken) {
  const moreProducts = await getProductsByUniversity('University of Washington', { 
    size: 20, 
    pageToken: nextPageToken 
  });
}
```

### "Load More" Button
Use the `hasMorePages` field to determine if you should show a "Load More" button:

```javascript
// In your React component
return (
  <View>
    {/* Product list */}
    
    {/* Show Load More button only if there are more pages */}
    {response.hasMorePages && (
      <Button 
        title="Load More" 
        onPress={() => loadMoreProducts(response.nextPageToken)} 
      />
    )}
  </View>
);
```

### Refreshing/Starting Over
When refreshing or starting a new search, use `null` for the `pageToken`:

```javascript
// Reset pagination and fetch fresh data
const refresh = async () => {
  const freshData = await getProductsByUniversity('University of Washington', { 
    size: 20, 
    pageToken: null 
  });
};
```

## Example Implementation with React Hooks

```javascript
import React, { useState, useEffect } from 'react';
import { getProductsByUniversity } from '../api/products';

const ProductList = ({ university }) => {
  const [products, setProducts] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [hasMorePages, setHasMorePages] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    loadProducts();
  }, [university]);

  // Load initial products
  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await getProductsByUniversity(university, { size: 20 });
      setProducts(response.products);
      setNextPageToken(response.nextPageToken);
      setHasMorePages(response.hasMorePages);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load more products
  const loadMoreProducts = async () => {
    if (!nextPageToken || !hasMorePages) return;
    
    setLoading(true);
    try {
      const response = await getProductsByUniversity(university, { 
        size: 20, 
        pageToken: nextPageToken 
      });
      
      setProducts([...products, ...response.products]);
      setNextPageToken(response.nextPageToken);
      setHasMorePages(response.hasMorePages);
    } catch (error) {
      console.error('Error loading more products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh products
  const refreshProducts = async () => {
    setLoading(true);
    try {
      const response = await getProductsByUniversity(university, { size: 20 });
      setProducts(response.products);
      setNextPageToken(response.nextPageToken);
      setHasMorePages(response.hasMorePages);
    } catch (error) {
      console.error('Error refreshing products:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      {/* Product list rendering */}
      
      {/* Load more button */}
      {hasMorePages && (
        <Button 
          title="Load More" 
          onPress={loadMoreProducts} 
          disabled={loading} 
        />
      )}
      
      {/* Refresh button */}
      <Button 
        title="Refresh" 
        onPress={refreshProducts} 
        disabled={loading} 
      />
    </View>
  );
};
```

## Additional Notes

1. For search operations, use the `paginationToken` field in the request (this will be mapped to `pageToken` internally):

```javascript
const searchParams = {
  keyword: 'textbook',
  university: 'University of Washington',
  size: 20,
  paginationToken: nextPageToken // Use the token from previous response
};

const searchResults = await searchProducts(searchParams);
```

2. The API endpoints will continue to support the legacy `page` parameter for backward compatibility, but it's recommended to migrate to token-based pagination for better performance and reliability.

3. When updating your stores (like Zustand stores), make sure to store and manage the `nextPageToken` and `hasMorePages` fields instead of tracking page numbers. 
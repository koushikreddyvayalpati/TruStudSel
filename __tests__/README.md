# TruStudSel Testing Guide

This document explains how to use the test infrastructure in the TruStudSel project, with a focus on the API mocking system.

## Test Structure

The test directory is organized as follows:

```
__tests__/
  ├── mocks/              # Mock implementations for testing
  │   ├── apiMock.js      # API endpoint mocks
  │   ├── asyncStorageMock.js # AsyncStorage mocks
  │   └── svgMock.js      # SVG file mocks
  ├── setup/              # Test setup files
  │   └── setupJest.js    # Jest configuration
  ├── components/         # Component tests
  ├── screens/            # Screen component tests
  └── App.test.tsx        # Main app test
```

## Using API Mocks in Tests

The API mocking system allows you to test components that rely on API calls without actually making network requests. Here's how to use it:

### Basic Usage

```typescript
// Import the API mocks
const setupApiMocks = require('../mocks/apiMock');

describe('YourComponent', () => {
  // Setup API mocks before running tests
  const apiMocks = setupApiMocks();
  
  beforeEach(() => {
    // Reset mocks between tests
    apiMocks.resetMocks();
  });
  
  it('fetches and displays data', async () => {
    // Your test code here
    // The global fetch function is now mocked
  });
});
```

### Available Mock Data

The API mock system provides several sets of mock data:

- `apiMocks.mockProducts`: Array of product objects
- `apiMocks.mockMessages`: Array of message objects
- `apiMocks.mockProfile`: User profile object

### Customizing Responses

You can customize the API responses for specific tests:

```typescript
// Override a specific handler for a test
global.fetch = jest.fn().mockImplementation((url) => {
  if (url.includes('/api/products')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ products: [{ id: 1, name: 'Custom Product' }] })
    });
  }
  
  // Fall back to default mocks for other endpoints
  return apiMocks.handlers.getDefaultResponse(url);
});
```

## Testing Authentication

To test components that require authentication:

```typescript
// Mock a logged-in state
apiMocks.handlers.login({
  email: 'test@example.edu',
  password: 'password123'
}).then(response => {
  // Store the token in AsyncStorage mock
  require('../mocks/asyncStorageMock').setItem(
    'auth_token',
    JSON.stringify(response.token)
  );
  
  // Continue with your test
});
```

## Testing Failure Scenarios

You can test how components handle API failures:

```typescript
// Mock a failed API response for a specific endpoint
global.fetch = jest.fn().mockImplementation((url) => {
  if (url.includes('/api/products')) {
    return Promise.resolve({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' })
    });
  }
  
  // Use default mocks for other endpoints
  return apiMocks.handlers.getDefaultResponse(url);
});
```

## Best Practices

1. Always reset mocks between tests using `apiMocks.resetMocks()`
2. Test both success and failure scenarios
3. Use `waitFor` to handle asynchronous API calls in tests
4. Verify that loading states are correctly displayed during API calls
5. Check that error states are properly rendered when API calls fail

## Extending the API Mocks

To add new mock endpoints:

1. Add new mock data to the appropriate section in `apiMock.js`
2. Add a handler function in the `handlers` object
3. Update the URL matching in the fetch mock implementation

## Running Tests

To run all tests:

```bash
npm test
```

To run tests with coverage:

```bash
npm test -- --coverage
```

To run a specific test file:

```bash
npm test -- path/to/test/file.test.tsx
``` 
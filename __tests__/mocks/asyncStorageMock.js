/**
 * AsyncStorage Mock
 * This mocks the behavior of AsyncStorage for testing
 */

const asyncStorageMock = {
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  mergeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
  multiMerge: jest.fn(),
};

// Helper to simulate stored data
const storedItems = {};

// Implement basic functionality for tests
asyncStorageMock.setItem.mockImplementation((key, value) => {
  return new Promise((resolve) => {
    storedItems[key] = value;
    resolve(null);
  });
});

asyncStorageMock.getItem.mockImplementation((key) => {
  return new Promise((resolve) => {
    resolve(storedItems[key] || null);
  });
});

asyncStorageMock.removeItem.mockImplementation((key) => {
  return new Promise((resolve) => {
    delete storedItems[key];
    resolve(null);
  });
});

asyncStorageMock.clear.mockImplementation(() => {
  return new Promise((resolve) => {
    Object.keys(storedItems).forEach(key => {
      delete storedItems[key];
    });
    resolve(null);
  });
});

// Helper to reset the mock state between tests
asyncStorageMock.__resetMockState = () => {
  Object.keys(storedItems).forEach(key => {
    delete storedItems[key];
  });
  Object.keys(asyncStorageMock).forEach(key => {
    if (typeof asyncStorageMock[key] === 'function' && asyncStorageMock[key].mockClear) {
      asyncStorageMock[key].mockClear();
    }
  });
};

module.exports = asyncStorageMock; 
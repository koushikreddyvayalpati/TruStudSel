/**
 * API Mock Service
 * 
 * Provides mock data and response handlers for API testing
 */

// Mock product data
const mockProducts = [
  {
    id: 1,
    name: 'Used Chemistry Textbook',
    price: '45.99',
    image: 'https://example.com/chemistry-book.jpg',
    description: 'Chemistry 101 textbook, slightly used but in great condition',
    condition: 'Good',
    type: 'Book',
    seller: 'John Doe',
    createdAt: '2023-03-15T10:30:00Z',
  },
  {
    id: 2,
    name: 'Calculator TI-84',
    price: '75.00',
    image: 'https://example.com/calculator.jpg',
    description: 'TI-84 calculator, perfect for math and science classes',
    condition: 'Excellent',
    type: 'Electronics',
    seller: 'Jane Smith',
    createdAt: '2023-03-14T08:45:00Z',
  },
  {
    id: 3,
    name: 'Dorm Desk Lamp',
    price: '18.50',
    image: 'https://example.com/lamp.jpg',
    description: 'LED desk lamp with adjustable brightness, perfect for studying',
    condition: 'Like New',
    type: 'Furniture',
    seller: 'Mike Johnson',
    createdAt: '2023-03-12T17:20:00Z',
  },
];

// Mock message data
const mockMessages = [
  {
    id: '1',
    conversationId: '101',
    sender: 'Fauziah',
    receiver: 'You',
    text: 'I will do the voice over',
    timestamp: '2023-03-20T22:30:00Z',
    read: true,
  },
  {
    id: '2',
    conversationId: '102',
    sender: 'Nicole',
    receiver: 'You',
    text: 'just open la',
    timestamp: '2023-03-20T15:15:00Z',
    read: false,
  },
  {
    id: '3',
    conversationId: '103',
    sender: 'Brian',
    receiver: 'You',
    text: 'bye',
    timestamp: '2023-03-19T10:45:00Z',
    read: true,
  },
];

// Mock user profile
const mockProfile = {
  id: '12345',
  name: 'Alex Johnson',
  email: 'alex.johnson@example.edu',
  username: 'alexj2023',
  avatar: 'https://example.com/avatar.jpg',
  bio: 'Computer Science Major, Class of 2025',
  createdAt: '2022-09-01T14:30:00Z',
  school: 'State University',
};

// API response handlers
const mockApiResponse = (status, data, delay = 0) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        status,
        ok: status >= 200 && status < 300,
        json: () => Promise.resolve(data),
      });
    }, delay);
  });
};

// Mock API handlers
const handlers = {
  // Products API
  getProducts: () => mockApiResponse(200, { products: mockProducts }),
  getProductById: (id) => {
    const product = mockProducts.find(p => p.id === parseInt(id));
    return product 
      ? mockApiResponse(200, { product }) 
      : mockApiResponse(404, { error: 'Product not found' });
  },
  
  // Messages API
  getMessages: () => mockApiResponse(200, { messages: mockMessages }),
  getConversation: (id) => {
    const conversation = mockMessages.filter(m => m.conversationId === id);
    return conversation.length 
      ? mockApiResponse(200, { messages: conversation }) 
      : mockApiResponse(404, { error: 'Conversation not found' });
  },
  
  // Profile API
  getProfile: () => mockApiResponse(200, { profile: mockProfile }),
  updateProfile: (data) => mockApiResponse(200, { 
    profile: { ...mockProfile, ...data } 
  }),
  
  // Authentication API
  login: (credentials) => {
    if (credentials.email === 'test@example.edu' && credentials.password === 'password123') {
      return mockApiResponse(200, { 
        token: 'mock-jwt-token',
        user: mockProfile
      });
    }
    return mockApiResponse(401, { error: 'Invalid credentials' });
  },
  
  // Search API
  searchProducts: (query) => {
    const results = mockProducts.filter(p => 
      p.name.toLowerCase().includes(query.toLowerCase()) || 
      p.description.toLowerCase().includes(query.toLowerCase())
    );
    return mockApiResponse(200, { products: results });
  },
};

// Configure global fetch mock
const setupApiMocks = () => {
  global.fetch = jest.fn((url, options = {}) => {
    console.log(`[MOCK API] ${options.method || 'GET'} ${url}`);
    
    // Products endpoints
    if (url.match(/\/api\/products\/?$/)) {
      return handlers.getProducts();
    }
    
    if (url.match(/\/api\/products\/(\d+)/)) {
      const id = url.match(/\/api\/products\/(\d+)/)[1];
      return handlers.getProductById(id);
    }
    
    // Messages endpoints
    if (url.match(/\/api\/messages\/?$/)) {
      return handlers.getMessages();
    }
    
    if (url.match(/\/api\/conversations\/(.+)/)) {
      const id = url.match(/\/api\/conversations\/(.+)/)[1];
      return handlers.getConversation(id);
    }
    
    // Profile endpoints
    if (url.match(/\/api\/profile\/?$/)) {
      if (options.method === 'PUT') {
        const data = JSON.parse(options.body);
        return handlers.updateProfile(data);
      }
      return handlers.getProfile();
    }
    
    // Auth endpoints
    if (url.match(/\/api\/auth\/login\/?$/)) {
      const credentials = JSON.parse(options.body);
      return handlers.login(credentials);
    }
    
    // Search endpoint
    if (url.match(/\/api\/search\/?/)) {
      const query = new URL(url).searchParams.get('q');
      return handlers.searchProducts(query);
    }
    
    // Fallback for any unhandled routes
    console.warn(`[MOCK API] Unhandled API route: ${url}`);
    return mockApiResponse(404, { error: 'Not found' });
  });
  
  return {
    mockProducts,
    mockMessages,
    mockProfile,
    handlers,
    resetMocks: () => {
      global.fetch.mockClear();
    }
  };
};

module.exports = setupApiMocks;

// Add a simple test to avoid Jest error
describe('API Mock', () => {
  it('should export a function', () => {
    expect(typeof setupApiMocks).toBe('function');
  });
  
  it('should return mock data and handlers', () => {
    const mocks = setupApiMocks();
    expect(mocks.mockProducts).toBeDefined();
    expect(mocks.mockMessages).toBeDefined();
    expect(mocks.mockProfile).toBeDefined();
    expect(mocks.handlers).toBeDefined();
    expect(typeof mocks.resetMocks).toBe('function');
  });
});
/**
 * Jest Setup File
 * This file runs before each test file
 */

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => require('../mocks/asyncStorageMock'));

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/FontAwesome', () => 'FontAwesomeIcon');
jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIconsIcon');
jest.mock('react-native-vector-icons/Ionicons', () => 'IoniconsIcon');

// Mock navigation hooks
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      setOptions: jest.fn(),
      dispatch: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
    useIsFocused: () => true,
  };
});

// Global test setup
global.fetch = jest.fn();

// Suppress React 18 console warnings
jest.spyOn(console, 'error').mockImplementation((...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('ReactDOM.render is no longer supported')
  ) {
    return;
  }
  // eslint-disable-next-line no-console
  console.warn(...args);
});

// Reset all mocks automatically between tests
// This should be executed in individual test files, not in the setup
// beforeEach(() => {
//   jest.clearAllMocks();
//   global.fetch.mockClear();
// });

// Instead, ensure the mocks are reset initially
jest.clearAllMocks();
global.fetch.mockClear(); 
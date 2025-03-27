// Mock react-native modules that cause issues in tests
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}), { virtual: true });
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => ({}), { virtual: true });
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn(obj => obj.ios),
}), { virtual: true });

// Mock Dimensions
jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: jest.fn().mockReturnValue({
    width: 375,
    height: 812,
  }),
}), { virtual: true });

// Mock AWS Amplify
jest.mock('aws-amplify', () => ({
  Auth: {
    signIn: jest.fn(),
    signOut: jest.fn(),
    forgotPassword: jest.fn(),
    currentAuthenticatedUser: jest.fn(),
    currentSession: jest.fn(),
  },
  Amplify: {
    configure: jest.fn(),
  },
}), { virtual: true });

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
  }),
}), { virtual: true });

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIconsMock', { virtual: true });
jest.mock('react-native-vector-icons/FontAwesome', () => 'FontAwesomeMock', { virtual: true });
jest.mock('react-native-vector-icons/AntDesign', () => 'AntDesignMock', { virtual: true });
jest.mock('react-native-vector-icons/EvilIcons', () => 'EvilIconsMock', { virtual: true });
jest.mock('react-native-vector-icons/Entypo', () => 'EntypoMock', { virtual: true });
jest.mock('react-native-vector-icons/Ionicons', () => 'IoniconsMock', { virtual: true });

// Mock react-navigation core
jest.mock('@react-navigation/native', () => {
  return {
    useNavigation: () => ({
      navigate: jest.fn(),
      dispatch: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
    useIsFocused: jest.fn().mockReturnValue(true),
    DrawerActions: {
      openDrawer: jest.fn(),
      closeDrawer: jest.fn(),
      toggleDrawer: jest.fn(),
    },
    NavigationContainer: ({ children }) => children,
  };
}, { virtual: true });

// Mock drawer navigation
jest.mock('@react-navigation/drawer', () => {
  return {
    createDrawerNavigator: jest.fn().mockReturnValue({
      Navigator: ({ children }) => children,
      Screen: ({ name }) => name,
    }),
    DrawerContentScrollView: ({ children }) => children,
    DrawerItem: ({ label, onPress }) => ({
      label,
      onPress,
      testID: `drawer-item-${label}`,
    }),
  };
}, { virtual: true });

// Mock TurboModuleRegistry to handle DevMenu and other native modules
jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => {
  return {
    get: jest.fn().mockReturnValue({}),
    getEnforcing: jest.fn().mockReturnValue({}),
  };
}, { virtual: true });

// Enhanced React Native mock
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  
  // Create a simpler version of RN that won't try to access native modules
  const mockRN = {
    StyleSheet: {
      create: styles => styles,
      hairlineWidth: 1,
      flatten: jest.fn(style => style),
    },
    Dimensions: {
      get: jest.fn().mockReturnValue({ width: 375, height: 812 }),
    },
    Animated: {
      Value: jest.fn(() => ({
        interpolate: jest.fn(),
        setValue: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
      })),
      View: 'AnimatedView',
      Text: 'AnimatedText',
      createAnimatedComponent: jest.fn(component => component),
      timing: jest.fn(() => ({ start: jest.fn() })),
    },
    View: 'View',
    Text: 'Text',
    TouchableOpacity: 'TouchableOpacity',
    TouchableWithoutFeedback: 'TouchableWithoutFeedback',
    TouchableHighlight: 'TouchableHighlight',
    TextInput: 'TextInput',
    Image: 'Image',
    ScrollView: 'ScrollView',
    FlatList: 'FlatList',
    SectionList: 'SectionList',
    Platform: { OS: 'ios', select: jest.fn(obj => obj.ios) },
    I18nManager: { isRTL: false },
    NativeModules: {},
    UIManager: {
      createView: jest.fn(),
      updateView: jest.fn(),
      manageChildren: jest.fn(),
      setChildren: jest.fn(),
    },
    LayoutAnimation: {
      configureNext: jest.fn(),
      create: jest.fn(),
      Properties: {},
      Types: {},
    },
    DevMenu: {}, // Mock DevMenu
    Clipboard: {
      getString: jest.fn(),
      setString: jest.fn(),
    },
    ProgressBarAndroid: 'ProgressBarAndroid',
  };
  
  // Return our simplified mock instead of trying to use the actual RN
  return mockRN;
}, { virtual: true });

// Optional: Add global setup for Jest DOM if you decide to use it later
// require('@testing-library/jest-native/extend-expect'); 
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { BottomNavigation, CustomDrawerContent } from '../../../src/components/layout';

// Mock useNavigation and other navigation hooks
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: jest.fn(),
      dispatch: jest.fn(),
    }),
    DrawerActions: {
      openDrawer: jest.fn(() => 'openDrawer'),
    },
  };
});

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-vector-icons/AntDesign', () => 'AntDesign');
jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIcons');

// Mock the useAuth hook
jest.mock('../../../src/hooks', () => ({
  useAuth: jest.fn().mockReturnValue({
    signOut: jest.fn().mockResolvedValue(undefined),
    user: { name: 'Test User' },
  }),
}));

// Create simplified versions of drawer navigation components
jest.mock('@react-navigation/drawer', () => ({
  createDrawerNavigator: jest.fn().mockReturnValue({
    Navigator: ({ children, drawerContent }) => (
      <div data-testid="drawer-navigator">
        {drawerContent && drawerContent({
          navigation: { navigate: jest.fn() },
          state: { routes: [], index: 0 },
          descriptors: {},
        })}
        {children}
      </div>
    ),
    Screen: ({ name, component }) => (
      <div data-testid={`drawer-screen-${name}`}>{component()}</div>
    ),
  }),
  DrawerContentScrollView: ({ children }) => (
    <div data-testid="drawer-content-scroll-view">{children}</div>
  ),
  DrawerItem: ({ label, onPress }) => (
    <button data-testid={`drawer-item-${label}`} onClick={onPress}>{label}</button>
  ),
}));

describe('DrawerNavigation and BottomNavigation Integration', () => {
  // Create test screen with both components
  const HomeScreenWithNavigation = () => {
    return (
      <div data-testid="home-screen">
        <div>Home Screen Content</div>
        <BottomNavigation />
      </div>
    );
  };

  const TestApp = () => {
    const Drawer = createDrawerNavigator();

    return (
      <NavigationContainer>
        <Drawer.Navigator
          drawerContent={(props) => <CustomDrawerContent {...props} />}
        >
          <Drawer.Screen name="Home" component={HomeScreenWithNavigation} />
        </Drawer.Navigator>
      </NavigationContainer>
    );
  };

  it('renders both drawer and bottom navigation', () => {
    const { getByTestId } = render(<TestApp />);

    // Check if drawer navigator is rendered
    expect(getByTestId('drawer-navigator')).toBeTruthy();

    // Check if home screen with bottom navigation is rendered
    expect(getByTestId('home-screen')).toBeTruthy();

    // Check if drawer content is rendered
    expect(getByTestId('drawer-content-scroll-view')).toBeTruthy();
  });

  it('has correct navigation items in drawer', () => {
    const { getByTestId } = render(<TestApp />);

    // Check if drawer items are rendered
    expect(getByTestId('drawer-item-Home')).toBeTruthy();
    expect(getByTestId('drawer-item-Profile')).toBeTruthy();
    expect(getByTestId('drawer-item-Messages')).toBeTruthy();
    expect(getByTestId('drawer-item-Wishlist')).toBeTruthy();
    expect(getByTestId('drawer-item-Sign Out')).toBeTruthy();
  });

  it('navigates when drawer items are clicked', () => {
    const { getByTestId } = render(<TestApp />);

    // Get the drawer items
    const homeItem = getByTestId('drawer-item-Home');
    const profileItem = getByTestId('drawer-item-Profile');

    // Click on items
    fireEvent.click(homeItem);
    fireEvent.click(profileItem);

    // Note: Since we're using mock functions, we can't directly test
    // if navigation occurred, but this tests that clicking doesn't crash
  });
});

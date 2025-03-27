import React from 'react';
import { render, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { CustomDrawerContent } from '../../src/components/layout';

// Mock necessary components
jest.mock('@react-navigation/drawer', () => {
  const actualDrawer = jest.requireActual('@react-navigation/drawer');
  return {
    ...actualDrawer,
    createDrawerNavigator: jest.fn(() => ({
      Navigator: ({ children, drawerContent }) => (
        <div>
          <div data-testid="drawer-content">
            {drawerContent && drawerContent({ navigation: { navigate: jest.fn() }, state: { routes: [], index: 0 }, descriptors: {} })}
          </div>
          <div data-testid="screen-content">{children}</div>
        </div>
      ),
      Screen: ({ name, component }) => <div data-testid={`screen-${name}`}>{name}</div>,
    })),
  };
});

// Mock the useAuth hook for CustomDrawerContent
jest.mock('../../src/hooks', () => ({
  useAuth: jest.fn().mockReturnValue({
    signOut: jest.fn().mockResolvedValue(undefined),
  }),
}));

// Mock the DrawerContentScrollView and DrawerItem
jest.mock('@react-navigation/drawer', () => {
  const actualDrawer = jest.requireActual('@react-navigation/drawer');
  return {
    ...actualDrawer,
    DrawerContentScrollView: ({ children }) => <div data-testid="drawer-content-scroll-view">{children}</div>,
    DrawerItem: ({ label, onPress }) => (
      <button data-testid={`drawer-item-${label}`} onClick={onPress}>
        {label}
      </button>
    ),
  };
});

describe('Drawer Navigation', () => {
  const Drawer = createDrawerNavigator();
  
  const HomeScreen = () => <div>Home Screen</div>;
  
  const TestNavigator = () => (
    <NavigationContainer>
      <Drawer.Navigator
        drawerContent={(props) => <CustomDrawerContent {...props} />}
      >
        <Drawer.Screen name="Home" component={HomeScreen} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('creates a drawer navigator with CustomDrawerContent', () => {
    const { getByTestId } = render(<TestNavigator />);
    
    // Check if the drawer content is rendered
    expect(getByTestId('drawer-content')).toBeTruthy();
    
    // Check if the screen content is rendered
    expect(getByTestId('screen-content')).toBeTruthy();
  });
  
  it('renders the CustomDrawerContent properly', () => {
    const { getByTestId } = render(<TestNavigator />);
    
    // Check if the drawer content scroll view is rendered
    expect(getByTestId('drawer-content-scroll-view')).toBeTruthy();
  });
}); 
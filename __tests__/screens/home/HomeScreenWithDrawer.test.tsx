import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HomeScreen } from '../../../src/screens/home';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../../src/hooks';

// Mock react-navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  DrawerActions: {
    openDrawer: jest.fn(() => 'openDrawer'),
  },
}));

// Mock hooks
jest.mock('../../../src/hooks', () => ({
  useAuth: jest.fn(),
}));

// Mock icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIcons');
jest.mock('react-native-vector-icons/FontAwesome', () => 'FontAwesome');
jest.mock('react-native-vector-icons/AntDesign', () => 'AntDesign');
jest.mock('react-native-vector-icons/EvilIcons', () => 'EvilIcons');
jest.mock('react-native-vector-icons/Entypo', () => 'Entypoicon');

describe('HomeScreen with Drawer Navigation', () => {
  // Mock navigation and dispatch
  const mockNavigate = jest.fn();
  const mockDispatch = jest.fn();
  const mockNavigation = {
    navigate: mockNavigate,
    dispatch: mockDispatch,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    (useAuth as jest.Mock).mockReturnValue({
      user: { name: 'Test User' },
    });
  });

  it('renders correctly with drawer menu button', () => {
    const { getByTestId } = render(<HomeScreen />);
    
    // Check if menu button exists
    expect(getByTestId('menu-button')).toBeTruthy();
  });

  it('opens the drawer when menu button is pressed', () => {
    const { getByTestId } = render(<HomeScreen />);
    
    // Press the menu button
    fireEvent.press(getByTestId('menu-button'));
    
    // Check if dispatch was called with openDrawer action
    expect(mockDispatch).toHaveBeenCalledWith(DrawerActions.openDrawer());
  });

  it('navigates to profile when profile button is pressed', () => {
    const { getByTestId } = render(<HomeScreen />);
    
    // Press the profile button
    fireEvent.press(getByTestId('profile-button'));
    
    // Check if navigate was called with correct screen
    expect(mockNavigate).toHaveBeenCalledWith('Profile');
  });

  it('displays first letter of user name in profile circle', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { name: 'John Doe' },
    });
    
    const { getByText } = render(<HomeScreen />);
    
    // Check if the first letter of user name is displayed
    expect(getByText('J')).toBeTruthy();
  });

  it('uses username initial when name is not available', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { username: 'jdoe', name: undefined },
    });
    
    const { getByText } = render(<HomeScreen />);
    
    // Check if the first letter of username is displayed
    expect(getByText('J')).toBeTruthy();
  });

  it('uses default initial when no user name or username available', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { },
    });
    
    const { getByText } = render(<HomeScreen />);
    
    // Check if default initial is displayed
    expect(getByText('U')).toBeTruthy();
  });
}); 
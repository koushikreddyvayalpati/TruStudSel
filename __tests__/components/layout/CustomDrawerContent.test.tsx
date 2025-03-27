import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CustomDrawerContent from '../../../src/components/layout/CustomDrawerContent';
import { useAuth } from '../../../src/hooks';

// Mock the useAuth hook
jest.mock('../../../src/hooks', () => ({
  useAuth: jest.fn(),
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  closeDrawer: jest.fn(),
};

// Mock DrawerContentScrollView since it's a complex component from react-navigation
jest.mock('@react-navigation/drawer', () => ({
  DrawerContentScrollView: ({ children }) => <>{children}</>,
  DrawerItem: ({ onPress, label, icon }) => {
    const Icon = icon({ color: 'black', size: 24 });
    return (
      <button testID={`drawer-item-${label}`} onPress={onPress}>
        {Icon}
        {label}
      </button>
    );
  },
}));

describe('CustomDrawerContent', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default auth mock
    (useAuth as jest.Mock).mockReturnValue({
      signOut: jest.fn().mockResolvedValue(undefined),
    });
  });

  it('renders correctly with basic navigation items', () => {
    const { getByText } = render(
      <CustomDrawerContent 
        navigation={mockNavigation as any} 
        state={{ routes: [], index: 0 }} 
        descriptors={{}} 
      />
    );
    
    // Check if the header renders correctly
    expect(getByText('Menu')).toBeTruthy();
    
    // Check if all navigation items are rendered
    expect(getByText('Home')).toBeTruthy();
    expect(getByText('Profile')).toBeTruthy();
    expect(getByText('Messages')).toBeTruthy();
    expect(getByText('Wishlist')).toBeTruthy();
    expect(getByText('Sign Out')).toBeTruthy();
  });

  it('navigates correctly when navigation items are pressed', () => {
    const { getByTestId } = render(
      <CustomDrawerContent 
        navigation={mockNavigation as any} 
        state={{ routes: [], index: 0 }} 
        descriptors={{}} 
      />
    );
    
    // Press Home item
    fireEvent.press(getByTestId('drawer-item-Home'));
    expect(mockNavigate).toHaveBeenCalledWith('MainStack', undefined);
    
    // Press Profile item
    fireEvent.press(getByTestId('drawer-item-Profile'));
    expect(mockNavigate).toHaveBeenCalledWith('Profile', undefined);
    
    // Press Messages item
    fireEvent.press(getByTestId('drawer-item-Messages'));
    expect(mockNavigate).toHaveBeenCalledWith('MessagesScreen', undefined);
    
    // Press Wishlist item
    fireEvent.press(getByTestId('drawer-item-Wishlist'));
    expect(mockNavigate).toHaveBeenCalledWith('Wishlist', { wishlist: [] });
  });

  it('calls sign out when Sign Out is pressed', () => {
    const mockSignOut = jest.fn().mockResolvedValue(undefined);
    (useAuth as jest.Mock).mockReturnValue({ signOut: mockSignOut });
    
    const { getByTestId } = render(
      <CustomDrawerContent 
        navigation={mockNavigation as any} 
        state={{ routes: [], index: 0 }} 
        descriptors={{}} 
      />
    );
    
    // Press Sign Out item
    fireEvent.press(getByTestId('drawer-item-Sign Out'));
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('handles sign out error gracefully', async () => {
    // Mock console.error to track calls
    const originalConsoleError = console.error;
    console.error = jest.fn();
    
    // Mock signOut to reject with an error
    const mockError = new Error('Sign out failed');
    const mockSignOut = jest.fn().mockRejectedValue(mockError);
    (useAuth as jest.Mock).mockReturnValue({ signOut: mockSignOut });
    
    const { getByTestId } = render(
      <CustomDrawerContent 
        navigation={mockNavigation as any} 
        state={{ routes: [], index: 0 }} 
        descriptors={{}} 
      />
    );
    
    // Press Sign Out item
    fireEvent.press(getByTestId('drawer-item-Sign Out'));
    
    // Wait for the promise to resolve/reject
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Check if error was logged
    expect(console.error).toHaveBeenCalledWith('Error signing out:', mockError);
    
    // Restore console.error
    console.error = originalConsoleError;
  });
}); 
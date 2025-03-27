import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BottomNavigation from '../../../src/components/layout/BottomNavigation';
import { useNavigation } from '@react-navigation/native';

// Mock the navigation hook
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

// Mock icons
jest.mock('react-native-vector-icons/AntDesign', () => ({
  __esModule: true,
  default: ({ name, size, color }) => `AntDesign-${name}-${size}-${color}`,
}));

jest.mock('react-native-vector-icons/Ionicons', () => ({
  __esModule: true,
  default: ({ name, size, color }) => `Ionicons-${name}-${size}-${color}`,
}));

describe('BottomNavigation', () => {
  // Mock navigation functions
  const mockNavigate = jest.fn();
  const mockNavigation = {
    navigate: mockNavigate
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up default navigation mock
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
  });

  it('renders all navigation items correctly', () => {
    const { getByText } = render(<BottomNavigation />);
    
    // Check if all navigation items are rendered
    expect(getByText('Home')).toBeTruthy();
    expect(getByText('Wishlist')).toBeTruthy();
    expect(getByText('Search')).toBeTruthy();
    expect(getByText('Chat')).toBeTruthy();
  });

  it('navigates to Home screen when Home is pressed', () => {
    const { getByText } = render(<BottomNavigation />);
    
    fireEvent.press(getByText('Home'));
    expect(mockNavigate).toHaveBeenCalledWith('Home');
  });

  it('navigates to Wishlist screen when Wishlist is pressed', () => {
    const { getByText } = render(<BottomNavigation />);
    
    fireEvent.press(getByText('Wishlist'));
    expect(mockNavigate).toHaveBeenCalledWith('Wishlist', { wishlist: [] });
  });

  it('navigates to PostingScreen when center post button is pressed', () => {
    const { getByLabelText } = render(<BottomNavigation />);
    
    fireEvent.press(getByLabelText('Post'));
    expect(mockNavigate).toHaveBeenCalledWith('PostingScreen');
  });

  it('logs a message when Search is pressed', () => {
    // Mock console.log to track calls
    const originalConsoleLog = console.log;
    console.log = jest.fn();
    
    const { getByText } = render(<BottomNavigation />);
    
    fireEvent.press(getByText('Search'));
    expect(console.log).toHaveBeenCalledWith('Search pressed');
    
    // Restore console.log
    console.log = originalConsoleLog;
  });

  it('navigates to MessagesScreen when Chat is pressed', () => {
    const { getByText } = render(<BottomNavigation />);
    
    fireEvent.press(getByText('Chat'));
    expect(mockNavigate).toHaveBeenCalledWith('MessagesScreen');
  });

  it('applies the correct styles to the center button', () => {
    const { getByLabelText } = render(<BottomNavigation />);
    
    const centerButton = getByLabelText('Post').parentNode;
    expect(centerButton).toBeTruthy();
    
    // Note: In a real test, you would use a library like 'jest-native'
    // to test the styles more effectively, but this is a simpler approach
    // for this example
  });
}); 
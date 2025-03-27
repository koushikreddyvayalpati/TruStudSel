import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BottomNavigation from '../../../src/components/layout/BottomNavigation';
import { useNavigation } from '@react-navigation/native';

// Mock the navigation hook
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

// Mock icons
jest.mock('react-native-vector-icons/AntDesign', () => 'AntDesignMock');
jest.mock('react-native-vector-icons/Ionicons', () => 'IoniconsMock');

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
    const { getByA11yLabel } = render(<BottomNavigation />);
    
    fireEvent.press(getByA11yLabel('Post'));
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

  it('contains the expected number of navigation items', () => {
    const { getAllByRole } = render(<BottomNavigation />);
    
    // There should be 5 touchable items (Home, Wishlist, Post, Search, Chat)
    // Note: In React Native Testing Library, Touchable components are given the
    // 'button' role automatically
    expect(getAllByRole('button')).toHaveLength(5);
  });
}); 
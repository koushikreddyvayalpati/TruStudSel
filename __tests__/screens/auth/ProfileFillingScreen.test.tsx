import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ProfileFillingScreen from '../../../src/screens/auth/ProfileFillingScreen';
import { useTheme } from '../../../src/hooks';
import { useAuth } from '../../../src/contexts';

// Mock the hooks and context
jest.mock('../../../src/hooks', () => ({
  useTheme: jest.fn()
}));

jest.mock('../../../src/contexts', () => ({
  useAuth: jest.fn()
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('ProfileFillingScreen', () => {
  // Mock props
  const mockRoute = {
    params: {
      email: 'test@example.edu',
      username: 'Test User'
    }
  };
  
  // Navigation mocks
  const mockNavigate = jest.fn();
  const mockGoBack = jest.fn();
  const mockReset = jest.fn();
  
  const mockNavigation = {
    navigate: mockNavigate,
    goBack: mockGoBack,
    reset: mockReset
  };
  
  // Auth context mock
  const mockUpdateUserAttributes = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock theme hook
    (useTheme as jest.Mock).mockReturnValue({
      theme: {
        colors: {
          background: '#FFFFFF',
          primary: '#F7B305',
          secondary: '#2E3A59',
          textSecondary: '#666666',
          text: '#333333',
          buttonText: '#FFFFFF',
          surface: '#E1E1E1'
        }
      }
    });
    
    // Mock auth context
    (useAuth as jest.Mock).mockReturnValue({
      updateUserAttributes: mockUpdateUserAttributes
    });
    
    // Console spy to silence console.error during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  it('renders the profile filling screen correctly', () => {
    const { getByText, getByPlaceholderText } = render(
      <ProfileFillingScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );
    
    // Check for title and subtitle
    expect(getByText('You\'re Almost Done')).toBeTruthy();
    expect(getByText('Please fill in the following details')).toBeTruthy();
    
    // Check for input fields
    expect(getByPlaceholderText('Enter your name')).toBeTruthy();
    expect(getByPlaceholderText('Your email')).toBeTruthy();
    expect(getByPlaceholderText('Enter your university')).toBeTruthy();
    expect(getByPlaceholderText('E.g., Electronics, Books, Furniture')).toBeTruthy();
    expect(getByPlaceholderText('YYYY-MM-DD')).toBeTruthy();
    
    // Check for profile picture section
    expect(getByText('T')).toBeTruthy(); // First letter of Test User
    expect(getByText('Upload Profile Picture')).toBeTruthy();
    
    // Check for button
    expect(getByText('Complete Profile')).toBeTruthy();
  });
  
  it('validates university before completing profile', async () => {
    const { getByText } = render(
      <ProfileFillingScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );
    
    // Press Complete Profile without entering university
    fireEvent.press(getByText('Complete Profile'));
    
    // Should show error alert
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter your university');
    });
    
    // Update user attributes should not be called
    expect(mockUpdateUserAttributes).not.toHaveBeenCalled();
  });
  
  it('successfully completes the profile with valid data', async () => {
    const { getByText, getByPlaceholderText } = render(
      <ProfileFillingScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );
    
    // Enter required data
    fireEvent.changeText(getByPlaceholderText('Enter your university'), 'Example University');
    fireEvent.changeText(getByPlaceholderText('E.g., Electronics, Books, Furniture'), 'Electronics, Books');
    fireEvent.changeText(getByPlaceholderText('YYYY-MM-DD'), '1995-01-15');
    
    // Mock successful update
    mockUpdateUserAttributes.mockResolvedValueOnce({});
    
    // Press Complete Profile
    fireEvent.press(getByText('Complete Profile'));
    
    // Wait for the async call to complete
    await waitFor(() => {
      expect(mockUpdateUserAttributes).toHaveBeenCalledWith({
        'custom:university': 'Example University',
        'custom:preferredCategory': 'Electronics, Books',
        'birthdate': '1995-01-15',
      });
    });
    
    // Should reset navigation to home
    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Home' }]
    });
  });
  
  it('handles error when updating user attributes', async () => {
    const errorMessage = 'Failed to update attributes';
    mockUpdateUserAttributes.mockRejectedValueOnce(new Error(errorMessage));
    
    const { getByText, getByPlaceholderText } = render(
      <ProfileFillingScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );
    
    // Enter required data
    fireEvent.changeText(getByPlaceholderText('Enter your university'), 'Example University');
    
    // Press Complete Profile
    fireEvent.press(getByText('Complete Profile'));
    
    // Wait for the async call to complete
    await waitFor(() => {
      expect(mockUpdateUserAttributes).toHaveBeenCalled();
    });
    
    // Should show error alert
    expect(Alert.alert).toHaveBeenCalledWith('Error', errorMessage);
    
    // Should not reset navigation
    expect(mockReset).not.toHaveBeenCalled();
  });
  
  it('shows alert when upload profile picture is pressed', () => {
    const { getByText } = render(
      <ProfileFillingScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );
    
    // Press Upload Profile Picture
    fireEvent.press(getByText('Upload Profile Picture'));
    
    // Should show info alert
    expect(Alert.alert).toHaveBeenCalledWith(
      'Upload Profile Picture',
      'Profile picture upload feature will be implemented in future updates.'
    );
  });
}); 
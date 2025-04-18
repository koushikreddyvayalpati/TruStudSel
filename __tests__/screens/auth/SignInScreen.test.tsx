import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SignInScreen from '../../../src/screens/auth/SignInScreen';
import { useAuth } from '../../../src/contexts';
import { useTheme } from '../../../src/hooks';
import { useNavigation } from '@react-navigation/native';

// Mock the hooks and context
jest.mock('../../../src/hooks', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../../src/contexts', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('SignInScreen', () => {
  // Mocked functions
  const mockSignIn = jest.fn();
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock theme hook
    (useTheme as jest.Mock).mockReturnValue({
      theme: {
        colors: {
          background: '#FFFFFF',
          primary: '#F7B305',
          secondary: '#2E3A59',
          text: '#333333',
          buttonText: '#FFFFFF',
          error: '#FF0000',
        },
      },
    });

    // Mock auth context
    (useAuth as jest.Mock).mockReturnValue({
      signIn: mockSignIn,
    });

    // Mock navigation
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });
  });

  it('renders the login form correctly', () => {
    const { getByText, getByPlaceholderText } = render(<SignInScreen />);

    // Check for title
    expect(getByText('TruStudSel')).toBeTruthy();

    // Check for input fields
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByPlaceholderText('Enter your password')).toBeTruthy();

    // Check for buttons
    expect(getByText('Login')).toBeTruthy();
    expect(getByText('Create Account')).toBeTruthy();
    expect(getByText('Forgot Password?')).toBeTruthy();
  });

  it('validates form inputs before submission', async () => {
    const { getByText } = render(<SignInScreen />);

    // Press login without entering credentials
    fireEvent.press(getByText('Login'));

    // Should show error alert
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please enter both username and password'
      );
    });

    // Sign in function should not be called
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('submits the form with entered credentials', async () => {
    const { getByText, getByPlaceholderText } = render(<SignInScreen />);

    // Enter credentials
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'user@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');

    // Mock successful sign in
    mockSignIn.mockResolvedValueOnce({
      username: 'user@example.com',
      attributes: { email: 'user@example.com' },
    });

    // Press login button
    fireEvent.press(getByText('Login'));

    // Wait for the async call to complete
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('user@example.com', 'password123');
    });
  });

  it('shows error message when login fails', async () => {
    const { getByText, getByPlaceholderText } = render(<SignInScreen />);

    // Enter credentials
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'user@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');

    // Mock failed sign in
    const error = new Error('Invalid credentials');
    mockSignIn.mockRejectedValueOnce(error);

    // Press login button
    fireEvent.press(getByText('Login'));

    // Wait for the async call to complete and check for error alert
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Login Error', 'Invalid credentials');
    });
  });

  it('navigates to EmailVerification when Create Account is pressed', () => {
    const { getByText } = render(<SignInScreen />);

    // Press Create Account button
    fireEvent.press(getByText('Create Account'));

    // Check navigation
    expect(mockNavigate).toHaveBeenCalledWith('EmailVerification', { email: '' });
  });

  it('navigates to ForgotPassword when Forgot Password is pressed', () => {
    const { getByText } = render(<SignInScreen />);

    // Press Forgot Password button
    fireEvent.press(getByText('Forgot Password?'));

    // Check navigation
    expect(mockNavigate).toHaveBeenCalledWith('ForgotPassword');
  });
});

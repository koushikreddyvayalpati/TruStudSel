import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import EmailVerificationScreen from '../../../src/screens/auth/EmailVerificationScreen';
import { Auth } from 'aws-amplify';
import { useTheme } from '../../../src/hooks';
import { useNavigation } from '@react-navigation/native';

// Mock the hooks and services
jest.mock('../../../src/hooks', () => ({
  useTheme: jest.fn()
}));

jest.mock('aws-amplify', () => ({
  Auth: {
    signUp: jest.fn(),
    resendSignUp: jest.fn()
  }
}));

// Mock navigation
jest.mock('@react-navigation/native', () => {
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: jest.fn()
  };
});

// Mock Alert
jest.spyOn(Alert, 'alert');

// Create a wrapper component to bypass the navigation prop requirement
// since the actual component uses useNavigation internally
const TestEmailVerificationScreen: React.FC<any> = (props) => {
  return <EmailVerificationScreen navigation={{} as any} {...props} />;
};

describe('EmailVerificationScreen', () => {
  // Navigation mocks
  const mockNavigate = jest.fn();
  const mockGoBack = jest.fn();
  const mockReset = jest.fn();
  
  // Mock route
  const mockRoute = {
    params: {
      email: 'test@example.edu'
    }
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup navigation mock
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
      reset: mockReset
    });
    
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
          error: '#FF0000'
        }
      }
    });

    // Reset mock implementations
    (Auth.signUp as jest.Mock).mockReset();
    if (Auth.resendSignUp) {
      (Auth.resendSignUp as jest.Mock).mockReset();
    }
    
    // Console spy to silence console.log during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  
  it('renders the email verification screen correctly', () => {
    const { getByText, getByPlaceholderText } = render(
      <TestEmailVerificationScreen route={mockRoute as any} />
    );
    
    // Check for title and subtitle
    expect(getByText('Create Account')).toBeTruthy();
    expect(getByText('Please fill in your details')).toBeTruthy();
    
    // Check for input fields
    expect(getByPlaceholderText('Enter your full name')).toBeTruthy();
    expect(getByPlaceholderText('Enter your .edu email')).toBeTruthy();
    expect(getByPlaceholderText('Enter with country code (e.g., +1...)')).toBeTruthy();
    
    // Check for buttons
    expect(getByText('Continue')).toBeTruthy();
    expect(getByText('Return to Sign In')).toBeTruthy();
  });
  
  it('validates email is a .edu address', async () => {
    const { getByText, getByPlaceholderText } = render(
      <TestEmailVerificationScreen route={mockRoute as any} />
    );
    
    // Enter non-edu email and try to continue
    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('Enter your .edu email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter with country code (e.g., +1...)'), '+15551234567');
    
    // Press Continue button
    fireEvent.press(getByText('Continue'));
    
    // Should show error alert for invalid email
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please enter a valid .edu email address'
      );
    });
  });
  
  it('validates phone number format', async () => {
    const { getByText, getByPlaceholderText } = render(
      <TestEmailVerificationScreen route={mockRoute as any} />
    );
    
    // Enter invalid phone number and try to continue
    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('Enter your .edu email'), 'test@example.edu');
    fireEvent.changeText(getByPlaceholderText('Enter with country code (e.g., +1...)'), '123'); // Too short
    
    // Press Continue button
    fireEvent.press(getByText('Continue'));
    
    // Should show error alert for invalid phone number
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please enter a valid phone number (10-15 digits)'
      );
    });
  });
  
  it('handles successful sign up', async () => {
    // Mock successful Auth.signUp
    (Auth.signUp as jest.Mock).mockResolvedValueOnce({
      user: { username: 'test@example.edu' }
    });
    
    const { getByText, getByPlaceholderText } = render(
      <TestEmailVerificationScreen route={mockRoute as any} />
    );
    
    // Fill in all required fields correctly
    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('Enter your .edu email'), 'test@example.edu');
    fireEvent.changeText(getByPlaceholderText('Enter with country code (e.g., +1...)'), '+15551234567');
    
    // Press Continue button
    fireEvent.press(getByText('Continue'));
    
    // Wait for the async call to complete
    await waitFor(() => {
      expect(Auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'test@example.edu',
          attributes: expect.objectContaining({
            email: 'test@example.edu',
            phone_number: '+15551234567',
            name: 'Test User'
          })
        })
      );
    });
    
    // Check navigation
    expect(mockNavigate).toHaveBeenCalledWith('OtpInput', expect.objectContaining({
      email: 'test@example.edu',
      tempPassword: expect.any(String),
      name: 'Test User',
      phoneNumber: '+15551234567'
    }));
  });
  
  it('handles existing user error', async () => {
    // Mock Auth.signUp error for existing user
    (Auth.signUp as jest.Mock).mockRejectedValueOnce({
      code: 'UsernameExistsException',
      message: 'An account with the given email already exists.'
    });
    
    const { getByText, getByPlaceholderText } = render(
      <TestEmailVerificationScreen route={mockRoute as any} />
    );
    
    // Fill in all required fields correctly
    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('Enter your .edu email'), 'test@example.edu');
    fireEvent.changeText(getByPlaceholderText('Enter with country code (e.g., +1...)'), '+15551234567');
    
    // Press Continue button
    fireEvent.press(getByText('Continue'));
    
    // Wait for the async call to complete
    await waitFor(() => {
      expect(Auth.signUp).toHaveBeenCalled();
    });
    
    // Check for account exists alert
    expect(Alert.alert).toHaveBeenCalledWith(
      'Account Exists',
      'An account with this email already exists. Would you like to resend the verification code?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Resend' })
      ])
    );
  });
  
  it('navigates back to sign in screen', () => {
    const { getByText } = render(
      <TestEmailVerificationScreen route={mockRoute as any} />
    );
    
    // Press Return to Sign In button
    fireEvent.press(getByText('Return to Sign In'));
    
    // Check navigation
    expect(mockGoBack).toHaveBeenCalled();
  });
}); 
import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import OtpInputScreen from '../../../src/screens/auth/OtpInputScreen';
import { Auth } from 'aws-amplify';
import { useTheme } from '../../../src/hooks';
import { OtpInputScreenRouteProp, OtpInputScreenNavigationProp } from '../../../src/types/navigation.types';

// Mock the hooks and services
jest.mock('../../../src/hooks', () => ({
  useTheme: jest.fn()
}));

jest.mock('aws-amplify', () => ({
  Auth: {
    confirmSignUp: jest.fn(),
    signIn: jest.fn(),
    resendSignUp: jest.fn()
  }
}));

// Mock navigation types
jest.mock('../../../src/types/navigation.types', () => ({
  // Create mock types for testing
  OtpInputScreenRouteProp: {},
  OtpInputScreenNavigationProp: {}
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('OtpInputScreen', () => {
  // Mock route and navigation
  const mockRoute = {
    params: {
      email: 'test@example.edu',
      tempPassword: 'tempPass123',
      name: 'Test User',
      phoneNumber: '+15551234567'
    },
    key: 'OtpInput-1',
    name: 'OtpInput'
  } as OtpInputScreenRouteProp;
  
  const mockNavigate = jest.fn();
  const mockGoBack = jest.fn();
  const mockReset = jest.fn();
  const mockDispatch = jest.fn();
  
  const mockNavigation = {
    navigate: mockNavigate,
    goBack: mockGoBack,
    reset: mockReset,
    dispatch: mockDispatch
  } as unknown as OtpInputScreenNavigationProp;
  
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
          error: '#FF0000'
        }
      }
    });

    // Reset mock implementations
    (Auth.confirmSignUp as jest.Mock).mockReset();
    (Auth.signIn as jest.Mock).mockReset();
    (Auth.resendSignUp as jest.Mock).mockReset();
    
    // Console spy to silence console.log during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  
  it('renders the OTP verification screen correctly', () => {
    const { getByText, getByPlaceholderText } = render(
      <OtpInputScreen route={mockRoute} navigation={mockNavigation as any} />
    );
    
    // Check for title and subtitle
    expect(getByText('Verify Your Account')).toBeTruthy();
    expect(getByText(`We've sent a code to ${mockRoute.params.email}`)).toBeTruthy();
    
    // Check for input fields
    expect(getByPlaceholderText('Enter verification code')).toBeTruthy();
    expect(getByPlaceholderText('Create a strong password')).toBeTruthy();
    expect(getByPlaceholderText('Confirm your password')).toBeTruthy();
    
    // Check for buttons
    expect(getByText('Create Account')).toBeTruthy();
    expect(getByText('Resend Verification Code')).toBeTruthy();
    expect(getByText('Back to Email Verification')).toBeTruthy();
  });
  
  it('validates form inputs before submission', async () => {
    const { getByText } = render(
      <OtpInputScreen route={mockRoute} navigation={mockNavigation as any} />
    );
    
    // Press Create Account without entering verification code
    fireEvent.press(getByText('Create Account'));
    
    // Should show error alert for missing code
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error', 
        'Please enter the verification code'
      );
    });
    
    // Auth.confirmSignUp should not be called
    expect(Auth.confirmSignUp).not.toHaveBeenCalled();
  });
  
  it('validates password length', async () => {
    const { getByText, getByPlaceholderText } = render(
      <OtpInputScreen route={mockRoute} navigation={mockNavigation as any} />
    );
    
    // Enter valid verification code but short password
    fireEvent.changeText(getByPlaceholderText('Enter verification code'), '123456');
    fireEvent.changeText(getByPlaceholderText('Create a strong password'), 'short');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'short');
    
    // Clear Alert mock
    (Alert.alert as jest.Mock).mockClear();
    
    // Press Create Account button
    fireEvent.press(getByText('Create Account'));
    
    // Use a longer timeout to ensure validation has time to run
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check that the Alert.alert was called with the expected message
    expect(Alert.alert).toHaveBeenCalledWith(
      'Error',
      'Password must be at least 8 characters long'
    );
  });
  
  it('validates password matching', async () => {
    const { getByText, getByPlaceholderText } = render(
      <OtpInputScreen route={mockRoute} navigation={mockNavigation as any} />
    );
    
    // Enter verification code and mismatched passwords
    fireEvent.changeText(getByPlaceholderText('Enter verification code'), '123456');
    fireEvent.changeText(getByPlaceholderText('Create a strong password'), 'Password123!');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'Password456!');
    
    // Clear Alert mock
    (Alert.alert as jest.Mock).mockClear();
    
    // Press Create Account button
    fireEvent.press(getByText('Create Account'));
    
    // Should show error alert for mismatched passwords
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error', 
        'Passwords do not match'
      );
    });
  });
  
  it('handles successful account verification and sign in', async () => {
    // Mock successful confirmSignUp and signIn
    (Auth.confirmSignUp as jest.Mock).mockResolvedValueOnce({});
    (Auth.signIn as jest.Mock).mockResolvedValueOnce({});
    
    const { getByText, getByPlaceholderText } = render(
      <OtpInputScreen route={mockRoute} navigation={mockNavigation as any} />
    );
    
    // Enter verification code and matching passwords
    fireEvent.changeText(getByPlaceholderText('Enter verification code'), '123456');
    fireEvent.changeText(getByPlaceholderText('Create a strong password'), 'Password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'Password123');
    
    // Press Create Account
    fireEvent.press(getByText('Create Account'));
    
    // Wait for the async call to complete
    await waitFor(() => {
      expect(Auth.confirmSignUp).toHaveBeenCalledWith(mockRoute.params.email, '123456');
      expect(Auth.signIn).toHaveBeenCalledWith(mockRoute.params.email, 'Password123');
    });
    
    // Check for success alert
    expect(Alert.alert).toHaveBeenCalledWith(
      'Success', 
      'Account created and verified successfully!',
      expect.arrayContaining([
        expect.objectContaining({
          text: 'OK',
          onPress: expect.any(Function)
        })
      ])
    );
    
    // Simulate pressing OK on alert
    const alertAction = (Alert.alert as jest.Mock).mock.calls[0][2][0];
    alertAction.onPress();
    
    // Should try to navigate
    expect(mockNavigate).toHaveBeenCalledWith('ProfileFillingPage', {
      email: mockRoute.params.email,
      username: mockRoute.params.email
    });
  });
  
  it('handles successful verification but failed sign in', async () => {
    // Mock successful confirmSignUp but failed signIn
    (Auth.confirmSignUp as jest.Mock).mockResolvedValueOnce({});
    (Auth.signIn as jest.Mock).mockRejectedValueOnce(new Error('Sign in failed'));
    
    const { getByText, getByPlaceholderText } = render(
      <OtpInputScreen route={mockRoute} navigation={mockNavigation as any} />
    );
    
    // Enter verification code and matching passwords
    fireEvent.changeText(getByPlaceholderText('Enter verification code'), '123456');
    fireEvent.changeText(getByPlaceholderText('Create a strong password'), 'Password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'Password123');
    
    // Press Create Account
    fireEvent.press(getByText('Create Account'));
    
    // Wait for the async call to complete
    await waitFor(() => {
      expect(Auth.confirmSignUp).toHaveBeenCalledWith(mockRoute.params.email, '123456');
      expect(Auth.signIn).toHaveBeenCalledWith(mockRoute.params.email, 'Password123');
    });
    
    // Check for modified success alert
    expect(Alert.alert).toHaveBeenCalledWith(
      'Account Created', 
      'Your account was created successfully. Please sign in with your email and password.',
      expect.arrayContaining([
        expect.objectContaining({
          text: 'OK',
          onPress: expect.any(Function)
        })
      ])
    );
    
    // Simulate pressing OK on alert
    const alertAction = (Alert.alert as jest.Mock).mock.calls[0][2][0];
    alertAction.onPress();
    
    // Should try to navigate to SignIn
    expect(mockNavigate).toHaveBeenCalledWith('SignIn', undefined);
  });
  
  it('handles verification error with invalid code', async () => {
    // Mock failed confirmSignUp
    (Auth.confirmSignUp as jest.Mock).mockRejectedValueOnce({
      code: 'CodeMismatchException',
      message: 'Invalid verification code'
    });
    
    const { getByText, getByPlaceholderText } = render(
      <OtpInputScreen route={mockRoute} navigation={mockNavigation as any} />
    );
    
    // Enter verification code and matching passwords
    fireEvent.changeText(getByPlaceholderText('Enter verification code'), '123456');
    fireEvent.changeText(getByPlaceholderText('Create a strong password'), 'Password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'Password123');
    
    // Press Create Account
    fireEvent.press(getByText('Create Account'));
    
    // Wait for the async call to complete
    await waitFor(() => {
      expect(Auth.confirmSignUp).toHaveBeenCalledWith(mockRoute.params.email, '123456');
    });
    
    // Check for error alert
    expect(Alert.alert).toHaveBeenCalledWith(
      'Error', 
      'Invalid verification code. Please try again.'
    );
  });
  
  it('handles resend verification code', async () => {
    // Mock successful resendSignUp
    (Auth.resendSignUp as jest.Mock).mockResolvedValueOnce({});
    
    const { getByText } = render(
      <OtpInputScreen route={mockRoute} navigation={mockNavigation as any} />
    );
    
    // Press Resend Verification Code
    fireEvent.press(getByText('Resend Verification Code'));
    
    // Wait for the async call to complete
    await waitFor(() => {
      expect(Auth.resendSignUp).toHaveBeenCalledWith(mockRoute.params.email);
    });
    
    // Check for success alert
    expect(Alert.alert).toHaveBeenCalledWith(
      'Success', 
      'Verification code has been resent to your email'
    );
  });
  
  it('handles resend verification code error', async () => {
    // Mock failed resendSignUp with rate limiting error
    (Auth.resendSignUp as jest.Mock).mockRejectedValueOnce({
      code: 'LimitExceededException',
      message: 'Limit exceeded'
    });
    
    const { getByText } = render(
      <OtpInputScreen route={mockRoute} navigation={mockNavigation as any} />
    );
    
    // Press Resend Verification Code
    fireEvent.press(getByText('Resend Verification Code'));
    
    // Wait for the async call to complete
    await waitFor(() => {
      expect(Auth.resendSignUp).toHaveBeenCalledWith(mockRoute.params.email);
    });
    
    // Check for error alert
    expect(Alert.alert).toHaveBeenCalledWith(
      'Error', 
      'You have requested too many codes. Please try again later.'
    );
  });
  
  it('navigates back to email verification screen', () => {
    const { getByText } = render(
      <OtpInputScreen route={mockRoute} navigation={mockNavigation as any} />
    );
    
    // Press Back to Email Verification
    fireEvent.press(getByText('Back to Email Verification'));
    
    // Should try to navigate
    expect(mockNavigate).toHaveBeenCalledWith('EmailVerification', { email: mockRoute.params.email });
  });
}); 
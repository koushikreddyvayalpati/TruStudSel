import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ForgotPasswordScreen from '../../../src/screens/auth/ForgotPasswordScreen';
import { Auth } from 'aws-amplify';
import { useTheme } from '../../../src/hooks';

// Create a more sophisticated mock for TextInput
jest.mock('../../../src/components/common', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  return {
    TextInput: ({
      label,
      placeholder,
      onChangeText,
      value,
      error,
      ...rest
    }: {
      label?: string;
      placeholder?: string;
      onChangeText?: (text: string) => void;
      value?: string;
      error?: string;
      [key: string]: any;
    }) => {
      // The important part: use label as testID by default
      const testID = label || 'unknown';

      return (
        <View>
          {label && <Text>{label}</Text>}
          <View
            testID={error ? `error-${testID}` : testID}
            placeholder={placeholder}
            onChangeText={onChangeText}
            value={value}
            {...rest}
          >
            <Text>{placeholder}</Text>
          </View>
          {error && <Text testID={`error-message-${testID}`}>{error}</Text>}
        </View>
      );
    },
  };
});

// Mock useTheme hook
jest.mock('../../../src/hooks', () => ({
  useTheme: jest.fn(),
}));

// Mock Amplify Auth
jest.mock('aws-amplify', () => ({
  Auth: {
    forgotPassword: jest.fn(),
    forgotPasswordSubmit: jest.fn(),
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('ForgotPasswordScreen', () => {
  // Navigation mocks
  const mockNavigate = jest.fn();
  const mockGoBack = jest.fn();

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
          error: '#FF0000',
        },
      },
    });

    // Reset mock implementations
    (Auth.forgotPassword as jest.Mock).mockReset();
    (Auth.forgotPasswordSubmit as jest.Mock).mockReset();

    // Console spy to silence console.error during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders the initial forgot password screen correctly', () => {
    const { getByText, getAllByText } = render(
      <ForgotPasswordScreen navigation={{ navigate: mockNavigate, goBack: mockGoBack } as any} />
    );

    // Check for title and subtitle
    expect(getByText('Reset Password')).toBeTruthy();
    expect(getByText('Enter your email to receive a verification code')).toBeTruthy();

    // Check for input fields and button
    expect(getAllByText('Enter your email')[0]).toBeTruthy();
    expect(getByText('Send Code')).toBeTruthy();
  });

  it('validates email before sending code', async () => {
    const { getByText, getByTestId, findByTestId } = render(
      <ForgotPasswordScreen navigation={{ navigate: mockNavigate, goBack: mockGoBack } as any} />
    );

    // Press Send Code without entering email
    fireEvent.press(getByText('Send Code'));

    // Should show error in the TextInput component via the error prop
    const emailError = await findByTestId('error-Email');
    expect(emailError).toBeTruthy();

    // Enter invalid email - the component already has the error state
    fireEvent.changeText(getByTestId('error-Email'), 'invalid-email');
    fireEvent.press(getByText('Send Code'));

    // Should show error for invalid email format
    const formatError = await findByTestId('error-Email');
    expect(formatError).toBeTruthy();

    // Auth.forgotPassword should not be called
    expect(Auth.forgotPassword).not.toHaveBeenCalled();
  });

  // Helper function to find the email input element regardless of its testID state
  const findEmailInput = (getByTestId: any) => {
    try {
      return getByTestId('Email');
    } catch (e) {
      try {
        return getByTestId('error-Email');
      } catch (e2) {
        throw new Error('Unable to find email input element');
      }
    }
  };

  it('sends verification code for valid email', async () => {
    // Mock successful forgotPassword call
    (Auth.forgotPassword as jest.Mock).mockResolvedValueOnce({});

    const { getByText, getByTestId } = render(
      <ForgotPasswordScreen navigation={{ navigate: mockNavigate, goBack: mockGoBack } as any} />
    );

    // Enter valid email and send code
    fireEvent.changeText(findEmailInput(getByTestId), 'test@example.com');
    fireEvent.press(getByText('Send Code'));

    // Wait for the async call to complete
    await waitFor(() => {
      expect(Auth.forgotPassword).toHaveBeenCalledWith('test@example.com');
    });

    // Should transition to step 2
    expect(getByText('Enter the verification code and your new password')).toBeTruthy();
    expect(getByTestId('Verification Code')).toBeTruthy();
    expect(getByTestId('New Password')).toBeTruthy();
    expect(getByTestId('Confirm Password')).toBeTruthy();
  });

  it('handles error when sending verification code', async () => {
    // Mock failed forgotPassword call
    (Auth.forgotPassword as jest.Mock).mockRejectedValueOnce({
      message: 'User does not exist',
    });

    const { getByText, getByTestId } = render(
      <ForgotPasswordScreen navigation={{ navigate: mockNavigate, goBack: mockGoBack } as any} />
    );

    // Enter email and send code
    fireEvent.changeText(findEmailInput(getByTestId), 'test@example.com');
    fireEvent.press(getByText('Send Code'));

    // Wait for the async call to complete
    await waitFor(() => {
      expect(Auth.forgotPassword).toHaveBeenCalledWith('test@example.com');
    });

    // Should show error alert
    expect(Alert.alert).toHaveBeenCalledWith(
      'Error',
      'User does not exist'
    );
  });

  it('navigates back from step 1', () => {
    const { getByText } = render(
      <ForgotPasswordScreen navigation={{ navigate: mockNavigate, goBack: mockGoBack } as any} />
    );

    // Press Back to Login button
    fireEvent.press(getByText('Back to Login'));

    // Should go back
    expect(mockGoBack).toHaveBeenCalled();
  });
});

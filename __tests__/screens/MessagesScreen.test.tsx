import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MessagesScreen from '../../src/screens/messages/MessagesScreen';
import { useNavigation } from '@react-navigation/native';
import { ThemeProvider } from '../../src/contexts/ThemeContext';

// Import the API mocks
const setupApiMocks = require('../mocks/apiMock');

describe('MessagesScreen', () => {
  // Setup API mocks before running tests
  const apiMocks = setupApiMocks();
  
  // Mock navigation
  const mockNavigate = jest.fn();
  (useNavigation as jest.Mock).mockImplementation(() => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
  }));
  
  beforeEach(() => {
    // Clear all mocks between tests
    jest.clearAllMocks();
    apiMocks.resetMocks();
  });
  
  it('renders the messages screen correctly', async () => {
    const { getByText } = render(
      <ThemeProvider>
        <MessagesScreen />
      </ThemeProvider>
    );
    
    // Check that the header is displayed
    expect(getByText('Messages')).toBeTruthy();
    
    // Test that message items are rendered
    expect(getByText('Fauziah')).toBeTruthy();
    expect(getByText('Nicole')).toBeTruthy();
    expect(getByText('Brian')).toBeTruthy();
    
    // Check message content
    expect(getByText('I will do the voice over')).toBeTruthy();
    expect(getByText('just open la')).toBeTruthy();
    expect(getByText('bye')).toBeTruthy();
  });
  
  it('navigates to message detail when message is pressed', async () => {
    const { getByText } = render(
      <ThemeProvider>
        <MessagesScreen />
      </ThemeProvider>
    );
    
    // Press on a message
    fireEvent.press(getByText('Fauziah'));
    
    // Check that navigate was called with the correct params
    expect(mockNavigate).toHaveBeenCalledWith('MessageScreen', {
      conversationId: '1',
      recipientName: 'Fauziah',
    });
  });
  
  it('navigates back to home when back button is pressed', async () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <MessagesScreen />
      </ThemeProvider>
    );
    
    // Find and press the back button
    const backButton = getByTestId('back-button');
    fireEvent.press(backButton);
    
    // Check that navigate was called with the correct screen
    expect(mockNavigate).toHaveBeenCalledWith('Home');
  });
}); 
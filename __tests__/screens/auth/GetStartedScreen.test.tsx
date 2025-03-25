import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import GetStartedScreen from '../../../src/screens/auth/GetStartedScreen';
import { useTheme } from '../../../src/hooks';

// Mock the useTheme hook
jest.mock('../../../src/hooks', () => ({
  useTheme: jest.fn()
}));

// Mock the navigation prop
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate
};

describe('GetStartedScreen', () => {
  beforeEach(() => {
    // Reset mocks
    mockNavigate.mockReset();
    
    // Mock the theme hook
    (useTheme as jest.Mock).mockReturnValue({
      theme: {
        colors: {
          background: '#FFFFFF',
          primary: '#F7B305',
          secondary: '#2E3A59',
          text: '#333333',
          buttonText: '#FFFFFF'
        }
      }
    });
  });

  it('renders correctly', () => {
    const { getByText } = render(
      <GetStartedScreen navigation={mockNavigation as any} />
    );
    
    // Check title and subtitle
    expect(getByText('TruStudSel')).toBeTruthy();
    expect(getByText('Welcome\'s You')).toBeTruthy();
    
    // Check trust text
    expect(getByText('Trust')).toBeTruthy();
    expect(getByText('Student')).toBeTruthy();
    expect(getByText('Sell')).toBeTruthy();
    
    // Check button text
    expect(getByText('Get Started')).toBeTruthy();
  });
  
  it('navigates to SignIn screen when Get Started button is pressed', () => {
    const { getByText } = render(
      <GetStartedScreen navigation={mockNavigation as any} />
    );
    
    // Find and press the Get Started button
    const getStartedButton = getByText('Get Started');
    fireEvent.press(getStartedButton);
    
    // Verify navigation was called with correct screen
    expect(mockNavigate).toHaveBeenCalledWith('SignIn');
  });
  
  it('applies theme colors correctly', () => {
    const customTheme = {
      colors: {
        background: '#000000',
        primary: '#FF0000',
        secondary: '#00FF00',
        text: '#0000FF',
        buttonText: '#FFFFFF'
      }
    };
    
    // Update theme mock
    (useTheme as jest.Mock).mockReturnValue({
      theme: customTheme
    });
    
    const { getByText, UNSAFE_getByType } = render(
      <GetStartedScreen navigation={mockNavigation as any} />
    );
    
    // Check that container has correct background color
    const container = UNSAFE_getByType(View);
    expect(container.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ 
          backgroundColor: customTheme.colors.background 
        })
      ])
    );
    
    // Check that title has correct color
    const title = getByText('TruStudSel');
    expect(title.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ 
          color: customTheme.colors.primary 
        })
      ])
    );
    
    // Check that button has correct background color
    const button = UNSAFE_getByType(TouchableOpacity);
    expect(button.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ 
          backgroundColor: customTheme.colors.secondary 
        })
      ])
    );
  });
}); 
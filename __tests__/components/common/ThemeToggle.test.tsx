import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Switch } from 'react-native';
import ThemeToggle from '../../../src/components/common/ThemeToggle';
import { useTheme } from '../../../src/hooks';

// Mock the useTheme hook
jest.mock('../../../src/hooks', () => ({
  useTheme: jest.fn()
}));

describe('ThemeToggle Component', () => {
  // Default mock implementation
  const toggleThemeMock = jest.fn();
  const setUseSystemThemeMock = jest.fn();
  
  beforeEach(() => {
    // Reset mocks
    toggleThemeMock.mockReset();
    setUseSystemThemeMock.mockReset();
    
    // Setup default theme hook mock
    (useTheme as jest.Mock).mockReturnValue({
      isDark: false,
      toggleTheme: toggleThemeMock,
      useSystemTheme: false,
      setUseSystemTheme: setUseSystemThemeMock,
      theme: {
        colors: {
          text: '#000000',
          cardAlt: '#f5f5f5',
          primary: '#007bff',
          primaryLight: '#cce5ff'
        }
      }
    });
  });
  
  it('renders correctly with default props', () => {
    const { getByText } = render(<ThemeToggle />);
    
    // Default label should be "Dark Mode"
    expect(getByText('Dark Mode')).toBeTruthy();
    
    // System theme option should be visible by default
    expect(getByText('Use system theme')).toBeTruthy();
  });
  
  it('renders with custom label', () => {
    const { getByText } = render(<ThemeToggle label="Custom Theme Label" />);
    
    expect(getByText('Custom Theme Label')).toBeTruthy();
  });
  
  it('can hide system theme option', () => {
    const { queryByText } = render(<ThemeToggle showSystemOption={false} />);
    
    // System theme option should not be visible
    expect(queryByText('Use system theme')).toBeNull();
  });
  
  it('toggles theme when dark mode switch is pressed', () => {
    const { UNSAFE_getAllByType } = render(<ThemeToggle />);
    
    // Find all switches in the component
    const switches = UNSAFE_getAllByType(Switch);
    // First switch should be the dark mode switch
    const darkModeSwitch = switches[0];
    
    // Press the switch
    fireEvent(darkModeSwitch, 'onValueChange', true);
    
    expect(toggleThemeMock).toHaveBeenCalledTimes(1);
  });
  
  it('toggles system theme when system theme switch is pressed', () => {
    const { UNSAFE_getAllByType } = render(<ThemeToggle />);
    
    // Find all switches in the component
    const switches = UNSAFE_getAllByType(Switch);
    // Second switch should be the system theme switch
    const systemThemeSwitch = switches[1];
    
    // Press the switch
    fireEvent(systemThemeSwitch, 'onValueChange', true);
    
    expect(setUseSystemThemeMock).toHaveBeenCalledWith(true);
  });
  
  it('displays dark mode as enabled when theme is dark', () => {
    // Set theme to dark
    (useTheme as jest.Mock).mockReturnValue({
      isDark: true,
      toggleTheme: toggleThemeMock,
      useSystemTheme: false,
      setUseSystemTheme: setUseSystemThemeMock,
      theme: {
        colors: {
          text: '#ffffff',
          cardAlt: '#333333',
          primary: '#007bff',
          primaryLight: '#cce5ff'
        }
      }
    });
    
    const { UNSAFE_getAllByType } = render(<ThemeToggle />);
    
    // Find all switches in the component
    const switches = UNSAFE_getAllByType(Switch);
    // First switch should be the dark mode switch
    const darkModeSwitch = switches[0];
    
    // Switch should be on (value=true)
    expect(darkModeSwitch.props.value).toBe(true);
  });
  
  it('displays system theme as enabled when useSystemTheme is true', () => {
    // Set useSystemTheme to true
    (useTheme as jest.Mock).mockReturnValue({
      isDark: false,
      toggleTheme: toggleThemeMock,
      useSystemTheme: true,
      setUseSystemTheme: setUseSystemThemeMock,
      theme: {
        colors: {
          text: '#000000',
          cardAlt: '#f5f5f5',
          primary: '#007bff',
          primaryLight: '#cce5ff'
        }
      }
    });
    
    const { UNSAFE_getAllByType } = render(<ThemeToggle />);
    
    // Find all switches in the component
    const switches = UNSAFE_getAllByType(Switch);
    // Second switch should be the system theme switch
    const systemThemeSwitch = switches[1];
    
    // Switch should be on (value=true)
    expect(systemThemeSwitch.props.value).toBe(true);
  });
}); 
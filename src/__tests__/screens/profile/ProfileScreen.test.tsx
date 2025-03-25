import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProfileScreen } from '../../../../src/screens/profile';
import { ThemeProvider } from '../../../../src/contexts/ThemeContext';
import { AuthProvider } from '../../../../src/contexts/AuthContext';

// Mock the navigation
jest.mock('@react-navigation/native', () => {
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
  };
});

// Mock vector icons
jest.mock('react-native-vector-icons/FontAwesome', () => 'Icon');
jest.mock('react-native-vector-icons/FontAwesome5', () => 'Icon');
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

// Mock the Button component
jest.mock('../../../../src/components/Button', () => {
  return {
    Button: ({ label, onPress }) => (
      <button testID={`button-${label}`} onPress={onPress}>
        {label}
      </button>
    ),
  };
});

describe('ProfileScreen', () => {
  it('renders correctly', () => {
    const mockUser = {
      name: 'Test User',
      email: 'test@example.com',
      username: 'testuser',
    };

    const mockAuth = {
      user: mockUser,
      signOut: jest.fn(),
      isAuthenticated: true,
      loading: false,
      error: null,
    };

    const { getByText, queryByText } = render(
      <AuthProvider value={mockAuth}>
        <ThemeProvider>
          <ProfileScreen />
        </ThemeProvider>
      </AuthProvider>
    );

    // Check if important elements are rendered
    expect(getByText('User')).toBeTruthy(); // Should find the name
    expect(queryByText('test@example.com')).toBeTruthy(); // Should find the email
  });
}); 
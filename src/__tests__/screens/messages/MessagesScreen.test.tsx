import React from 'react';
import { render } from '@testing-library/react-native';
import { MessagesScreen } from '../../../../src/screens/messages';
import { ThemeProvider } from '../../../../src/contexts/ThemeContext';

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
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

describe('MessagesScreen', () => {
  it('renders correctly', () => {
    const { getByText } = render(
      <ThemeProvider>
        <MessagesScreen />
      </ThemeProvider>
    );

    // Check if important elements are rendered
    expect(getByText('Messages')).toBeTruthy();
    expect(getByText('Fauziah')).toBeTruthy();
    expect(getByText('Nicole')).toBeTruthy();
    expect(getByText('Brian')).toBeTruthy();
    expect(getByText('I will do the voice over')).toBeTruthy();
    expect(getByText('just open la')).toBeTruthy();
  });
}); 
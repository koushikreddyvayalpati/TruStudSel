import React from 'react';
import { render } from '@testing-library/react-native';
import { ProductsScreen } from '../../../../src/screens/products';
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

// Mock Alert
global.alert = jest.fn();

describe('ProductsScreen', () => {
  it('renders correctly', () => {
    const { getByText } = render(
      <ThemeProvider>
        <ProductsScreen />
      </ThemeProvider>
    );

    // Check if important elements are rendered
    expect(getByText('Product Name')).toBeTruthy();
    expect(getByText('$24.99')).toBeTruthy();
    expect(getByText('New')).toBeTruthy();
    expect(getByText('Electronics')).toBeTruthy();
    expect(getByText('Is it available?')).toBeTruthy();
    expect(getByText('Top Reviews of the Seller')).toBeTruthy();
  });
});

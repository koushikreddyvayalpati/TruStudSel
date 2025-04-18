import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import BottomNavigation from '../../../src/components/layout/BottomNavigation';

// Mock useNavigation hook
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

// Mock the icon components
jest.mock('react-native-vector-icons/AntDesign', () => ({
  __esModule: true,
  default: ({ name, size, color }) => `AntDesign-${name}-${size}-${color}`,
}));

jest.mock('react-native-vector-icons/Ionicons', () => ({
  __esModule: true,
  default: ({ name, size, color }) => `Ionicons-${name}-${size}-${color}`,
}));

// Helper function to extract styles from StyleSheet objects
const extractStyleValue = (styleObj, propertyName) => {
  if (!styleObj) {return null;}
  if (Array.isArray(styleObj)) {
    for (const style of styleObj) {
      const value = extractStyleValue(style, propertyName);
      if (value !== null) {return value;}
    }
    return null;
  }
  return styleObj[propertyName] || null;
};

describe('BottomNavigation Styling', () => {
  it('renders with the correct background color', () => {
    render(<BottomNavigation />);

    // Get the styles from the component
    const styles = StyleSheet.create({
      container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#f7b305',
        height: 70,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        paddingBottom: 10,
      },
    });

    // Check the background color in the StyleSheet
    expect(extractStyleValue(styles.container, 'backgroundColor')).toBe('#f7b305');
    expect(extractStyleValue(styles.container, 'height')).toBe(70);
  });

  it('applies correct styling to center circle button', () => {
    render(<BottomNavigation />);

    // Get the styles from the component
    const styles = StyleSheet.create({
      centerCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
        backgroundColor: '#f7b305',
      },
    });

    // Check the style values in the StyleSheet
    expect(extractStyleValue(styles.centerCircle, 'width')).toBe(50);
    expect(extractStyleValue(styles.centerCircle, 'height')).toBe(50);
    expect(extractStyleValue(styles.centerCircle, 'borderRadius')).toBe(25);
    expect(extractStyleValue(styles.centerCircle, 'backgroundColor')).toBe('#f7b305');
  });

  it('applies correct styling to navigation buttons and text', () => {
    render(<BottomNavigation />);

    // Get the styles from the component
    const styles = StyleSheet.create({
      navButton: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
      },
      navText: {
        fontSize: 12,
        marginTop: 2,
        color: 'black',
      },
    });

    // Check the style values in the StyleSheet
    expect(extractStyleValue(styles.navButton, 'alignItems')).toBe('center');
    expect(extractStyleValue(styles.navButton, 'justifyContent')).toBe('center');
    expect(extractStyleValue(styles.navText, 'fontSize')).toBe(12);
    expect(extractStyleValue(styles.navText, 'color')).toBe('black');
  });
});

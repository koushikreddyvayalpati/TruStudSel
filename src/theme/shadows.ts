/**
 * Shadow styles for both iOS and Android
 * Provides consistent elevation across platforms
 */
import { Platform, ViewStyle } from 'react-native';
import { lightColors, darkColors } from './colors';

// Type for shadow properties
export type Shadow = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

// Create shadow styles for a theme
const createShadows = (colors: typeof lightColors) => {
  const shadowColor = Platform.OS === 'ios' ? colors.shadow : '#000000';
  
  return {
    // No shadow
    none: {
      shadowColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    } as Shadow,
    
    // Extra small shadow (subtle highlight)
    xs: {
      shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 1,
      elevation: 1,
    } as Shadow,
    
    // Small shadow (cards, buttons)
    sm: {
      shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    } as Shadow,
    
    // Medium shadow (floating elements)
    md: {
      shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    } as Shadow,
    
    // Large shadow (modals, dialogs)
    lg: {
      shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    } as Shadow,
    
    // Extra large shadow (high priority elements)
    xl: {
      shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 16,
    } as Shadow,
  };
};

// Shadow styles for light and dark themes
export const lightShadows = createShadows(lightColors);
export const darkShadows = createShadows(darkColors);

// Helper to apply a shadow to a style object
export const applyShadow = (
  style: ViewStyle, 
  shadowKey: keyof typeof lightShadows,
  isDark = false
): ViewStyle => {
  const shadows = isDark ? darkShadows : lightShadows;
  const shadow = shadows[shadowKey];
  
  return {
    ...style,
    ...shadow,
  };
};

export default {
  light: lightShadows,
  dark: darkShadows,
  applyShadow,
}; 
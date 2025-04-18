/**
 * Theme system for the app
 *
 * This module provides a cohesive theming system with:
 * - Light and dark mode support
 * - Type-safe theme values
 * - Consistent colors, typography, spacing, and more
 */

import colors, { lightColors, darkColors, ThemeColors } from './colors';
import typography, { lightTextStyles, darkTextStyles, TextStyles } from './typography';
import spacing from './spacing';
import shadows, { lightShadows, darkShadows } from './shadows';

// Type definitions
export type ThemeMode = 'light' | 'dark';

export interface Theme {
  colors: ThemeColors;
  typography: TextStyles;
  spacing: typeof spacing.spacing;
  insets: typeof spacing.insets;
  layout: typeof spacing.layout;
  shadows: typeof lightShadows;
  mode: ThemeMode;
  isDark: boolean;
}

// Create theme objects
export const lightTheme: Theme = {
  colors: lightColors,
  typography: lightTextStyles,
  spacing: spacing.spacing,
  insets: spacing.insets,
  layout: spacing.layout,
  shadows: lightShadows,
  mode: 'light',
  isDark: false,
};

export const darkTheme: Theme = {
  colors: darkColors,
  typography: darkTextStyles,
  spacing: spacing.spacing,
  insets: spacing.insets,
  layout: spacing.layout,
  shadows: darkShadows,
  mode: 'dark',
  isDark: true,
};

// Export theme components for direct usage
export { colors, typography, spacing, shadows };

// Default exports
export default {
  light: lightTheme,
  dark: darkTheme,
  colors,
  typography,
  spacing,
  shadows,
};

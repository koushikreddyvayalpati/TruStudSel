/**
 * Theme color palettes for light and dark modes
 */

// Base palette (common colors)
export const palette = {
  // Brand colors
  primary: '#f7b305',
  primaryDark: '#d99b04',
  primaryLight: '#f9c437',

  // Secondary brand colors
  secondary: '#000000',
  secondaryDark: '#000000',
  secondaryLight: '#333333',

  // Neutrals
  white: '#ffffff',
  black: '#000000',
  grey100: '#f8f9fa',
  grey200: '#e9ecef',
  grey300: '#dee2e6',
  grey400: '#ced4da',
  grey500: '#adb5bd',
  grey600: '#6c757d',
  grey700: '#495057',
  grey800: '#343a40',
  grey900: '#212529',

  // Status colors
  success: '#28a745',
  successDark: '#1e7e34',
  successLight: '#48c764',

  error: '#dc3545',
  errorDark: '#bd2130',
  errorLight: '#e25663',

  warning: '#ffc107',
  warningDark: '#d39e00',
  warningLight: '#ffcd39',

  info: '#17a2b8',
  infoDark: '#138496',
  infoLight: '#3ab7cc',
};

// Light theme colors
export const lightColors = {
  // Semantic colors
  background: palette.white,
  surface: palette.white,
  card: palette.white,
  cardAlt: palette.grey100,
  text: palette.grey900,
  textSecondary: palette.grey700,
  textDisabled: palette.grey500,
  placeholder: palette.grey500,

  // Component colors
  border: palette.grey300,
  borderFocused: palette.primary,
  divider: palette.grey200,
  shadow: 'rgba(0, 0, 0, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Status colors
  success: palette.success,
  error: palette.error,
  warning: palette.warning,
  info: palette.info,

  // UI element colors
  inputBackground: palette.white,
  buttonText: palette.white,
  buttonDisabled: palette.grey400,
  iconPrimary: palette.grey800,
  iconSecondary: palette.grey600,

  // Navigation
  tabBarBackground: palette.white,
  tabBarActive: palette.primary,
  tabBarInactive: palette.grey600,
  statusBar: 'dark-content',

  // Brand colors
  primary: palette.primary,
  primaryDark: palette.primaryDark,
  primaryLight: palette.primaryLight,

  secondary: palette.secondary,
  secondaryDark: palette.secondaryDark,
  secondaryLight: palette.secondaryLight,
};

// Dark theme colors
export const darkColors = {
  // Semantic colors
  background: palette.grey900,
  surface: palette.grey800,
  card: palette.grey800,
  cardAlt: palette.grey700,
  text: palette.grey100,
  textSecondary: palette.grey300,
  textDisabled: palette.grey500,
  placeholder: palette.grey600,

  // Component colors
  border: palette.grey700,
  borderFocused: palette.primary,
  divider: palette.grey700,
  shadow: 'rgba(0, 0, 0, 0.3)',
  overlay: 'rgba(0, 0, 0, 0.7)',

  // Status colors
  success: palette.successLight,
  error: palette.errorLight,
  warning: palette.warningLight,
  info: palette.infoLight,

  // UI element colors
  inputBackground: palette.grey800,
  buttonText: palette.white,
  buttonDisabled: palette.grey700,
  iconPrimary: palette.grey300,
  iconSecondary: palette.grey500,

  // Navigation
  tabBarBackground: palette.grey900,
  tabBarActive: palette.primary,
  tabBarInactive: palette.grey500,
  statusBar: 'light-content',

  // Brand colors
  primary: palette.primary,
  primaryDark: palette.primaryDark,
  primaryLight: palette.primaryLight,

  secondary: palette.secondary,
  secondaryDark: palette.secondaryDark,
  secondaryLight: palette.secondaryLight,
};

export type ThemeColors = typeof lightColors;

export default {
  palette,
  light: lightColors,
  dark: darkColors,
};

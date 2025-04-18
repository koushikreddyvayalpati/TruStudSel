/**
 * Theme spacing and layout values
 * Provides consistent spacing throughout the app
 */

// Base spacing unit (4pt grid)
const BASE = 4;

// Spacing scale
export const spacing = {
  none: 0,
  xs: BASE, // 4
  sm: BASE * 2, // 8
  md: BASE * 4, // 16
  lg: BASE * 6, // 24
  xl: BASE * 8, // 32
  '2xl': BASE * 12, // 48
  '3xl': BASE * 16, // 64
  '4xl': BASE * 24, // 96
};

// Insets (used for padding)
export const insets = {
  xs: {
    top: spacing.xs,
    right: spacing.xs,
    bottom: spacing.xs,
    left: spacing.xs,
  },
  sm: {
    top: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    left: spacing.sm,
  },
  md: {
    top: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    left: spacing.md,
  },
  lg: {
    top: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    left: spacing.lg,
  },
  xl: {
    top: spacing.xl,
    right: spacing.xl,
    bottom: spacing.xl,
    left: spacing.xl,
  },
  // Asymmetric insets
  screen: {
    top: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    left: spacing.md,
  },
  input: {
    top: spacing.sm,
    right: spacing.md,
    bottom: spacing.sm,
    left: spacing.md,
  },
  card: {
    top: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    left: spacing.md,
  },
};

// Layout metrics
export const layout = {
  // Border radius
  borderRadius: {
    none: 0,
    xs: 2,
    sm: 4,
    md: 8,
    lg: 16,
    xl: 24,
    full: 9999,
  },

  // Border width
  borderWidth: {
    none: 0,
    thin: 0.5,
    base: 1,
    thick: 2,
  },

  // Component sizes
  buttonHeight: {
    xs: 32,
    sm: 40,
    md: 48,
    lg: 56,
  },

  inputHeight: {
    sm: 40,
    md: 48,
    lg: 56,
  },

  iconSize: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32,
    xl: 40,
  },

  // Screen max widths (for responsive design)
  maxWidth: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },

  // Elevation (for shadow depth)
  elevation: {
    none: 0,
    xs: 1,
    sm: 2,
    md: 3,
    lg: 4,
    xl: 5,
  },
};

// Screen size breakpoints
export const breakpoints = {
  xs: 0,
  sm: 320,
  md: 375,
  lg: 768,
  xl: 1024,
};

export default {
  spacing,
  insets,
  layout,
  breakpoints,
};

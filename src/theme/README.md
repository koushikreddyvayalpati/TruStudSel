# Theme System

This directory contains a comprehensive theming system for the TruStudSel application. The theme system provides:

- Light and dark theme support
- System theme detection
- Consistent spacing, colors, and typography
- Type-safe theme values
- Shadow utilities for both platforms

## Usage

### Basic Theme Usage

The theme is available through the `useTheme` hook:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks';

const MyComponent = () => {
  const { theme, isDark } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.text, { color: theme.colors.text }]}>
        Hello, {isDark ? 'Dark' : 'Light'} World!
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
  },
  text: {
    fontSize: 16,
  },
});
```

### Creating Themed Styles

For more complex components, use the `createThemedStyles` utility:

```tsx
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../hooks';

const MyComponent = () => {
  const { createThemedStyles } = useTheme();
  
  const styles = createThemedStyles((theme) => ({
    container: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.layout.borderRadius.md,
      marginBottom: theme.spacing.sm,
    },
    title: {
      ...theme.typography.h4,
      marginBottom: theme.spacing.xs,
    },
    description: {
      ...theme.typography.body2,
      color: theme.colors.textSecondary,
    },
  }));
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Component Title</Text>
      <Text style={styles.description}>This is a themed component</Text>
    </View>
  );
};
```

### Applying Shadows

Use the shadow utilities for consistent elevation across platforms:

```tsx
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../hooks';

const Card = ({ title, children }) => {
  const { theme, applyThemeShadow } = useTheme();
  
  const cardStyle = applyThemeShadow({
    backgroundColor: theme.colors.card,
    borderRadius: theme.layout.borderRadius.md,
    padding: theme.spacing.md,
    margin: theme.spacing.sm,
  }, 'md');
  
  return (
    <View style={cardStyle}>
      <Text style={theme.typography.h5}>{title}</Text>
      {children}
    </View>
  );
};
```

### Toggling Theme Mode

Toggle between light and dark themes:

```tsx
import React from 'react';
import { View, Button } from 'react-native';
import { useTheme } from '../hooks';
import { ThemeToggle } from '../components/common';

const SettingsScreen = () => {
  const { toggleTheme, isDark } = useTheme();
  
  return (
    <View>
      <ThemeToggle />
      
      {/* Or create a custom toggle */}
      <Button 
        title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`} 
        onPress={toggleTheme} 
      />
    </View>
  );
};
```

## Structure

The theme system consists of the following files:

- **colors.ts**: Theme color palettes for light and dark modes
- **typography.ts**: Text styles, font sizes, and font weights
- **spacing.ts**: Spacing values, insets, and layout metrics
- **shadows.ts**: Shadow styles for both iOS and Android
- **index.ts**: Main theme exports and type definitions

## Theme Context

The theme is provided through a React Context. To access the theme, components must be within the `ThemeProvider`. This is set up in `App.tsx`, so all components will have access to the theme.

The `ThemeProvider` handles:

- Detecting the system color scheme
- Storing user theme preferences
- Providing theme values to components
- Toggling between light and dark modes

## Extending the Theme

To extend the theme with new values:

1. Add the values to the appropriate theme file
2. Update the type definitions in `index.ts`
3. Use the new values in your components

For example, to add a new color:

```typescript
// In colors.ts
export const lightColors = {
  // Existing colors...
  newColor: '#ff5722',
};

export const darkColors = {
  // Existing colors...
  newColor: '#ff8a65',
};
``` 
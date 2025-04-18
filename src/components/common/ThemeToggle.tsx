/**
 * Theme toggle component
 *
 * A switch component for toggling between light and dark themes
 * with system theme detection support.
 */
import React from 'react';
import { View, Switch, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks';
import { palette } from '../../theme/colors';

interface ThemeToggleProps {
  label?: string;
  showSystemOption?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({
  label = 'Dark Mode',
  showSystemOption = true,
}) => {
  const {
    isDark,
    toggleTheme,
    useSystemTheme,
    setUseSystemTheme,
    theme,
  } = useTheme();

  return (
    <View style={[
      styles.container,
      { backgroundColor: theme.colors.cardAlt },
    ]}>
      <View style={styles.row}>
        <Text style={[
          styles.label,
          { color: theme.colors.text },
        ]}>
          {label}
        </Text>
        <Switch
          value={isDark}
          onValueChange={toggleTheme}
          thumbColor={isDark ? theme.colors.primary : palette.white}
          trackColor={{
            false: palette.grey400,
            true: theme.colors.primaryLight,
          }}
        />
      </View>

      {showSystemOption && (
        <View style={styles.row}>
          <Text style={[
            styles.label,
            { color: theme.colors.text },
          ]}>
            Use system theme
          </Text>
          <Switch
            value={useSystemTheme}
            onValueChange={setUseSystemTheme}
            thumbColor={useSystemTheme ? theme.colors.primary : palette.white}
            trackColor={{
              false: palette.grey400,
              true: theme.colors.primaryLight,
            }}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ThemeToggle;

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '../../hooks';

interface SlideIndicatorProps {
  width?: number;
  height?: number;
  color?: string;
  animated?: boolean;
}

const SlideIndicator: React.FC<SlideIndicatorProps> = ({
  width = '100%',
  height = 3,
  color,
  animated = true,
}) => {
  const { theme } = useTheme();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const indicatorColor = color || theme.colors.primary || '#F8B305';

  useEffect(() => {
    if (animated) {
      // Create a sliding animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(slideAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.ease,
            useNativeDriver: false,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.ease,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }

    return () => {
      slideAnim.stopAnimation();
    };
  }, [slideAnim, animated]);

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-100%', '100%'],
  });

  return (
    <View style={[styles.container, { width: width as number, height }]}>
      <Animated.View
        style={[
          styles.indicator,
          {
            backgroundColor: indicatorColor,
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: 'rgba(200, 200, 200, 0.2)',
  },
  indicator: {
    height: '100%',
    width: '60%',
    borderRadius: 2,
  },
});

export default SlideIndicator;

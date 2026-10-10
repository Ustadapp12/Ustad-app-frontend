import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '../../theme/colors';

// Exercise progress bar: animates toward `fraction` (clamped to 0..1).
export default function LessonProgressBar({ fraction }: { fraction: number }) {
  const animW = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(animW, { toValue: Math.max(0, Math.min(fraction, 1)), duration: 600, useNativeDriver: false }).start();
  }, [animW, fraction]);
  return (
    <View style={S.track}>
      <Animated.View style={[S.fill, { width: animW.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
}

const S = StyleSheet.create({
  track: { flex: 1, height: 10, backgroundColor: '#E5E7EB', borderRadius: 6, overflow: 'hidden', marginHorizontal: 10 },
  fill:  { height: '100%', backgroundColor: colors.primary, borderRadius: 6 },
});

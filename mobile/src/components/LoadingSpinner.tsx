import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

const PETAL_OPACITIES = [1, 0.85, 0.7, 0.55, 0.4, 0.25, 0.15, 0.08];

// The green spinning "flower" ring used between lesson exercises — pulled out
// so every loading state in the app (buttons, full-screen overlays, map
// refresh) uses this instead of Lottie hourglass animations or the native
// ActivityIndicator.
export function LoadingRing({ size = 40, color = colors.primary }: { size?: number; color?: string }) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spinAnim, {
      toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true,
    }));
    loop.start();
    return () => loop.stop();
  }, []);
  const rotate = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const petalW = Math.round(size * 0.12);
  const petalH = Math.round(size * 0.28);
  return (
    <Animated.View style={{ width: size, height: size, transform: [{ rotate }] }}>
      {PETAL_OPACITIES.map((opacity, i) => (
        <View key={i} style={{ position: 'absolute', width: size, height: size, transform: [{ rotate: `${i * 45}deg` }] }}>
          <View style={{
            position: 'absolute', top: 0, left: (size - petalW) / 2,
            width: petalW, height: petalH, borderRadius: petalW / 2,
            backgroundColor: color, opacity,
          }} />
        </View>
      ))}
    </Animated.View>
  );
}

interface Props {
  size?: number;
  color?: string;
  label?: string;
}

export default function LoadingSpinner({ size = 40, color, label }: Props) {
  return (
    <View style={styles.container}>
      <LoadingRing size={size} color={color} />
      {label && <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.midText, marginTop: 8 },
});

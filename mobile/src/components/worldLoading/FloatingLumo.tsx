import React, { useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import MascotShadow from '../MascotShadow';
import { useFocusedLoop } from '../../hooks/useFocusedLoop';
import { MASCOT } from '../../assets';

// Lumo in a kufi, bobbing gently over his shadow. The bob runs only while
// the screen is visible (useFocusedLoop).
export default function FloatingLumo() {
  const float = useRef(new Animated.Value(0)).current;
  useFocusedLoop(float, 1500);
  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -9] });
  return (
    <>
      <Animated.Image
        source={MASCOT.lumoKufi}
        style={[styles.lumo, { transform: [{ translateY }] }]}
        resizeMode="contain"
      />
      <MascotShadow width={210} style={styles.shadow} />
    </>
  );
}

const styles = StyleSheet.create({
  lumo: { width: 210, height: 210 },
  shadow: { position: 'relative', marginTop: -21, marginBottom: 8 },
});

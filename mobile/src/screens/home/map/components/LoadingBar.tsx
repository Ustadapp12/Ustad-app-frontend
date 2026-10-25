import React, { useRef, useEffect } from 'react';
import { View, Animated } from 'react-native';
import { useScreenVisible } from '../../../../hooks/useScreenVisible';

// ── Indeterminate loading progress bar ────────────────────────────
// Takes no props: its old `nodesReady` was never read (review M-14); the
// caller decides when it shows.
export function LoadingBar() {
  const anim = useRef(new Animated.Value(0)).current;
  // JS-driven (percentage translate), so it costs a JS frame every tick: run
  // it only while the map is on screen. A foreground refresh used to drive it
  // on other tabs (2026-10-22 audit).
  const visible = useScreenVisible();

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1500, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 1500, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, visible]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-100%', '100%'],
  });

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: '#F5F7FA',
          transform: [{ translateX }],
          width: '50%',
        }}
      />
    </View>
  );
}

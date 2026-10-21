import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

// ── Pull-to-refresh indicator — Lumo + rainbow rings, Snapchat-style ──
// (2026-09-03: "for refreshing copy inspo from snapchat where scrolling
// shows their avatar with a rainbow, do the exact same here, use
// transparent_lumo here that has a rainbow behind"). Reveal is driven by
// `scrollY` — the ScrollView's own Animated.Value, already tracking
// contentOffset.y natively, which goes negative during the native
// RefreshControl's own overscroll — so no separate gesture tracking is
// needed to know how far the user has pulled. The native RefreshControl
// itself stays in place purely for its well-tested pull-threshold/release
// detection (reimplementing that from scratch would be its own project);
// its own visible spinner is suppressed as far as each platform allows
// (transparent tint/colors, transparent progressBackgroundColor) so this
// is the only thing actually visible while pulling or refreshing.
//
// Approximates Snapchat's effect rather than reproducing it frame-for-
// frame — its real animation is a bespoke, hand-tuned sequence; this is a
// straightforward pull-scales-a-rainbow-ring-behind-Lumo version, worth a
// live look together before calling the feel itself finished.
export const PULL_REVEAL_RANGE = 90; // px of pull before the indicator is fully shown
export const RAINBOW_RING_COLORS = ['#F94144', '#F3722C', '#F9C74F', '#90BE6D', '#43AA8B', '#577590'];

export function PullRefreshIndicator({ scrollY, refreshing }: { scrollY: Animated.Value; refreshing: boolean }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!refreshing) { spin.setValue(0); return; }
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [refreshing]);

  // While actually refreshing, native holds the ScrollView pulled to a
  // fixed offset — scrollY alone would work, but gating on `refreshing`
  // directly keeps this fully visible for that whole duration regardless
  // of exactly where that native-held offset lands on a given platform.
  const pullProgress = refreshing ? 1 : scrollY.interpolate({
    inputRange: [-PULL_REVEAL_RANGE, 0], outputRange: [1, 0], extrapolate: 'clamp',
  });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View pointerEvents="none" style={pullRefreshStyles.wrap}>
      <Animated.View
        style={{
          opacity: pullProgress,
          transform: [{ scale: pullProgress }, { rotate: refreshing ? rotate : '0deg' }],
        }}
      >
        <Svg width={70} height={70} viewBox="0 0 70 70">
          {RAINBOW_RING_COLORS.map((c, i) => {
            const r = 16 + i * 3.2;
            const circumference = r * Math.PI * 2;
            return (
              <Circle
                key={c}
                cx={35} cy={35} r={r}
                stroke={c} strokeWidth={2.4} fill="none"
                strokeDasharray={`${circumference * 0.7} ${circumference}`}
              />
            );
          })}
        </Svg>
      </Animated.View>
      <Animated.Image
        source={require('../../../../../assets/shared/mascot/lumo_transparent.png')}
        resizeMode="contain"
        style={[pullRefreshStyles.lumo, { opacity: pullProgress, transform: [{ scale: pullProgress }] }]}
      />
    </View>
  );
}

export const pullRefreshStyles = StyleSheet.create({
  wrap: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 130,
    alignItems: 'center', justifyContent: 'center',
  },
  lumo: { position: 'absolute', width: 50, height: 50 },
});

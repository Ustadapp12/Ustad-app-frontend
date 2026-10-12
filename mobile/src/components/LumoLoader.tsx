import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, Image, Animated, Easing, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useResponsiveScale, designScale, type Scale } from '../utils/responsive';

// Full-screen loading state from Figma "loading.png" (440pt frame): the sad
// Lumo in the middle with a comet of stars around him. The stars ride a ring
// that turns clockwise, biggest/brightest star first, shrinking and fading
// to a small grey one at the tail, so the size gradient is what reads as
// motion. Positions, sizes and colours are measured from the export: angle
// (deg, screen coords, 0 = right, clockwise positive), distance from Lumo's
// centre, star width, colour.
const STARS: { angle: number; r: number; w: number; color: string }[] = [
  { angle: -93, r: 138, w: 74, color: '#FFC800' },
  { angle: -134, r: 137, w: 61, color: '#FFC800' },
  { angle: -174, r: 130, w: 54, color: '#FFC800' },
  { angle: 151, r: 122, w: 45, color: '#F5CF46' },
  { angle: 113, r: 115, w: 36, color: '#F3D66D' },
  { angle: 77, r: 115, w: 27, color: '#FCE285' },
  { angle: 42, r: 119, w: 21, color: '#F6E4A6' },
  { angle: 14, r: 116, w: 14, color: '#D8D8D8' },
];
const RING = 2 * (138 + 74 / 2) + 4; // fits the largest star at its radius
const ONE_TURN_MS = 1600;

// Rounded five-point star; stroke in the fill colour softens the points the
// way the design's stars are softened.
const STAR_D = 'M12 2.5 L14.9 8.6 L21.5 9.4 L16.6 13.9 L17.9 20.5 L12 17.2 L6.1 20.5 L7.4 13.9 L2.5 9.4 L9.1 8.6 Z';

function Star({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={STAR_D} fill={color} stroke={color} strokeWidth={2.2} strokeLinejoin="round" />
    </Svg>
  );
}

interface Props {
  label?: string;
  /** Screen behind the loader; the design is plain white. */
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
}

export default function LumoLoader({ label = 'Loading ....', backgroundColor = '#FFFFFF', style }: Props) {
  const sc = useResponsiveScale();
  const d = useMemo(() => designScale(sc), [sc]);
  const s = useMemo(() => makeStyles(d), [d]);

  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, {
      toValue: 1, duration: ONE_TURN_MS, easing: Easing.linear, useNativeDriver: true,
    }));
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const half = d(RING) / 2;
  return (
    <View style={[s.screen, { backgroundColor }, style]} accessibilityRole="progressbar" accessibilityLabel={label}>
      <View style={s.ring}>
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}>
          {STARS.map((st, i) => {
            const size = d(st.w);
            const a = (st.angle * Math.PI) / 180;
            return (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: half + Math.cos(a) * d(st.r) - size / 2,
                  top: half + Math.sin(a) * d(st.r) - size / 2,
                }}
              >
                <Star size={size} color={st.color} />
              </View>
            );
          })}
        </Animated.View>
        <Image source={require('../../assets/images/lumo_sad.png')} style={s.lumo} resizeMode="contain" />
      </View>
      <Text style={s.label}>{label}</Text>
    </View>
  );
}

function makeStyles(d: Scale) {
  return StyleSheet.create({
    screen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    ring: { width: d(RING), height: d(RING), alignItems: 'center', justifyContent: 'center' },
    lumo: { width: d(157), height: d(165) },
    // Design: text top sits ~165pt below Lumo's centre, i.e. just under the
    // tail of the ring rather than under the ring's full square box.
    label: {
      marginTop: -d(16), fontFamily: 'Nunito-Bold', fontSize: d(17), color: '#5A5D68', textAlign: 'center',
    },
  });
}

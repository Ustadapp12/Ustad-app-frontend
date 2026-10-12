import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, Image, Animated, Easing, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useResponsiveScale, designScale, type Scale } from '../utils/responsive';

// Full-screen loading state from Figma "loading.png" (440pt frame): the sad
// Lumo in the middle with eight stars around him. The stars never move: they
// stay at the design's positions, and a wave of size flows round them
// clockwise. The star the wave reaches grows to full size and bright gold,
// the ones it has passed shrink and fade back to the small grey tail, so the
// design's big-to-small gradient is what travels (user, 2026-10-12: "the
// stars remain where they are, the flow increases their size").
//
// Slots: a complete, evenly spaced circle round Lumo (user, 2026-10-12: the
// stars should form a complete circle). The design's eight stars only cover
// ~250 degrees, leaving a gap on the right; here they sit every 45 degrees
// at the design's average distance from Lumo, slot 0 at the top and the rest
// going anticlockwise, so the wave (moving clockwise) trails its tail behind.
const RADIUS = 128;
const SLOT_COUNT = 8;
const SLOTS: { angle: number; r: number }[] = Array.from({ length: SLOT_COUNT }, (_, i) => ({
  angle: -90 - (360 / SLOT_COUNT) * i,
  r: RADIUS,
}));
// The design's gradient, head to tail: star width (pt) and how strongly it
// shows. The design fades gold (#FFC800) through paler golds to a light grey;
// gold at falling opacity over the white screen reproduces that and, unlike a
// colour change, runs on the native driver.
const RANKS: { w: number; opacity: number }[] = [
  { w: 74, opacity: 1 },
  { w: 61, opacity: 1 },
  { w: 54, opacity: 1 },
  { w: 45, opacity: 0.8 },
  { w: 36, opacity: 0.62 },
  { w: 27, opacity: 0.48 },
  { w: 21, opacity: 0.34 },
  { w: 14, opacity: 0.22 },
];
const MAX_W = RANKS[0].w;
const STAR_COLOR = '#FFC800';
const RING = 2 * (RADIUS + MAX_W / 2) + 4; // fits a full-size star at any slot
const ONE_LAP_MS = 1600; // the wave goes once round all eight stars

// Slot i at wave step k (0..8, step 8 == step 0) shows rank (i + k) % 8, so
// the head moves one slot clockwise each step: slot 0 at the top, then slot 7
// (upper right), slot 6 (right), and on round.
function waveOutput(slot: number, pick: (rank: (typeof RANKS)[number]) => number): number[] {
  return Array.from({ length: SLOTS.length + 1 }, (_, k) => pick(RANKS[(slot + k) % SLOTS.length]));
}
const WAVE_INPUT = Array.from({ length: SLOTS.length + 1 }, (_, k) => k / SLOTS.length);

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

  const wave = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(wave, {
      toValue: 1, duration: ONE_LAP_MS, easing: Easing.linear, useNativeDriver: true,
    }));
    loop.start();
    return () => loop.stop();
  }, [wave]);
  const starAnims = useMemo(() => SLOTS.map((_, i) => ({
    scale: wave.interpolate({ inputRange: WAVE_INPUT, outputRange: waveOutput(i, r => r.w / MAX_W) }),
    opacity: wave.interpolate({ inputRange: WAVE_INPUT, outputRange: waveOutput(i, r => r.opacity) }),
  })), [wave]);

  const half = d(RING) / 2;
  const full = d(MAX_W);
  return (
    <View style={[s.screen, { backgroundColor }, style]} accessibilityRole="progressbar" accessibilityLabel={label}>
      <View style={s.ring}>
        {SLOTS.map((slot, i) => {
          const a = (slot.angle * Math.PI) / 180;
          // Drawn at full size and scaled down, centred on its slot, so the
          // star grows and shrinks in place without ever moving.
          return (
            <Animated.View
              key={i}
              style={[s.star, {
                left: half + Math.cos(a) * d(slot.r) - full / 2,
                top: half + Math.sin(a) * d(slot.r) - full / 2,
                opacity: starAnims[i].opacity,
                transform: [{ scale: starAnims[i].scale }],
              }]}
            >
              <Star size={full} color={STAR_COLOR} />
            </Animated.View>
          );
        })}
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
    star: { position: 'absolute' },
    // Just below the ring: with a full circle there is a star straight under
    // Lumo, and at full size it reaches the ring's bottom edge.
    label: {
      marginTop: d(8), fontFamily: 'Nunito-Bold', fontSize: d(17), color: '#5A5D68', textAlign: 'center',
    },
  });
}

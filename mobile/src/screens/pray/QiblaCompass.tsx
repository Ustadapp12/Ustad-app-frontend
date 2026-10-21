import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, StyleSheet } from 'react-native';
import CompassHeading from 'react-native-compass-heading';
import { trueHeadingFromMagnetic } from '../../utils/declination';
import type { Coords } from '../../utils/location';

interface Props {
  /** Degrees from true north to the Kaaba, from utils/qibla.ts. */
  qiblaBearing: number;
  size: number;
  /** For converting the live magnetic heading below to true heading --
   * see utils/declination.ts. */
  coords: Coords;
}

// Matches the Figma compass icon exactly (sampled from the real node,
// 2026-10-21: light ice-blue face #C6D9E7, bright cyan-blue ring #29A4D9,
// a red/navy two-tone needle) -- not a reinterpretation. The dial rotates
// opposite to the device's own heading (so true north always reads
// correctly as the phone turns) and the needle sits at a fixed spot
// within the dial equal to the qibla bearing -- together that keeps the
// needle pointing at the real-world direction of Mecca no matter which
// way the phone is held. A fixed red tick at the top marks "straight
// ahead of the phone"; lining the needle's red tip up with it means the
// phone is facing qibla.
export default function QiblaCompass({ qiblaBearing, size, coords }: Props) {
  const rotate = useRef(new Animated.Value(0)).current;
  const lastTarget = useRef(0);

  useEffect(() => {
    const updateRateDegrees = 2;
    CompassHeading.start(updateRateDegrees, ({ heading }: { heading: number }) => {
      // react-native-compass-heading reports MAGNETIC heading on both
      // platforms (no declination correction in its native code -- see
      // utils/declination.ts), while qiblaBearing is relative to true
      // north, so this converts before the dial does anything with it.
      const trueHeading = trueHeadingFromMagnetic(heading, coords);
      // Shortest-path target so the dial never spins the long way around
      // the 0/360 wrap.
      let target = -trueHeading;
      while (target - lastTarget.current > 180) target -= 360;
      while (target - lastTarget.current < -180) target += 360;
      lastTarget.current = target;
      Animated.timing(rotate, {
        toValue: target, duration: 150, easing: Easing.linear, useNativeDriver: true,
      }).start();
    });
    return () => { CompassHeading.stop(); };
  }, [rotate, coords]);

  const spin = rotate.interpolate({ inputRange: [-1080, 1080], outputRange: ['-1080deg', '1080deg'] });

  const g = compassGeometry(size);

  return (
    // The pointer pokes above the ring; padding makes that part of this
    // component's own box so it can never draw over the title above it.
    <View style={{ paddingTop: g.pointerOverhang }}>
      <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2, borderWidth: g.ring }]}>
        <Animated.View style={[styles.dial, { width: size, height: size, transform: [{ rotate: spin }] }]}>
          {[0, 90, 180, 270].map(deg => (
            // Full-size layer rotated about the dial's centre, so each tick
            // lands at N/E/S/W instead of spinning in place at the top.
            <View key={deg} style={[styles.tickLayer, { transform: [{ rotate: `${deg}deg` }] }]}>
              <View style={[styles.tick, { height: g.tickLength, marginTop: g.tickInset }]} />
            </View>
          ))}
          <View style={[styles.needlePivot, { transform: [{ rotate: `${qiblaBearing}deg` }] }]}>
            <View style={[styles.needleRed, { borderLeftWidth: g.needleHalfWidth, borderRightWidth: g.needleHalfWidth, borderBottomWidth: g.needleLength }]} />
            <View style={[styles.needleNavy, { borderLeftWidth: g.needleHalfWidth, borderRightWidth: g.needleHalfWidth, borderTopWidth: g.needleLength }]} />
          </View>
        </Animated.View>
        <View style={[styles.hub, { width: size * 0.13, height: size * 0.13, borderRadius: size * 0.07 }]} />
        <View style={[styles.pointer, { top: -g.ring - g.pointerOverhang, height: size * 0.17 }]} />
      </View>
    </View>
  );
}

/** Exported for __tests__/qiblaCompassGeometry.test.ts, which checks that no
 * rotating part can leave the circle at any angle. */
export function compassGeometry(size: number) {
  const ring = size * 0.05;
  return {
    ring,
    needleHalfWidth: size * 0.09,
    needleLength: size * 0.22,
    tickLength: size * 0.09,
    tickInset: size * 0.08,
    pointerOverhang: ring * 0.6,
  };
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#C6D9E7', borderColor: '#29A4D9',
  },
  dial: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  tickLayer: { ...StyleSheet.absoluteFill, alignItems: 'center' },
  tick: { width: 1.5, backgroundColor: 'rgba(255,255,255,0.8)' },
  needlePivot: { position: 'absolute', alignItems: 'center' },
  needleRed: { width: 0, height: 0, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#E8453F' },
  needleNavy: { width: 0, height: 0, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#0D3B66' },
  hub: { position: 'absolute', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#0D3B66' },
  pointer: {
    position: 'absolute', width: 3, borderRadius: 1.5,
    backgroundColor: '#E63946',
  },
});

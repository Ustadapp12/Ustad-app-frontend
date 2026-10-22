import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, Text, StyleSheet } from 'react-native';
import { useScreenVisible } from '../../hooks/useScreenVisible';
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

// Figma compass in the hero card (node 1151:10822, measured pixel by pixel
// from the 1x export figma_Designs/map2_originals/pray_page/namaz Card.png,
// 2026-10-22; the earlier "matches Figma exactly" version had an ice-blue
// face and a red top pointer that the design does not have). Thin light rim,
// #29A4D9 ring with a darker #1182B9 inner edge, white face, four short
// #C6D9E7 ticks, a red/blue diamond needle and a plain white hub.
//
// Live behaviour: the dial turns opposite to the device heading, so true
// north stays put as the phone turns, and the needle sits at the qibla
// bearing within it. The red tip therefore always points at Mecca. A static
// Kaaba (🕋) sits at the top of the dial, straight ahead of the phone: when
// the red tip points at it, the phone is facing qibla (2026-10-22, on
// request).
//
// The compass sensor runs only while the Pray tab is focused and the app is
// in the foreground. The tab stays mounted on other tabs, and enableFreeze
// doesn't stop native sensor events, so it used to run all the time once
// opened (animation audit 2026-10-22).
export default function QiblaCompass({ qiblaBearing, size, coords }: Props) {
  const rotate = useRef(new Animated.Value(0)).current;
  const lastTarget = useRef(0);
  const running = useScreenVisible();

  useEffect(() => {
    if (!running) return;
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
  }, [running, rotate, coords]);

  const spin = rotate.interpolate({ inputRange: [-1080, 1080], outputRange: ['-1080deg', '1080deg'] });

  const g = compassGeometry(size);
  const face = size - 2 * (g.rim + g.blueRing);

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2, borderWidth: g.rim }]}>
      <View style={[styles.face, { width: face, height: face, borderRadius: face / 2, borderWidth: g.innerEdge }]} />
      <Animated.View style={[styles.dial, { width: size, height: size, transform: [{ rotate: spin }] }]}>
        {[0, 90, 180, 270].map(deg => (
          // Full-size layer rotated about the dial's centre, so each tick
          // lands at N/E/S/W instead of spinning in place at the top.
          <View key={deg} style={[styles.tickLayer, { transform: [{ rotate: `${deg}deg` }] }]}>
            <View style={[styles.tick, { width: g.tickWidth, borderRadius: g.tickWidth / 2, height: g.tickLength, marginTop: g.tickInset }]} />
          </View>
        ))}
        <View style={[styles.needlePivot, { transform: [{ rotate: `${qiblaBearing}deg` }] }]}>
          <View style={[styles.needleRed, { borderLeftWidth: g.needleHalfWidth, borderRightWidth: g.needleHalfWidth, borderBottomWidth: g.needleLength }]} />
          <View style={[styles.needleBlue, { borderLeftWidth: g.needleHalfWidth, borderRightWidth: g.needleHalfWidth, borderTopWidth: g.needleLength }]} />
        </View>
      </Animated.View>
      <View style={[styles.hub, { width: g.hub, height: g.hub, borderRadius: g.hub / 2 }]} />
      {/* Static: drawn over the turning dial, at 12 o'clock just inside the ring. */}
      <View pointerEvents="none" style={[styles.kaabaSlot, { top: g.kaabaTop - g.rim }]}>
        <Text
          style={[styles.kaaba, { fontSize: g.kaaba, lineHeight: g.kaaba * 1.2 }]}
          accessibilityLabel="Kaaba"
        >
          🕋
        </Text>
      </View>
    </View>
  );
}

/** Every value is a fraction of the measured 77.5px Figma diameter.
 * Exported for __tests__/qiblaCompassGeometry.test.ts, which checks that no
 * rotating part can leave the white face at any angle. */
export function compassGeometry(size: number) {
  const rim = size * 0.013;
  const blueRing = size * 0.058;
  const innerEdge = size * 0.026;
  return {
    rim,
    blueRing,
    innerEdge,
    /** Outer edge to the start of the white face. */
    ring: rim + blueRing + innerEdge,
    needleHalfWidth: size * 0.13,
    needleLength: size * 0.32,
    tickWidth: size * 0.032,
    tickLength: size * 0.1,
    /** Dial's outer edge to the tick's outer end. */
    tickInset: size * 0.13,
    hub: size * 0.09,
    /** The static 🕋 at the top of the dial. */
    kaaba: size * 0.2,
    /** Dial's outer edge to the Kaaba's top: just inside the ring. */
    kaabaTop: size * 0.1,
  };
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#29A4D9', borderColor: '#F1F3F4',
  },
  face: { backgroundColor: '#FFFFFF', borderColor: '#1182B9' },
  dial: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  tickLayer: { ...StyleSheet.absoluteFill, alignItems: 'center' },
  tick: { backgroundColor: '#C6D9E7' },
  needlePivot: { position: 'absolute', alignItems: 'center' },
  needleRed: { width: 0, height: 0, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#E84545' },
  needleBlue: { width: 0, height: 0, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#29A4D9' },
  hub: { position: 'absolute', backgroundColor: '#FFFFFF' },
  kaabaSlot: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  kaaba: { textAlign: 'center', includeFontPadding: false },
});

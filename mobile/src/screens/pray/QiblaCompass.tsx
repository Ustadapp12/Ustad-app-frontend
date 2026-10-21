import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View, StyleSheet } from 'react-native';
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

// Figma's namaz card has a blue compass icon; this is the live, working
// version of it. The dial rotates opposite to the device's own heading (so
// true north always reads correctly as the phone turns) and the Kaaba
// emoji sits at a fixed spot within the dial equal to the qibla bearing --
// together that keeps the emoji pointing at the real-world direction of
// Mecca no matter which way the phone is held. A fixed red tick at the top
// marks "straight ahead of the phone"; lining the Kaaba up with it means
// the phone is facing qibla.
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

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      <Animated.View
        style={[
          styles.dial,
          { width: size, height: size, borderRadius: size / 2, transform: [{ rotate: spin }] },
        ]}
      >
        <Text style={styles.cardinal}>N</Text>
        <View style={[styles.markerPivot, { width: size, height: size, transform: [{ rotate: `${qiblaBearing}deg` }] }]}>
          <Text style={styles.kaaba}>🕋</Text>
        </View>
      </Animated.View>
      <View style={styles.pointer} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0D3B66', borderWidth: 3, borderColor: '#FFFFFF',
  },
  dial: { position: 'absolute', alignItems: 'center' },
  cardinal: { marginTop: 6, fontFamily: 'Nunito-Bold', fontSize: 11, color: '#FFFFFF' },
  markerPivot: { position: 'absolute', alignItems: 'center' },
  kaaba: { marginTop: 4, fontSize: 20 },
  pointer: {
    position: 'absolute', top: -5, width: 3, height: 12, borderRadius: 1.5,
    backgroundColor: '#E63946',
  },
});

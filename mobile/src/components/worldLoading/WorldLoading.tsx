import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import ArabicLettersBackdrop from './ArabicLettersBackdrop';
import FloatingLumo from './FloatingLumo';
import CyclingStatus from './CyclingStatus';
import { SPLASH_MESSAGES, SPLASH_MESSAGE_MS } from './messages';

interface Props {
  insetTop: number;
  messages?: readonly string[];
  intervalMs?: number;
  /** Keep cycling instead of holding on the last message. */
  loop?: boolean;
}

// The "Creating your world" loading screen: navy background, faint Arabic
// letters, the Bismillah, floating Lumo and a changing status line. Built for
// the splash; shared since 2026-10-22 so the map shows the same screen while
// it's being created (the sad Lumo loader is only for a slow connection, see
// hooks/useSlowLoading.ts).
export default function WorldLoading({
  insetTop, messages = SPLASH_MESSAGES, intervalMs = SPLASH_MESSAGE_MS, loop = false,
}: Props) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [fadeIn]);

  return (
    <View style={[styles.screen, { paddingTop: insetTop + 8 }]}>
      <ArabicLettersBackdrop />
      <Animated.View style={[styles.center, { opacity: fadeIn }]}>
        <Text style={styles.bismillah}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
        <FloatingLumo />
        <CyclingStatus messages={messages} intervalMs={intervalMs} loop={loop} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingBottom: 32,
    backgroundColor: '#0D1B2A',
  },
  center: { alignItems: 'center', justifyContent: 'center', flex: 1, width: '100%' },
  bismillah: {
    fontFamily: 'NotoNaskhArabic-Regular',
    fontSize: 27,
    color: '#C4A84C',
    letterSpacing: 1,
    marginBottom: 16,
    marginTop: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(196,168,76,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
});

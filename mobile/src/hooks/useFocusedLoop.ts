import { useCallback } from 'react';
import { Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Loops `value` 0 → 1 → 0 forever, but only while this screen is focused.
 * On blur the loop stops and the value parks at 0, so the animated thing
 * returns to its resting state instead of freezing mid-cycle.
 *
 * Focus-scoped on purpose: tab screens stay mounted for the life of the app,
 * so a mount-scoped loop kept driving frames on every other tab and on every
 * screen pushed above (the map's gold pulse used to do exactly that).
 */
export function useFocusedLoop(value: Animated.Value, halfCycleMs: number) {
  useFocusEffect(
    useCallback(() => {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(value, { toValue: 1, duration: halfCycleMs, useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration: halfCycleMs, useNativeDriver: true }),
      ]));
      loop.start();
      return () => {
        loop.stop();
        value.setValue(0);
      };
    }, [value, halfCycleMs]),
  );
}

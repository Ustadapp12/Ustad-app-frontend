import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * Drives a progress value for a load whose real completion time is unknown.
 * While `active`, eases toward the target over `estimatedMs` (or toward 100%
 * if `realDurationMs` is provided). When `realDurationMs` is supplied, it
 * overrides the estimate and animates 0->100% over the actual measured time.
 * The moment `active` flips false, it snaps the rest of the way to 100% quickly.
 *
 * `estimatedMs` is a fallback heuristic — `realDurationMs` should be passed
 * once the actual call duration is known (measured at call time).
 */
export function usePredictedProgress(
  active: boolean,
  estimatedMs: number,
  realDurationMs?: number
): Animated.Value {
  const progress = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    animRef.current?.stop();
    if (active) {
      progress.setValue(0);
      // If we have real measured duration, animate to 100% over that time.
      // Otherwise, animate to 92% over the estimate (conservative).
      const useReal = realDurationMs != null && realDurationMs > 0;
      const targetValue = useReal ? 1 : 0.92;
      const duration = useReal ? realDurationMs : estimatedMs;
      animRef.current = Animated.timing(progress, {
        toValue: targetValue,
        duration,
        easing: useReal ? Easing.linear : Easing.out(Easing.cubic),
        useNativeDriver: false,
      });
    } else {
      animRef.current = Animated.timing(progress, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      });
    }
    animRef.current.start();
    return () => animRef.current?.stop();
  }, [active, estimatedMs, realDurationMs]);

  return progress;
}

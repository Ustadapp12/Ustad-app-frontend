import { useWindowDimensions } from 'react-native';

// Same clamped-ratio approach MapScreen.tsx uses for its own layout: scale
// off a baseline device width so padding/margins grow on larger screens and
// shrink on smaller ones instead of staying fixed.
const BASELINE_W = 393;
const MIN_SCALE = 0.82;
const MAX_SCALE = 1.3;

/** Returns a `sc(n)` scaler tied to the current window width, clamped so it
 * never shrinks/grows further than MIN_SCALE/MAX_SCALE regardless of device. */
export function useResponsiveScale(): (n: number) => number {
  const { width } = useWindowDimensions();
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, width / BASELINE_W));
  return (n: number) => Math.round(n * scale);
}

import { NativeModules, Platform, useWindowDimensions } from 'react-native';

// NOTE: this file used to carry a native nav-bar-height reader
// (UstadNavigationBarModule.getNavigationBarHeightDp / getNavigationMode), a
// module-level cache with a TTL, and an AppState listener to invalidate it.
// All of it existed to raise a FLOOR under insets.bottom on Android, and all
// of it is gone: the floor was the bug (see safeBottomInset below). The
// native module itself is kept for setImmersiveMode, which is unrelated.


/** insets.bottom, unmodified. Kept as a named wrapper (not just used raw at
 * every call site) so a future edge-to-edge migration has one place to
 * revisit — every one of the app's screens already calls this instead of
 * the raw value. See the function body for why no correction belongs here. */
export function safeBottomInset(insetsBottom: number): number {
  // Pass-through. This app is NOT edge-to-edge: MainActivity never calls
  // setDecorFitsSystemWindows(window, false) / enableEdgeToEdge(), and the
  // theme declares no translucent nav bar. Android therefore insets the
  // activity's window for us -- measured on a real 3-button device
  // (Oppo F9, navigation_mode=0, 480dpi): init=1080x2340 but app=1080x2128,
  // i.e. the window already stops above the nav bar.
  //
  // So insets.bottom reporting 0 there is CORRECT, not the misreport it was
  // taken for on 2026-08-24. Forcing a floor of the natively-measured bar
  // height on top of it reserved that height a SECOND time, inside a window
  // that already excluded it -- which is the dead strip along the bottom of
  // every screen, on 3-button and gesture devices alike. Two attempts to fix
  // this (2026-08-28) trimmed the native contribution and then zeroed it for
  // gesture nav; both missed that the floor itself was the bug.
  //
  // Nothing platform-specific is needed: react-native-safe-area-context's
  // value is right on Android (0, window already inset) and on iOS (the real
  // home-indicator inset). If this app is ever made edge-to-edge, this
  // function becomes meaningful again and should return insetsBottom still --
  // the value would then be nonzero on its own, with no floor required.
  return insetsBottom;
}


/** Android only, no-op elsewhere. hidden=true hides the system navigation
 * bar (swipe-from-edge still temporarily reveals it — Android's own
 * BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE, not a custom timeout). Call with
 * hidden=false to restore normal visibility, e.g. on screen blur — this is
 * meant to be scoped to whichever screen calls it, never a permanent
 * app-wide setting. See UstadNavigationBarModule.kt's setImmersiveMode. */
export function setImmersiveMode(hidden: boolean): void {
  if (Platform.OS !== 'android') return;
  try {
    NativeModules.UstadNavigationBar?.setImmersiveMode?.(hidden);
  } catch {
    // Module unavailable (e.g. not yet linked in a given build) — silently
    // no-op rather than crash a screen over a cosmetic feature.
  }
}

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

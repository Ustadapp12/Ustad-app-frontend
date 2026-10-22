import { useEffect, useState, type RefObject } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import type LottieView from 'lottie-react-native';

/**
 * True only while the user can actually see this screen: it is the focused
 * screen AND the app is in the foreground.
 *
 * The rule (2026-10-22, a MUST): nothing animates, ticks or listens to a
 * sensor while its page isn't on screen. Tab screens stay mounted for the
 * app's whole life and stack screens stay mounted under whatever is pushed
 * on top, and enableFreeze (index.js) does not stop native-driver loops, JS
 * intervals, Lottie or sensor events. Gate every such effect on this.
 * Must be used inside a navigator screen.
 */
export function useScreenVisible(): boolean {
  const isFocused = useIsFocused();
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', st => setAppActive(st === 'active'));
    return () => sub.remove();
  }, []);
  return isFocused && appActive;
}

/** Plays a looping Lottie only while its screen is visible, pausing it
 * otherwise (same idea as ProfileScreen's flame). Pair with `autoPlay loop`. */
export function useLottieWhileVisible(ref: RefObject<LottieView | null>): void {
  const visible = useScreenVisible();
  useEffect(() => {
    if (visible) ref.current?.play();
    else ref.current?.pause();
  }, [visible, ref]);
}

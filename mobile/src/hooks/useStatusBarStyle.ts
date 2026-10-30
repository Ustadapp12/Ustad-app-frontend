import { useCallback } from 'react';
import { StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

/** App-wide status bar default: dark icons, because almost every screen is
 * light. Set once at startup (App.tsx) so the phone's own dark mode can never
 * paint white icons over a light screen. */
export const DEFAULT_BAR_STYLE = 'dark-content';

/**
 * Status bar icon colour (clock, wifi, battery) for the screen that calls it.
 * 'light' = white icons, for screens whose top is dark; 'dark' = the default.
 * Applied while the screen is focused and reset to the default when it is
 * left, so light screens need no call at all. Pass a changing value for a
 * screen whose top flips (e.g. a dark loading overlay over a light map).
 * Must be used inside a navigator screen.
 */
export function useStatusBarStyle(style: 'light' | 'dark'): void {
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle(style === 'light' ? 'light-content' : DEFAULT_BAR_STYLE, true);
      return () => StatusBar.setBarStyle(DEFAULT_BAR_STYLE, true);
    }, [style]),
  );
}

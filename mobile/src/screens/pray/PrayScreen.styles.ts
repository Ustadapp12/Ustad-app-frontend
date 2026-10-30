import { StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { type Scale } from '../../utils/responsive';

export function makeStyles(sc: Scale) {
  return StyleSheet.create({
    // No bottom-inset padding: the tab bar below already covers the home
    // indicator, so padding here left a dead strip above it once this
    // scrolled (2026-10-22).
    container: { flex: 1, backgroundColor: colors.lightBg },
    scroll: { paddingBottom: sc(24) },
    body: { paddingHorizontal: sc(16) },
  });
}

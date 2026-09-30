import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { useAuthStore } from '../store/authStore';

// Mounted once in RootNavigator, above the stack navigator — shows on every
// screen regardless of auth state (see authStore's isOffline for how it's
// set: SplashScreen's healthCheck for a signed-out device, hydrate/
// refreshLearning for a signed-in one). Purely informational: nothing else
// in the app blocks on this, it just tells the user why things might be
// stale/slow right now.
export default function OfflineBanner() {
  const isOffline = useAuthStore(s => s.isOffline);
  const insets = useSafeAreaInsets();

  if (!isOffline) return null;

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 6 }]} pointerEvents="none">
      <Text style={styles.text}>You're offline. Changes will sync once you're back online.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    backgroundColor: colors.warningBg,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.goldBorder,
  },
  text: {
    fontFamily: 'Nunito-Bold', fontSize: 12, color: colors.warning,
    textAlign: 'center',
  },
});

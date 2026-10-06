import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { useConnectivityStore } from '../store/connectivityStore';

// Mounted once in RootNavigator, above the stack navigator — shows on every
// screen regardless of auth state. Purely informational: nothing else in the
// app blocks on this, it just tells the user why things might be stale.
//
// Reads store/connectivityStore.ts, which replaced authStore's old single
// `isOffline` boolean. The two flags are genuinely different situations and
// now say different things:
//
//   isDeviceOffline      the OS says there is no network (airplane mode, no
//                        signal). Authoritative, and clears itself the moment
//                        the radio comes back.
//   isServerUnreachable  the device has a network but our backend returned no
//                        HTTP response at all (status 0).
//
// A server that answers with a 500/503/404 sets neither, because that is not
// a connectivity problem and a connectivity banner is the wrong thing to show
// for it. That case used to land here and was the loudest false positive.
//
// Device-offline takes precedence: if there is no network then of course the
// backend is unreachable, and saying so twice is noise.
export default function OfflineBanner() {
  const isDeviceOffline = useConnectivityStore(s => s.isDeviceOffline);
  const isServerUnreachable = useConnectivityStore(s => s.isServerUnreachable);
  const insets = useSafeAreaInsets();

  // Neither message promises a sync. The old copy said "Changes will sync
  // once you're back online", which was never true: there is no write queue
  // behind this banner, so nothing was ever waiting to sync.
  const message = isDeviceOffline
    ? "You're offline. Some things may be out of date."
    : isServerUnreachable
      ? "Can't reach Ustad right now. Some things may be out of date."
      : null;

  if (!message) return null;

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 6 }]} pointerEvents="none">
      <Text style={styles.text}>{message}</Text>
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

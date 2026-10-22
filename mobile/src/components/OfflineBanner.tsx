import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
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

  // Staged so a brief fluctuation never tells anyone to leave (user,
  // 2026-10-22): first a calm "Connecting…", and only if the problem is
  // still there after GIVE_UP_MS the real message asking them to come back.
  // GIVE_UP_MS sits just under SlowNetworkModal's 9s popup so the two agree.
  // Neither final message promises a sync or claims things still mostly work.
  const problem = isDeviceOffline || isServerUnreachable;
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    setGaveUp(false);
    if (!problem) return;
    const id = setTimeout(() => setGaveUp(true), GIVE_UP_MS);
    return () => clearTimeout(id);
  }, [problem]);
  const message = !problem
    ? null
    : !gaveUp
      ? 'Connecting…'
      : isDeviceOffline
        ? "You're offline. Please come back when you have a connection."
        : "Can't reach UstadApp right now. Please come back in a bit.";

  // When the problem clears, the bar turns green and says "Back online" for
  // a moment instead of just vanishing, so the user knows it's fixed
  // (2026-10-22). Only after a real outage, never on a normal app start.
  const [backOnline, setBackOnline] = useState(false);
  const wasOffline = useRef(false);
  useEffect(() => {
    if (problem) {
      wasOffline.current = true;
      setBackOnline(false);
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    setBackOnline(true);
    const id = setTimeout(() => setBackOnline(false), BACK_ONLINE_MS);
    return () => clearTimeout(id);
  }, [problem]);

  if (!message && !backOnline) return null;

  return (
    <View style={[styles.bar, !message && styles.barOnline, { paddingTop: insets.top + 6 }]} pointerEvents="none">
      <Text style={[styles.text, !message && styles.textOnline]}>{message ?? 'Back online'}</Text>
    </View>
  );
}

const BACK_ONLINE_MS = 2500;
const GIVE_UP_MS = 8000;

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
  barOnline: { backgroundColor: colors.success, borderBottomColor: colors.success },
  textOnline: { color: colors.white },
});

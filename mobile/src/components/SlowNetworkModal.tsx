import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { colors } from '../theme/colors';
import { useConnectivityStore } from '../store/connectivityStore';
import MascotShadow from './MascotShadow';

// How long the backend must stay unreachable, back to back, before this
// escalates from OfflineBanner's quiet strip to an interrupting popup. Long
// enough that a single failed request during a cold start (api/client.ts's
// retryOnNetworkError already retries once on its own) never trips it; short
// enough to catch a real outage while the user is still staring at a stuck
// loading state.
const PERSIST_MS = 9000;

// Mounted once in RootNavigator, next to OfflineBanner. Reads the same
// isServerUnreachable flag (api/client.ts, set only for status 0, meaning no
// HTTP response arrived at all) but only acts once it has stayed true
// continuously for PERSIST_MS. A single failed request is normal and the
// banner already covers it quietly; this is for "nothing is loading and it
// has been a while," where a banner is easy to miss.
//
// Dismissing closes it for the rest of this outage. It can reappear, but only
// for a new episode: isServerUnreachable has to clear (a request succeeded)
// and then stay unreachable for PERSIST_MS again.
export default function SlowNetworkModal() {
  const isServerUnreachable = useConnectivityStore(s => s.isServerUnreachable);
  const [visible, setVisible] = useState(false);
  const dismissedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isServerUnreachable) {
      if (dismissedRef.current || timerRef.current) return;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        // Re-check the live store rather than trusting the closed-over value:
        // the flag could have cleared during the wait.
        if (useConnectivityStore.getState().isServerUnreachable) setVisible(true);
      }, PERSIST_MS);
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      dismissedRef.current = false;
      setVisible(false);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isServerUnreachable]);

  function dismiss() {
    dismissedRef.current = true;
    setVisible(false);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={{ width: 90, height: 90, marginBottom: 8 }}>
            <Image
              source={require('../../assets/images/lumo_kufi.png')}
              style={styles.luma}
              resizeMode="contain"
            />
            <MascotShadow width={90} />
          </View>
          <Text style={styles.title}>Connection trouble</Text>
          <Text style={styles.body}>
            We can't reach Ustad right now. Please check your connection, come back a bit later, or restart the app.
          </Text>
          <TouchableOpacity style={styles.okBtn} onPress={dismiss}>
            <Text style={styles.okText}>Okay</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 24, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 12 },
  luma: { width: 90, height: 90 },
  title: { fontFamily: 'Nunito-Bold', fontSize: 18, color: colors.darkText, marginBottom: 8, textAlign: 'center' },
  body: { fontFamily: 'Nunito-Regular', fontSize: 13, color: colors.mutedText, lineHeight: 20, marginBottom: 20, textAlign: 'center' },
  okBtn: { width: '100%', backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  okText: { fontFamily: 'Nunito-Bold', fontSize: 14, color: colors.white },
});

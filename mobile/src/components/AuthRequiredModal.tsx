import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  visible: boolean;
  onContinue: () => void;
  title?: string;
  body?: string;
  ctaLabel?: string;
  /**
   * Supply this to make the prompt declinable — it adds a secondary "Not now"
   * button. Left out, the modal is a dead end on purpose: the sessionless case
   * (MainTabs' guard) has nothing behind it to go back to.
   */
  onDismiss?: () => void;
  dismissLabel?: string;
}

export default function AuthRequiredModal({
  visible,
  onContinue,
  title = 'Create your account',
  body = 'Sign in or create a free account to continue your Hifz journey.',
  ctaLabel = 'Get Started',
  onDismiss,
  dismissLabel = 'Not now',
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      // The Android hardware back button fires onRequestClose even though
      // nothing on screen looks pressed — that used to silently run
      // onDismiss (real consequences here: StreakScreen's decline path
      // forfeits a guest's XP/streak for good). A prompt with two real
      // choices should only ever act on an explicit tap of one of them; a
      // dismiss-less hard gate (MainTabs' usage) still closes via back,
      // same as before.
      onRequestClose={onDismiss ? () => {} : onContinue}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <TouchableOpacity style={styles.button} onPress={onContinue}>
            <Text style={styles.buttonText}>{ctaLabel}</Text>
          </TouchableOpacity>
          {onDismiss && (
            <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
              <Text style={styles.dismissText}>{dismissLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 24, width: '100%', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 12 },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 18, color: colors.darkText, marginBottom: 8 },
  body: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.mutedText, lineHeight: 20, marginBottom: 20 },
  button: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  buttonText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.white },
  dismissButton: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  dismissText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.mutedText },
});

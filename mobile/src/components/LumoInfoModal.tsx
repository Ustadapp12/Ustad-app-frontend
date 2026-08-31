import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Linking,
} from 'react-native';
import { colors } from '../theme/colors';
import MascotShadow from './MascotShadow';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  /** Shown as a tappable mailto link below the message, e.g. for error-state feedback. */
  contactEmail?: string;
  dismissLabel?: string;
}

// Lumo-branded popup for "not built yet" and "still stuck, contact us" states.
// Unlike GuestGate (which replaces a whole screen because nothing real exists
// underneath), this overlays a real screen via a transparent Modal, so it's
// dismissable and the screen behind it stays intact.
export default function LumoInfoModal({
  visible,
  onClose,
  title = 'Coming soon!',
  message = "This feature isn't available yet. Check back soon.",
  contactEmail,
  dismissLabel = 'Got it',
}: Props) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: -8, duration: 1300, useNativeDriver: true }),
      Animated.timing(floatAnim, { toValue: 0, duration: 1300, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [visible]);

  function handleEmailPress() {
    if (!contactEmail) return;
    Linking.openURL(`mailto:${contactEmail}`).catch(() => {});
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={{ width: 105, height: 105, marginBottom: 8 }}>
            <Animated.Image
              source={require('../../assets/images/lumo_transparent.png')}
              style={[styles.lumo, { marginBottom: 0, transform: [{ translateY: floatAnim }] }]}
              resizeMode="contain"
            />
            <MascotShadow width={105} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {contactEmail && (
            <TouchableOpacity onPress={handleEmailPress} activeOpacity={0.7}>
              <Text style={styles.email}>{contactEmail}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.button} activeOpacity={0.85} onPress={onClose}>
            <Text style={styles.buttonText}>{dismissLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 22,
    paddingVertical: 26,
    paddingHorizontal: 22,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  lumo: { width: 105, height: 105 },
  title: {
    fontFamily: 'Nunito_700Bold', fontSize: 18, color: colors.darkText,
    textAlign: 'center', marginBottom: 8,
  },
  message: {
    fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.mutedText,
    textAlign: 'center', lineHeight: 20, marginBottom: 6,
  },
  email: {
    fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.primary,
    textAlign: 'center', marginTop: 4, marginBottom: 18,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 15,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: colors.white },
});

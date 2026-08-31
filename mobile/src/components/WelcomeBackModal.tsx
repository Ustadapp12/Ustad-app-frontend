import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { colors } from '../theme/colors';
import MascotShadow from './MascotShadow';

interface Props {
  visible: boolean;
  onContinue: () => void;
}

// Shown when a Google sign-in resolves to account_action: "restored" — a
// returning user whose email already had a real account. Without this the
// user watches their XP/streak numbers change on the map for no visible
// reason, which reads as a bug even though it's the good outcome. Replaces
// the OS-native Alert.alert() previously used here, which broke the app's
// visual identity right at an emotionally-loaded moment ("did I lose my
// progress?"). By the time this renders, authStore.loginWithGoogle() has
// already awaited finishAuthSetup(), so `learning` in the store is the
// restored account's real data, not stale guest numbers.
export default function WelcomeBackModal({ visible, onContinue }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onContinue}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={{ width: 110, height: 110, marginBottom: 8 }}>
            <Image
              source={require('../../assets/images/lumo_xp.png')}
              style={styles.luma}
              resizeMode="contain"
            />
            <MascotShadow width={110} />
          </View>

          <Text style={styles.title}>Welcome back!</Text>
          <Text style={styles.body}>We found your account and brought all your progress back.</Text>

          <TouchableOpacity style={styles.button} onPress={onContinue}>
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  card: {
    backgroundColor: colors.white, borderRadius: 20, padding: 24, width: '100%', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 12,
  },
  luma: { width: 110, height: 110 },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 19, color: colors.darkText, marginBottom: 8, textAlign: 'center' },
  body: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.mutedText, lineHeight: 20, marginBottom: 20, textAlign: 'center' },
  button: { width: '100%', backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  buttonText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.white },
});

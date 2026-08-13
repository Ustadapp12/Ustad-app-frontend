import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { colors } from '../theme/colors';
import MascotShadow from './MascotShadow';

interface Props {
  priorStreak: number;
  onDismiss: () => void;
}

// The frozen/active -> "none" transition (freeze window expiring) is
// otherwise completely silent — no backend event, no historical marker (see
// utils/streak.ts's checkStreakLoss, which is what decides when this should
// render). This is the one honest acknowledgment the user gets that a real
// streak just ended, rather than the app quietly showing "0" next time they
// open it, indistinguishable from having never started.
export default function StreakLostModal({ priorStreak, onDismiss }: Props) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={{ width: 110, height: 110, marginBottom: 12 }}>
            <Image
              source={require('../../assets/images/lumo_cry.png')}
              style={styles.luma}
              resizeMode="contain"
            />
            <MascotShadow width={110} />
          </View>
          <Text style={styles.title}>Your streak was reset</Text>
          <Text style={styles.body}>Your {priorStreak} day streak didn't get repaired in time. Let's start a new one today.</Text>
          <TouchableOpacity style={styles.button} onPress={onDismiss}>
            <Text style={styles.buttonText}>Start a new streak</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 24, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 12 },
  luma: { width: 110, height: 110 },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 18, color: colors.darkText, marginBottom: 8, textAlign: 'center' },
  body: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.mutedText, lineHeight: 20, marginBottom: 20, textAlign: 'center' },
  button: { width: '100%', backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  buttonText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.white },
});

import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { colors } from '../theme/colors';
import MascotShadow from './MascotShadow';

interface Props {
  visible: boolean;
  onStay: () => void;
  onLeave: () => void;
}

// Replaces the native Alert.alert('Exit app', ...) confirmation (RootNavigator's
// hardware-back handler) with the app's own Lumo-card modal, matching every
// other confirm dialog in the app instead of looking like a bare OS popup.
export default function ExitAppModal({ visible, onStay, onLeave }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onStay}>
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
          <Text style={styles.title}>Leave UstadApp?</Text>
          <Text style={styles.body}>Your progress is saved. You can pick up right where you left off.</Text>
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.leaveBtn} onPress={onLeave}>
              <Text style={styles.leaveText}>Leave</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stayBtn} onPress={onStay}>
              <Text style={styles.stayText}>Stay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 24, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 12 },
  luma: { width: 90, height: 90 },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 18, color: colors.darkText, marginBottom: 8, textAlign: 'center' },
  body: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.mutedText, lineHeight: 20, marginBottom: 20, textAlign: 'center' },
  btnRow: { flexDirection: 'row', gap: 10, width: '100%' },
  leaveBtn: { flex: 1, backgroundColor: colors.red, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  leaveText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.white },
  stayBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  stayText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.white },
});

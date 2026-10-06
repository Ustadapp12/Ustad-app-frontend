import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  visible: boolean;
  nameEn: string | undefined;
  nameAr: string | undefined;
  ayahCount: number | undefined;
  onConfirm: () => void;
  onCancel: () => void;
}

// "Open {surah}?" confirm — shared by SearchSurahsScreen (picking a closed
// surah from the list) and MapScreen (tapping a locked node offers the same
// jump to that surah's real opening level, instead of a dead-end shake). One
// component so both call sites stay visually and behaviorally identical.
//
// The copy says the surah opens once the first level is finished, rather than
// on this tap, because that is what actually happens: "open" is derived from
// the first level being complete, and nothing is recorded by confirming here.
// Promising otherwise would be the one lie this flow can tell.
export default function StartSurahModal({ visible, nameEn, nameAr, ayahCount, onConfirm, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Open {nameEn}?</Text>
          <Text style={styles.cardBody}>
            {nameAr} · {ayahCount} ayahs{'\n'}
            This starts a new surah. You'll begin at its first level, and it
            counts as open once you finish that level.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={onConfirm}>
            <Text style={styles.primaryBtnText}>Open Surah</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dismissBtn} onPress={onCancel}>
            <Text style={styles.dismissBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  card: {
    backgroundColor: colors.white, borderRadius: 20, padding: 24, width: '100%',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 12,
  },
  cardTitle: { fontFamily: 'Nunito-Bold', fontSize: 18, color: colors.darkText, marginBottom: 8 },
  cardBody: { fontFamily: 'Nunito-Regular', fontSize: 13, color: colors.mutedText, lineHeight: 20, marginBottom: 20 },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { fontFamily: 'Nunito-Bold', fontSize: 14, color: colors.white },
  dismissBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  dismissBtnText: { fontFamily: 'Nunito-Bold', fontSize: 13, color: colors.mutedText },
});

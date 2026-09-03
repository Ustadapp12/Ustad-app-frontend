import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { RELEASE_NOTES, type ReleaseNoteCategory } from '../data/releaseNotes';

const CATEGORY_STYLE: Record<ReleaseNoteCategory, { bg: string; text: string }> = {
  New: { bg: colors.blueBg, text: colors.blue },
  Improved: { bg: colors.goldBg, text: colors.goldDark },
  Fixed: { bg: colors.successBg, text: colors.success },
};

export default function ReleaseNotesModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>What's New</Text>
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {RELEASE_NOTES.map(entry => (
              <View key={entry.version} style={styles.versionBlock}>
                <View style={styles.versionHeaderRow}>
                  <Text style={styles.versionLabel}>Version {entry.version}</Text>
                  <Text style={styles.versionDate}>{entry.date}</Text>
                </View>
                {entry.changes.map((change, i) => {
                  const catStyle = CATEGORY_STYLE[change.category];
                  return (
                    <View key={i} style={styles.changeRow}>
                      <View style={[styles.categoryTag, { backgroundColor: catStyle.bg }]}>
                        <Text style={[styles.categoryTagText, { color: catStyle.text }]}>{change.category}</Text>
                      </View>
                      <Text style={styles.changeText}>{change.text}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, maxHeight: '75%',
  },
  header: { marginBottom: 12 },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 20, color: colors.darkText },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: 8 },
  versionBlock: { marginBottom: 20 },
  versionHeaderRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 },
  versionLabel: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: colors.darkText },
  versionDate: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: colors.mutedText },
  changeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  categoryTag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 1 },
  categoryTagText: { fontFamily: 'Nunito_700Bold', fontSize: 10, letterSpacing: 0.3 },
  changeText: { flex: 1, fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.midText, lineHeight: 19 },
  closeBtn: {
    marginTop: 4, backgroundColor: colors.lightBg, borderRadius: 14,
    paddingVertical: 13, alignItems: 'center',
  },
  closeBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.midText },
});

import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, View, Text, Modal, PanResponder, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { RELEASE_NOTES, type ReleaseNoteCategory } from '../data/releaseNotes';

const CATEGORY_STYLE: Record<ReleaseNoteCategory, { bg: string; text: string }> = {
  New: { bg: colors.blueBg, text: colors.blue },
  Improved: { bg: colors.goldBg, text: colors.goldDark },
  Fixed: { bg: colors.successBg, text: colors.success },
};

// Drag distance (or a quick downward flick) past which the sheet closes.
const DISMISS_DRAG = 80;
const DISMISS_VELOCITY = 0.5;

export default function ReleaseNotesModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  // Swipe down to close (2026-10-22): dragging the handle/title follows the
  // finger and closes past DISMISS_DRAG; a short drag springs back. Pulling
  // the list itself down past its top does the same (iOS overscroll).
  const dragY = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (visible) dragY.setValue(0); }, [visible, dragY]);
  // The header claims the touch as soon as it starts (it holds nothing else
  // tappable) and won't hand it over mid-drag. Claiming only on move never
  // fired on device, so the sheet didn't move at all (emulator, 2026-10-22).
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => dragY.setValue(Math.max(0, g.dy)),
    onPanResponderRelease: (_, g) => {
      if (g.dy > DISMISS_DRAG || g.vy > DISMISS_VELOCITY) onClose();
      else Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start(),
  }), [dragY, onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, { transform: [{ translateY: dragY }] }]}>
          <View {...pan.panHandlers} collapsable={false} style={styles.header}>
            <View style={styles.handle} />
            <Text style={styles.title}>Release Notes Patch {RELEASE_NOTES[0]?.version}</Text>
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onScrollEndDrag={e => { if (e.nativeEvent.contentOffset.y < -DISMISS_DRAG / 2) onClose(); }}
          >
            {RELEASE_NOTES.map(entry => (
              <View key={entry.version} style={styles.versionBlock}>
                <View style={styles.versionHeaderRow}>
                  <Text style={styles.versionLabel}>Patch {entry.version}</Text>
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
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16, maxHeight: '75%',
  },
  // Tall enough to be an easy drag target, not just the thin handle.
  header: { marginBottom: 12, paddingTop: 4 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: 12 },
  title: { fontFamily: 'Nunito-Bold', fontSize: 20, color: colors.darkText },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: 8 },
  versionBlock: { marginBottom: 20 },
  versionHeaderRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 },
  versionLabel: { fontFamily: 'Nunito-Bold', fontSize: 15, color: colors.darkText },
  versionDate: { fontFamily: 'Nunito-Regular', fontSize: 12, color: colors.mutedText },
  changeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  categoryTag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 1 },
  categoryTagText: { fontFamily: 'Nunito-Bold', fontSize: 10, letterSpacing: 0.3 },
  changeText: { flex: 1, fontFamily: 'Nunito-Regular', fontSize: 13, color: colors.midText, lineHeight: 19 },
  closeBtn: {
    marginTop: 4, backgroundColor: colors.lightBg, borderRadius: 14,
    paddingVertical: 13, alignItems: 'center',
  },
  closeBtnText: { fontFamily: 'Nunito-Bold', fontSize: 14, color: colors.midText },
});

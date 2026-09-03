import React, { useState } from 'react';
import { View, Text, Image, Modal, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';
import { AVATAR_VARIANT_COUNT } from '../utils/avatar';

interface Props {
  visible: boolean;
  /** Art for both variants of the user's own gender, in index order — the
   * caller resolves gender→srcs (utils/avatar.ts's MALE_SRCS/FEMALE_SRCS
   * aren't exported directly, keeping this component gender-agnostic). */
  variantSrcs: any[];
  initialVariant: number;
  saving?: boolean;
  onSave: (variant: number) => void;
  onClose: () => void;
}

// Only 2 variants exist per gender (see AVATAR_VARIANT_COUNT), so both
// arrows currently just toggle between them — written as a real cycle
// (wrapping mod length) rather than a hardcoded flip, so a future 3rd
// variant would work here with no changes.
export default function AvatarPickerModal({ visible, variantSrcs, initialVariant, saving, onSave, onClose }: Props) {
  const [variant, setVariant] = useState(initialVariant);

  // Re-seed from the real current variant every time the modal opens —
  // otherwise a previous open's in-progress (unsaved) pick would still be
  // showing the next time it's reopened.
  React.useEffect(() => {
    if (visible) setVariant(initialVariant);
  }, [visible, initialVariant]);

  const cycle = (delta: number) => {
    setVariant(v => (v + delta + AVATAR_VARIANT_COUNT) % AVATAR_VARIANT_COUNT);
  };

  const changed = variant !== initialVariant;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Choose your avatar</Text>

          <View style={styles.pickerRow}>
            <TouchableOpacity
              style={styles.arrowBtn}
              onPress={() => cycle(-1)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Previous avatar"
            >
              <Text style={styles.arrowText}>‹</Text>
            </TouchableOpacity>

            <View style={styles.avatarBox}>
              <Image source={variantSrcs[variant]} style={styles.avatarImg} resizeMode="contain" />
            </View>

            <TouchableOpacity
              style={styles.arrowBtn}
              onPress={() => cycle(1)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Next avatar"
            >
              <Text style={styles.arrowText}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dotsRow}>
            {variantSrcs.map((_, i) => (
              <View key={i} style={[styles.dot, i === variant && styles.dotActive]} />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, (!changed || saving) && styles.saveBtnDisabled]}
            onPress={() => changed && !saving && onSave(variant)}
            disabled={!changed || saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: colors.white, borderRadius: 24, padding: 24, alignItems: 'center', width: '85%',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 18, color: colors.darkText, marginBottom: 20 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 12 },
  arrowBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.lightBg,
    alignItems: 'center', justifyContent: 'center',
  },
  arrowText: { fontSize: 22, color: colors.midText, fontFamily: 'Nunito_700Bold' },
  avatarBox: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 120, height: 120 },
  dotsRow: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },
  saveBtn: {
    width: '100%', backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginBottom: 10,
  },
  saveBtnDisabled: { backgroundColor: colors.border },
  saveBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: '#fff' },
  cancelBtn: { paddingVertical: 6 },
  cancelBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.mutedText },
});

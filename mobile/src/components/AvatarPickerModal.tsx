import React, { useState } from 'react';
import { View, Text, Image, Modal, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { colors } from '../theme';

interface Props {
  visible: boolean;
  /** Every avatar for the user's own gender, in index order — the caller
   * resolves gender→srcs via utils/avatar.ts, keeping this component
   * gender-agnostic. */
  variantSrcs: any[];
  initialVariant: number;
  saving?: boolean;
  onSave: (variant: number) => void;
  onClose: () => void;
}

const COLUMNS = 4;
const TILE = 64;
const GAP = 10;

// A grid rather than prev/next arrows: with 19 to 26 avatars per gender,
// cycling one at a time made the last ones effectively unreachable.
export default function AvatarPickerModal({ visible, variantSrcs, initialVariant, saving, onSave, onClose }: Props) {
  const [variant, setVariant] = useState(initialVariant);

  // Re-seed from the real current variant every time the modal opens —
  // otherwise a previous open's in-progress (unsaved) pick would still be
  // showing the next time it's reopened.
  React.useEffect(() => {
    if (visible) setVariant(initialVariant);
  }, [visible, initialVariant]);

  const changed = variant !== initialVariant;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Choose your avatar</Text>

          <Image source={variantSrcs[variant]} style={styles.preview} resizeMode="contain" />

          <ScrollView style={styles.gridScroll} contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
            {variantSrcs.map((src, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.tile, i === variant && styles.tileActive]}
                onPress={() => setVariant(i)}
                activeOpacity={0.8}
                accessibilityLabel={`Avatar ${i + 1}`}
                accessibilityState={{ selected: i === variant }}
              >
                <Image source={src} style={styles.tileImg} resizeMode="contain" />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.saveBtn, (!changed || saving) && styles.saveBtnDisabled]}
            onPress={() => changed && !saving && onSave(variant)}
            disabled={!changed || saving}
          >
            {saving ? <ActivityIndicator color="#F5F7FA" /> : <Text style={styles.saveBtnText}>Save</Text>}
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
    backgroundColor: colors.white, borderRadius: 24, padding: 20, alignItems: 'center',
    width: COLUMNS * (TILE + 4) + (COLUMNS - 1) * GAP + 40, maxWidth: '92%', maxHeight: '85%',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  title: { fontFamily: 'Nunito-Bold', fontSize: 18, color: colors.darkText, marginBottom: 12 },
  preview: { width: 110, height: 110, marginBottom: 12 },
  gridScroll: { flexGrow: 0, alignSelf: 'stretch', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: GAP },
  // Selection is a rounded-square outline around the tile; the art itself
  // is never clipped to a circle.
  tile: {
    width: TILE + 4, height: TILE + 4, borderRadius: 14, borderWidth: 2, borderColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
  },
  tileActive: { borderColor: colors.primary, backgroundColor: '#F0FAF5' },
  tileImg: { width: TILE, height: TILE },
  saveBtn: {
    width: '100%', backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginBottom: 10,
  },
  saveBtnDisabled: { backgroundColor: colors.border },
  saveBtnText: { fontFamily: 'Nunito-Bold', fontSize: 15, color: '#F5F7FA' },
  cancelBtn: { paddingVertical: 6 },
  cancelBtnText: { fontFamily: 'Nunito-Bold', fontSize: 14, color: colors.mutedText },
});

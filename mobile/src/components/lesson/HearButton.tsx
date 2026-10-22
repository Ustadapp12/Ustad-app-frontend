import React from 'react';
import { Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme';
import { LESSON_IMAGES } from '../../assets';

const SPEAKER_ICON = LESSON_IMAGES.speaker;

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

// The speaker pill above an exercise's question ("Hear words", "Hear the
// word", "Hear"). fill_blank, audio_fill and read_and_speak each used to have
// their own copy, sized and placed differently (one pinned right, one big and
// centred, one small and centred), so the same control jumped around between
// questions.
export default function HearButton({ label, onPress, disabled }: Props) {
  return (
    <TouchableOpacity
      style={[S.btn, disabled && S.disabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Image source={SPEAKER_ICON} style={S.icon} resizeMode="contain" />
      <Text style={S.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const S = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', backgroundColor: colors.primaryBg, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 18, marginBottom: 12, borderWidth: 1.5, borderColor: colors.primary },
  disabled: { opacity: 0.4 },
  icon: { width: 16, height: 16 },
  label: { fontFamily: 'Nunito-Bold', fontSize: 14, color: colors.primary },
});

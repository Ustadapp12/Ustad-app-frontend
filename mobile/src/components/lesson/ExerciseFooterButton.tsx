import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { TOUR_GLOW } from '../tour/tourGlow';

interface Props {
  onPress: () => void;
  label?: string;
  disabled?: boolean;
  /** Tour-only: lets the tour measure the real button for its cutout. */
  buttonRef?: React.Ref<View>;
  /** Tour-only: glow the real button itself. */
  glow?: boolean;
}

// The one pinned action button every exercise uses (Check, or Got it on the
// ayah display), so its size and position match on every exercise type.
export default function ExerciseFooterButton({ onPress, label = 'Check', disabled, buttonRef, glow }: Props) {
  return (
    <View ref={buttonRef} collapsable={false}>
      <TouchableOpacity
        style={[S.button, disabled && S.disabled, glow && TOUR_GLOW]}
        onPress={onPress}
        disabled={disabled}
      >
        <Text style={S.label}>{label}</Text>
      </TouchableOpacity>
    </View>
  );
}

const S = StyleSheet.create({
  button: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 14, alignItems: 'center', shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  disabled: { opacity: 0.35 },
  label: { fontFamily: 'Nunito-Bold', fontSize: 16, color: '#F5F7FA' },
});

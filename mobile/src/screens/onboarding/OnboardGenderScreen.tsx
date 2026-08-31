import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usersApi } from '../../api';
import { ApiError } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import MascotShadow from '../../components/MascotShadow';
import { safeBottomInset } from '../../utils/responsive';
import { GENDER_PREVIEW_SRCS } from '../../utils/avatar';
import type { RootNavProp } from '../../navigation/types';

interface Props { navigation: RootNavProp }

type Gender = 'male' | 'female';

export default function OnboardGenderScreen({ navigation }: Props) {
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  const updateProfileFields = useAuthStore(s => s.updateProfileFields);
  const [selected, setSelected] = useState<Gender | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (!selected || loading) return;
    setLoading(true);
    setError(null);
    try {
      await usersApi.updateGender(selected);
      updateProfileFields({ gender: selected });
      navigation.navigate('OnboardWelcome', { gender: selected });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'INVALID_GENDER') setError(e.message);
      else setError(e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('OnboardAge')}>
          <Image source={require('../../../assets/back_arrow.png')} style={styles.backArrow} resizeMode="contain" />
        </TouchableOpacity>
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={[styles.dot, styles.dotActive]} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={{ width: 120, height: 120, marginBottom: 10 }}>
          <Image source={require('../../../assets/images/lumo_transparent.png')} style={[styles.luma, { marginBottom: 0 }]} resizeMode="contain" />
          <MascotShadow width={120} />
        </View>
        <Text style={styles.badge}>GETTING TO KNOW YOU</Text>
        <Text style={styles.heading}>What is your gender?</Text>
        <Text style={styles.sub}>So we can show you as yourself in the app</Text>

        <TouchableOpacity
          style={[styles.card, selected === 'female' && styles.cardActive]}
          onPress={() => setSelected('female')}
          activeOpacity={0.85}
        >
          <Image source={GENDER_PREVIEW_SRCS.female} style={styles.cardCutout} resizeMode="contain" />
          <Text style={styles.cardTitle}>Female</Text>
          <View style={[styles.radio, selected === 'female' && styles.radioActive]}>
            {selected === 'female' && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, selected === 'male' && styles.cardActive]}
          onPress={() => setSelected('male')}
          activeOpacity={0.85}
        >
          <Image source={GENDER_PREVIEW_SRCS.male} style={styles.cardCutout} resizeMode="contain" />
          <Text style={styles.cardTitle}>Male</Text>
          <View style={[styles.radio, selected === 'male' && styles.radioActive]}>
            {selected === 'male' && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>

        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.btn, (!selected || loading) && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!selected || loading}
        >
          <Text style={styles.btnText}>Continue →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightBg },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 6, paddingTop: 4 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
  },
  backArrow: { width: 18, height: 18, tintColor: colors.darkText },
  dots: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  dot: { width: 24, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 22, paddingTop: 8 },
  luma: { width: 120, height: 120, marginBottom: 10 },
  badge: {
    fontFamily: 'Nunito_700Bold', fontSize: 10, color: colors.primary,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, textAlign: 'center',
  },
  heading: { fontFamily: 'Nunito_700Bold', fontSize: 24, color: colors.darkText, textAlign: 'center', marginBottom: 6 },
  sub: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.mutedText, textAlign: 'center', marginBottom: 24 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14, width: '100%',
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16, marginBottom: 12,
  },
  cardActive: { borderColor: colors.primary, backgroundColor: '#F0FAF5' },
  cardCutout: { width: 44, height: 44 },
  cardTitle: { flex: 1, fontFamily: 'Nunito_700Bold', fontSize: 16, color: colors.darkText },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },
  error: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: colors.red, marginTop: 4, textAlign: 'center' },
  footer: { paddingHorizontal: 22, paddingTop: 12, backgroundColor: colors.lightBg },
  btn: {
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: colors.white },
});

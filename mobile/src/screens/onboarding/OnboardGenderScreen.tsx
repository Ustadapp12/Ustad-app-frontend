import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError } from '../../api/client';
import MascotShadow from '../../components/MascotShadow';
import BackButton from '../../components/BackButton';
import { safeBottomInset } from '../../utils/responsive';
import { GENDER_PREVIEW_SRCS, randomAvatarVariant } from '../../utils/avatar';
import type { RootNavProp } from '../../navigation/types';
import { styles } from './OnboardGenderScreen.styles';
import { MASCOT } from '../../assets';
import { useProfileActions } from '../../hooks/api';

interface Props { navigation: RootNavProp }

type Gender = 'male' | 'female';

export default function OnboardGenderScreen({ navigation }: Props) {
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  const { saveGender, saveAvatarVariant } = useProfileActions();
  const [selected, setSelected] = useState<Gender | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (!selected || loading) return;
    setLoading(true);
    setError(null);
    try {
      await saveGender(selected);
      // Grant one avatar from this gender's folder now, so the account has a
      // real saved pick that the leaderboard can show to everyone else. A
      // failed save must not block onboarding: Welcome/Profile still fall
      // back to the stable per-user pick, and Profile's picker can save later.
      const variant = randomAvatarVariant(selected);
      try {
        await saveAvatarVariant(variant);
      } catch {}
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
        <BackButton onPress={() => navigation.navigate('OnboardAge')} style={styles.backBtn} size={18} />
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={[styles.dot, styles.dotActive]} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.mascotBox}>
          <Image source={MASCOT.lumoTransparent} style={[styles.luma, styles.mascotImgFlush]} resizeMode="contain" />
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

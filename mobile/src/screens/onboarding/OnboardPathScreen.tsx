import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { saveOnboarding, setOnboardingDone } from '../../utils/storage';
import { usersApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import MascotShadow from '../../components/MascotShadow';
import { safeBottomInset } from '../../utils/responsive';
import type { RootNavProp } from '../../navigation/types';

interface Props { navigation: RootNavProp }

type PathKey = 'beginner' | 'intermediate';
const PATH_MAP: Record<PathKey, 'fresh' | 'placement'> = { beginner: 'fresh', intermediate: 'placement' };

export default function OnboardPathScreen({ navigation }: Props) {
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  const [selected, setSelected] = useState<PathKey | null>(null);

  async function handleContinue() {
    if (!selected) return;
    await saveOnboarding({ pathChoice: PATH_MAP[selected], currentStep: 'path' });

    if (selected === 'beginner') {
      await saveOnboarding({ completedAt: new Date().toISOString() });
      await setOnboardingDone(true);
      // Persist account-level completion too — the local flag above is
      // device-scoped and comes back false on a reinstall/new device even
      // for an account that finished onboarding, which is what previously
      // sent already-onboarded users back through the whole flow. Best
      // effort: a network failure here must not trap the user, since
      // getNextOnboardingScreen() falls back to the local flag either way.
      //
      // learner_mode: 'beginner' also triggers the backend's one-time
      // beginner_level_selected XP award (see app/users/router.py) — this is
      // the only place in the app that ever sends this field, so the award
      // is tied specifically to picking this path, not to any other
      // profile update.
      try {
        await usersApi.updateProfile({ onboarding_completed: true, learner_mode: 'beginner' });
        useAuthStore.getState().updateProfileFields({ onboarding_completed: true, learner_mode: 'beginner' });
      } catch {
        // ignored — see comment above
      }
      navigation.replace('MainTabs');
    } else {
      navigation.navigate('OnboardAssessment');
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Image source={require('../../../assets/back_arrow.png')} style={styles.backArrow} resizeMode="contain" />
        </TouchableOpacity>
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={{ width: 100, height: 100, alignSelf: 'center', marginBottom: 4 }}>
          <Image source={require('../../../assets/images/lumo_transparent.png')} style={[styles.luma, { marginBottom: 0 }]} resizeMode="contain" />
          <MascotShadow width={100} />
        </View>
        <Text style={styles.badge}>SETUP · STEP 2 OF 3</Text>
        <Text style={styles.heading}>Choose your path</Text>
        <Text style={styles.sub}>How would you describe yourself?</Text>

        {/* Beginner card */}
        <TouchableOpacity
          style={[styles.card, selected === 'beginner' && styles.cardActive]}
          onPress={() => setSelected('beginner')}
          activeOpacity={0.85}
        >
          <View style={styles.cardTop}>
            <View style={[styles.cardIcon, { backgroundColor: colors.primaryBg }]}>
              <Text style={{ fontSize: 22 }}>🌱</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Learning Quran for the first time?</Text>
              <Text style={styles.cardDesc}>Start from Alif Baa · Complete beginner. We'll guide you step by step.</Text>
            </View>
          </View>
          <View style={[styles.badge2, { backgroundColor: colors.primaryBg }]}>
            <Text style={{ fontSize: 12 }}>⚡</Text>
            <Text style={[styles.badge2Text, { color: colors.primary }]}>+30 XP</Text>
          </View>
        </TouchableOpacity>

        {/* Intermediate card */}
        <TouchableOpacity
          style={[styles.card, selected === 'intermediate' && styles.cardActive, selected === 'intermediate' && { borderColor: colors.blue }]}
          onPress={() => setSelected('intermediate')}
          activeOpacity={0.85}
        >
          <View style={styles.cardTop}>
            <View style={[styles.cardIcon, { backgroundColor: colors.blueBg }]}>
              <Text style={{ fontSize: 22 }}>📚</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Already know some Surahs?</Text>
              <Text style={styles.cardDesc}>Test your level · Find your starting point with a short test.</Text>
            </View>
          </View>
          <View style={[styles.badge2, { backgroundColor: colors.blueBg }]}>
            <Text style={{ fontSize: 12 }}>⚡</Text>
            <Text style={[styles.badge2Text, { color: colors.blue }]}>+50 XP if you attempt</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.btn, !selected && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!selected}
        >
          <Text style={styles.btnText}>Select your path</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightBg },
  statusBar: { paddingHorizontal: 24, paddingVertical: 6 },
  time: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: colors.darkText },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 6, paddingTop: 4 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
  },
  backArrow: { width: 18, height: 18, tintColor: colors.darkText },
  dots: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  dot: { width: 24, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },
  scroll: { paddingHorizontal: 22, paddingBottom: 20 },
  luma: { width: 100, height: 100, alignSelf: 'center', marginBottom: 4 },
  badge: {
    fontFamily: 'Nunito_700Bold', fontSize: 10, color: colors.mutedText,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, textAlign: 'center',
  },
  heading: { fontFamily: 'Nunito_700Bold', fontSize: 24, color: colors.darkText, lineHeight: 30, marginBottom: 6, textAlign: 'center' },
  sub: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.mutedText, marginBottom: 24, textAlign: 'center' },
  card: {
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 18, padding: 16, marginBottom: 14,
  },
  cardActive: { borderColor: colors.primary, backgroundColor: '#F5FBF8' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 10 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: colors.darkText, marginBottom: 3 },
  cardDesc: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: colors.mutedText, lineHeight: 17 },
  badge2: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-start' },
  badge2Text: { fontFamily: 'Nunito_700Bold', fontSize: 12 },
  footer: { paddingHorizontal: 22, paddingTop: 12, backgroundColor: colors.lightBg },
  btn: {
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: colors.white },
});


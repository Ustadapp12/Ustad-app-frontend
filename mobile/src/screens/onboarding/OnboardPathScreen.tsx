import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { saveOnboarding, setOnboardingDone } from '../../utils/storage';
import { colors } from '../../theme';
import MascotShadow from '../../components/MascotShadow';
import BackButton from '../../components/BackButton';
import { safeBottomInset } from '../../utils/responsive';
import type { RootNavProp } from '../../navigation/types';
import { styles } from './OnboardPathScreen.styles';
import { MASCOT } from '../../assets';
import { useProfileActions } from '../../hooks/api';

interface Props { navigation: RootNavProp }

type PathKey = 'beginner' | 'intermediate';
const PATH_MAP: Record<PathKey, 'fresh' | 'placement'> = { beginner: 'fresh', intermediate: 'placement' };

export default function OnboardPathScreen({ navigation }: Props) {
  const { saveProfile } = useProfileActions();
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
        await saveProfile({ onboarding_completed: true, learner_mode: 'beginner' });
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
        <BackButton onPress={() => navigation.goBack()} style={styles.backBtn} size={18} />
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.mascotBox}>
          <Image source={MASCOT.lumoTransparent} style={[styles.luma, styles.mascotImgFlush]} resizeMode="contain" />
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
              <Text style={styles.cardIconEmoji}>🌱</Text>
            </View>
            <View style={styles.fill}>
              <Text style={styles.cardTitle}>Learning Quran for the first time?</Text>
              <Text style={styles.cardDesc}>Start from Alif Baa · Complete beginner. We'll guide you step by step.</Text>
            </View>
          </View>
          <View style={[styles.badge2, { backgroundColor: colors.primaryBg }]}>
            <Text style={styles.badgeEmoji}>⚡</Text>
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
              <Text style={styles.cardIconEmoji}>📚</Text>
            </View>
            <View style={styles.fill}>
              <Text style={styles.cardTitle}>Already know some Surahs?</Text>
              <Text style={styles.cardDesc}>Test your level · Find your starting point with a short test.</Text>
            </View>
          </View>
          <View style={[styles.badge2, { backgroundColor: colors.blueBg }]}>
            <Text style={styles.badgeEmoji}>⚡</Text>
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

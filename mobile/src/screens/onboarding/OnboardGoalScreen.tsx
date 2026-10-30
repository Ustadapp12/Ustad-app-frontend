import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { saveOnboarding } from '../../utils/storage';
import MascotShadow from '../../components/MascotShadow';
import BackButton from '../../components/BackButton';
import { safeBottomInset } from '../../utils/responsive';
import type { RootNavProp } from '../../navigation/types';
import { styles } from './OnboardGoalScreen.styles';
import { MASCOT } from '../../assets';

interface Props { navigation: RootNavProp }

const GOALS = [
  { key: 'hifz', emoji: '📖', title: 'Hifz', desc: 'Complete Quran memorisation' },
  { key: 'school', emoji: '🎓', title: 'School', desc: 'For my studies & exams' },
  { key: 'recitation', emoji: '🕌', title: 'Recitation', desc: 'Improve my Quranic reading' },
  { key: 'rememorisation', emoji: '🔄', title: 'Re-memorisation', desc: 'Review what I once knew' },
  { key: 'family', emoji: '👨‍👩‍👧', title: 'Family', desc: 'Learn together with loved ones' },
  { key: 'spiritual', emoji: '✨', title: 'Spiritual', desc: 'Personal spiritual journey' },
] as const;

type GoalKey = typeof GOALS[number]['key'];

export default function OnboardGoalScreen({ navigation }: Props) {
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  const [selected, setSelected] = useState<GoalKey | null>(null);

  async function handleContinue() {
    if (!selected) return;
    await saveOnboarding({ motivation: selected, currentStep: 'goal' });
    navigation.navigate('OnboardScript');
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <BackButton onPress={() => navigation.goBack()} style={styles.backBtn} size={18} />
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.mascotBox}>
          <Image source={MASCOT.lumoTransparent} style={[styles.luma, styles.mascotImgFlush]} resizeMode="contain" />
          <MascotShadow width={100} />
        </View>
        <Text style={styles.badge}>GETTING TO KNOW YOU</Text>
        <Text style={styles.heading}>Why do you want to memorise the Quran?</Text>
        <Text style={styles.sub}>This helps us personalise your learning journey</Text>

        {/* XP incentive */}
        <View style={styles.xpBanner}>
          <Text style={styles.xpEmoji}>⚡</Text>
          <Text style={styles.xpText}>Share your goal and earn <Text style={styles.xpHighlight}>+15 XP</Text></Text>
        </View>

        {/* Goals */}
        {GOALS.map(g => {
          const active = selected === g.key;
          return (
            <TouchableOpacity
              key={g.key}
              style={[styles.optionCard, active && styles.optionCardActive]}
              onPress={() => setSelected(g.key)}
              activeOpacity={0.8}
            >
              <Text style={styles.optionEmoji}>{g.emoji}</Text>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{g.title}</Text>
                <Text style={styles.optionDesc}>{g.desc}</Text>
              </View>
              <View style={[styles.radio, active && styles.radioActive]}>
                {active && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.btn, !selected && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!selected}
        >
          <Text style={styles.btnText}>Continue →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

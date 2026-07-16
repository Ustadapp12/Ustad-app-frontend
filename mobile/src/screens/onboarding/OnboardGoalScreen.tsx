import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { saveOnboarding } from '../../utils/storage';
import { colors } from '../../theme/colors';
import type { RootNavProp } from '../../navigation/types';

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
  const insets = useSafeAreaInsets();
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
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Image source={require('../../../assets/images/lumo_transparent.png')} style={styles.luma} resizeMode="contain" />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightBg },
  statusBar: { paddingHorizontal: 24, paddingVertical: 6 },
  time: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: colors.darkText },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 6, paddingTop: 4 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
  },
  backArrow: { fontSize: 18, color: colors.darkText, fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  dot: { width: 24, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },
  scroll: { paddingHorizontal: 22, paddingBottom: 20 },
  luma: { width: 84, height: 84, alignSelf: 'center', marginBottom: 4 },
  badge: {
    fontFamily: 'Nunito_700Bold', fontSize: 10, color: colors.primary,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8,
    textAlign: 'center',
  },
  heading: { fontFamily: 'Nunito_700Bold', fontSize: 24, color: colors.darkText, lineHeight: 30, marginBottom: 6, textAlign: 'center' },
  sub: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.mutedText, marginBottom: 16, textAlign: 'center' },
  xpBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.goldBg, borderWidth: 1.5, borderColor: colors.goldBorder,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 18,
  },
  xpEmoji: { fontSize: 18 },
  xpText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.warning },
  xpHighlight: { fontFamily: 'Nunito_700Bold', color: colors.primary },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 9,
  },
  optionCardActive: { borderColor: colors.primary, backgroundColor: '#F0FAF5' },
  optionEmoji: { fontSize: 20 },
  optionText: { flex: 1 },
  optionTitle: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.darkText },
  optionDesc: { fontFamily: 'Nunito_400Regular', fontSize: 11, color: colors.mutedText, marginTop: 1 },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  footer: { paddingHorizontal: 22, paddingTop: 12, backgroundColor: colors.lightBg },
  btn: {
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: colors.white },
});


import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { EmojiText } from '../../components/ui/EmojiText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { Mascot } from '../../components/ui/Mascot';
import { IrabBackground } from '../../components/ui/IrabBackground';
import { learningApi } from '../../api';
import { copy } from '../../i18n/copy';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { setOnboardingDone } from '../../utils/storage';
import { PLACEMENT_QUESTIONS } from '../../data/placementQuestions';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Celebration'>;

const CONFETTI = [
  { x: '8%',  size: 8,  color: colors.yellow },
  { x: '18%', size: 14, color: colors.primary },
  { x: '30%', size: 6,  color: '#e96868' },
  { x: '45%', size: 10, color: '#68b4e9' },
  { x: '58%', size: 12, color: colors.yellow },
  { x: '70%', size: 8,  color: '#b468e9' },
  { x: '82%', size: 14, color: colors.primary },
  { x: '92%', size: 6,  color: '#e96868' },
];

export function CelebrationScreen({ route, navigation }: Props) {
  const { answers, scorePct = 0, level = 'beginner', startSurah = 114 } =
    route.params ?? {};

  const [xp, setXp] = useState(0);
  const [badgeVisible, setBadgeVisible] = useState(false);
  const [btnVisible, setBtnVisible] = useState(false);
  const badgeScale = React.useRef(new Animated.Value(0)).current;
  const btnOpacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // XP counter animation
    let n = 0;
    const iv = setInterval(() => {
      n += 3;
      setXp(n);
      if (n >= 50) { clearInterval(iv); setXp(50); }
    }, 35);

    // Badge pop-in
    const t1 = setTimeout(() => {
      setBadgeVisible(true);
      Animated.spring(badgeScale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 12,
        stiffness: 150,
      }).start();
    }, 900);

    // Button fade-in + submit placement
    const t2 = setTimeout(async () => {
      setBtnVisible(true);
      Animated.timing(btnOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Submit placement result to backend
      if (answers && answers.length > 0) {
        try {
          const apiAnswers = answers.map((a, i) => ({
            question_id: PLACEMENT_QUESTIONS[i]?.id ?? `q${i + 1}`,
            selected_index: a ?? 0,
            correct:
              a != null &&
              a === PLACEMENT_QUESTIONS[i]?.correctIndex,
          }));
          await learningApi.submitPlacement({
            answers: apiAnswers,
            score_pct: scorePct,
            level,
            start_surah: startSurah,
          });
        } catch { /* non-fatal — placement saved locally */ }
      }
    }, 1400);

    return () => {
      clearInterval(iv);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [answers, badgeScale, btnOpacity, level, scorePct, startSurah]);

  return (
    <Screen style={styles.screen}>
      <IrabBackground color={colors.yellow} />
      <View style={styles.radialGlow} pointerEvents="none" />

      {/* Confetti dots */}
      {CONFETTI.map((c, i) => (
        <View
          key={i}
          style={[
            styles.confettiDot,
            { left: c.x, width: c.size, height: c.size * 0.6, backgroundColor: c.color },
          ]}
          pointerEvents="none"
        />
      ))}

      <View style={styles.content}>
        <Mascot size={145} bounce />
        <EmojiText size={40}>🎉</EmojiText>
        <AppText variant="h1" style={styles.title}>{copy.celebration.title}</AppText>
        <AppText style={styles.body}>{copy.celebration.body}</AppText>

        {/* XP counter */}
        <View style={styles.xpCard}>
          <AppText style={styles.xpLabel}>XP Earned</AppText>
          <AppText style={styles.xpValue}>⚡ {xp}</AppText>
        </View>

        {/* Badge unlock */}
        {badgeVisible && (
          <Animated.View style={[styles.badge, { transform: [{ scale: badgeScale }] }]}>
            <AppText style={styles.badgeIcon}>🏅</AppText>
            <View>
              <AppText style={styles.badgeHead}>Badge Unlocked</AppText>
              <AppText style={styles.badgeLabel}>{copy.celebration.badge}</AppText>
            </View>
          </Animated.View>
        )}
      </View>

      {btnVisible && (
        <Animated.View style={[styles.footer, { opacity: btnOpacity }]}>
          <PrimaryButton
            title={copy.celebration.cta}
            onPress={async () => {
              await setOnboardingDone(true);
              navigation.replace('OnboardingStreakGoal');
            }}
          />
        </Animated.View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.dark },
  radialGlow: {
    position: 'absolute',
    top: '20%',
    left: '10%',
    right: '10%',
    height: '60%',
    borderRadius: 999,
    backgroundColor: `${colors.primary}20`,
  },
  confettiDot: {
    position: 'absolute',
    top: '5%',
    borderRadius: 2,
    opacity: 0.85,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    gap: spacing.md,
    zIndex: 1,
  },
  emoji: { fontSize: 40, lineHeight: 48 },
  title: { color: colors.white, textAlign: 'center' },
  body: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 22,
  },
  xpCard: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 24,
    backgroundColor: `${colors.yellow}22`,
    borderWidth: 2.5,
    borderColor: colors.yellow,
    alignItems: 'center',
  },
  xpLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.yellow,
    marginBottom: 2,
  },
  xpValue: { fontSize: 36, fontWeight: '900', color: colors.yellow },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: `${colors.primary}22`,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  badgeIcon: { fontSize: 24 },
  badgeHead: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  badgeLabel: { color: colors.white, fontWeight: '800', fontSize: 13 },
  footer: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.xl,
    zIndex: 1,
  },
});

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { EmojiText } from '../../components/ui/EmojiText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { Mascot } from '../../components/ui/Mascot';
import { IrabBackground } from '../../components/ui/IrabBackground';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'StreakDay1'>;

export function StreakDay1Screen({ navigation }: Props) {
  const badgeScale = useRef(new Animated.Value(0)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t1 = setTimeout(() => {
      Animated.spring(badgeScale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 10,
        stiffness: 120,
      }).start();
    }, 500);

    const t2 = setTimeout(() => {
      Animated.timing(btnOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }, 1100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [badgeScale, btnOpacity]);

  return (
    <Screen style={styles.screen}>
      <IrabBackground color={colors.yellow} />

      <View style={styles.content}>
        <Mascot size={120} bounce />

        <Animated.View style={[styles.badge, { transform: [{ scale: badgeScale }] }]}>
          <EmojiText size={48}>🔥</EmojiText>
          <AppText style={styles.dayLabel}>DAY 1</AppText>
        </Animated.View>

        <AppText variant="h1" style={styles.title}>
          Your streak has started!
        </AppText>
        <AppText style={styles.body}>
          You completed your first session. Come back tomorrow to keep your flame alive.
        </AppText>
      </View>

      <Animated.View style={[styles.footer, { opacity: btnOpacity }]}>
        <PrimaryButton
          title="Set my streak goal 🎯"
          onPress={() => navigation.navigate('OnboardingStreakGoal')}
        />
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.dark },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    gap: spacing.lg,
    zIndex: 1,
  },
  badge: {
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: `${colors.yellow}22`,
    borderWidth: 3,
    borderColor: colors.yellow,
    borderRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  dayLabel: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.yellow,
    letterSpacing: 4,
  },
  title: { color: colors.white, textAlign: 'center' },
  body: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.xl,
    zIndex: 1,
  },
});

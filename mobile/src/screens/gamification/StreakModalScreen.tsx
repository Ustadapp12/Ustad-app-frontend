import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { EmojiText } from '../../components/ui/EmojiText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { Mascot } from '../../components/ui/Mascot';
import { IrabBackground } from '../../components/ui/IrabBackground';
import { copy } from '../../i18n/copy';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'StreakModal'>;

export function StreakModalScreen({ route, navigation }: Props) {
  const { streak } = route.params;
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const todayIndex = new Date().getDay();
  const mondayIndex = todayIndex === 0 ? 6 : todayIndex - 1;

  return (
    <Screen style={styles.screen}>
      <IrabBackground />
      <View style={styles.content}>
        <EmojiText size={56}>🔥</EmojiText>
        <AppText style={styles.count}>{streak}</AppText>
        <AppText style={styles.title}>{copy.streak.title(streak)}</AppText>
        <Mascot size={72} />
        <View style={styles.week}>
          {days.map((d, i) => {
            const done = i <= mondayIndex && streak > 0;
            const isToday = i === mondayIndex;
            return (
              <View
                key={`${d}-${i}`}
                style={[styles.day, isToday && styles.today, done && styles.done]}>
                <AppText style={styles.dayLabel}>{d}</AppText>
                {done ? <AppText style={styles.check}>✓</AppText> : null}
              </View>
            );
          })}
        </View>
        <AppText style={styles.warn}>{copy.streak.warning}</AppText>
      </View>
      <View style={styles.footer}>
        <PrimaryButton
          title={copy.complete.cta}
          onPress={() => navigation.navigate('MainTabs')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.dark, flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    zIndex: 1,
  },
  flame: { fontSize: 56 },
  count: {
    color: colors.yellow,
    fontSize: 64,
    fontWeight: '900',
    lineHeight: 72,
  },
  title: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 20,
    marginBottom: spacing.lg,
  },
  week: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  day: {
    alignItems: 'center',
    width: 40,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  today: { borderWidth: 2, borderColor: colors.yellow },
  done: { backgroundColor: 'rgba(5, 150, 106, 0.35)' },
  dayLabel: { color: colors.grey, fontSize: 11, fontWeight: '700' },
  check: { color: colors.primary, fontWeight: '900', marginTop: 2 },
  warn: {
    marginTop: spacing.xl,
    textAlign: 'center',
    color: colors.grey,
    fontWeight: '600',
    paddingHorizontal: spacing.lg,
  },
  footer: {
    padding: spacing.screenHorizontal,
    paddingBottom: spacing.xl,
    zIndex: 1,
  },
});

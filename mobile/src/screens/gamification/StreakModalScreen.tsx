import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { copy } from '../../i18n/copy';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'StreakModal'>;

export function StreakModalScreen({ route, navigation }: Props) {
  const { streak } = route.params;
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <Screen>
      <View style={styles.content}>
        <AppText style={styles.flame}>🔥</AppText>
        <AppText variant="h1" style={styles.count}>
          {streak}
        </AppText>
        <AppText variant="h2">{copy.streak.title(streak)}</AppText>
        <View style={styles.week}>
          {days.map((d, i) => (
            <View key={`${d}-${i}`} style={[styles.day, i === 4 && styles.today]}>
              <AppText variant="caption">{d}</AppText>
              {i <= 4 ? <AppText style={styles.check}>✓</AppText> : null}
            </View>
          ))}
        </View>
        <AppText style={styles.warn}>{copy.streak.warning}</AppText>
      </View>
      <View style={styles.footer}>
        <PrimaryButton
          title={copy.complete.cta}
          onPress={() => navigation.popToTop()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenHorizontal,
  },
  flame: { fontSize: 48 },
  count: { color: colors.yellow, fontSize: 56, fontWeight: '900' },
  week: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  day: {
    alignItems: 'center',
    width: 40,
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.ash,
  },
  today: { borderWidth: 2, borderColor: colors.yellow },
  check: { color: colors.primary, fontWeight: '800' },
  warn: { marginTop: spacing.lg, textAlign: 'center' },
  footer: { padding: spacing.screenHorizontal, paddingBottom: spacing.lg },
});

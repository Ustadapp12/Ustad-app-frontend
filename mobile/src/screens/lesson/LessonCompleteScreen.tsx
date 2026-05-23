import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { copy } from '../../i18n/copy';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useAuthStore } from '../../store/authStore';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonComplete'>;

export function LessonCompleteScreen({ route, navigation }: Props) {
  const { xp, scorePct, stars, gems = 0 } = route.params;
  const streak = useAuthStore(s => s.learning?.current_streak ?? 0);

  return (
    <Screen>
      <View style={styles.content}>
        <AppText variant="h1" style={styles.title}>
          {copy.complete.title}
        </AppText>
        <View style={styles.row}>
          <View style={[styles.card, styles.cardXp]}>
            <AppText variant="caption">{copy.complete.xpLabel}</AppText>
            <AppText variant="h1">{xp}</AppText>
          </View>
          <View style={[styles.card, styles.cardAcc]}>
            <AppText variant="caption">{copy.complete.accuracyLabel}</AppText>
            <AppText variant="h1">{scorePct}%</AppText>
            <AppText>{'★'.repeat(stars)}</AppText>
          </View>
        </View>
        {gems > 0 ? (
          <AppText style={styles.gems}>
            +{gems} {copy.complete.gemsLabel}
          </AppText>
        ) : null}
      </View>
      <View style={styles.footer}>
        <PrimaryButton
          title={copy.complete.cta}
          onPress={() => {
            if (streak > 0) {
              navigation.replace('StreakModal', { streak });
            } else {
              navigation.popToTop();
            }
          }}
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
  title: { color: colors.yellow, marginBottom: spacing.xl },
  row: { flexDirection: 'row', gap: spacing.md, width: '100%' },
  card: {
    flex: 1,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
  },
  cardXp: { backgroundColor: colors.yellow },
  cardAcc: { backgroundColor: colors.successBg },
  gems: { marginTop: spacing.lg, color: colors.primary, fontWeight: '700' },
  footer: { padding: spacing.screenHorizontal, paddingBottom: spacing.lg },
});

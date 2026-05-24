import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { Mascot } from '../../components/ui/Mascot';
import { IrabBackground } from '../../components/ui/IrabBackground';
import { useLessonStore } from '../../store/lessonStore';
import { copy } from '../../i18n/copy';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonStart'>;

export function LessonStartScreen({ route, navigation }: Props) {
  const { groupId, label } = route.params;
  const { group, loading, error, loadGroup, startSession } = useLessonStore();

  useEffect(() => {
    loadGroup(groupId);
  }, [groupId, loadGroup]);

  const begin = async () => {
    try {
      await startSession();
      navigation.replace('LessonSession', { groupId });
    } catch {
      /* error shown via store */
    }
  };

  if (loading && !group) {
    return (
      <Screen style={styles.centerScreen}>
        <ActivityIndicator color={colors.yellow} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <IrabBackground color={colors.primary} />
      <View style={styles.content}>
        <Mascot size={100} bounce />
        <AppText variant="h1" style={styles.title}>
          {copy.lessonStart.title}
        </AppText>
        <AppText style={styles.label}>{label}</AppText>
        {group ? (
          <View style={styles.metaCard}>
            <AppText style={styles.meta}>
              {group.ayahs.length} ayahs · ~{group.estimated_minutes} min
            </AppText>
            <AppText style={styles.metaSub}>
              Surah {group.surah_number} · Ayah {group.start_ayah}–{group.end_ayah}
            </AppText>
          </View>
        ) : null}
        {error ? <AppText style={styles.error}>{error}</AppText> : null}
      </View>
      <View style={styles.footer}>
        <PrimaryButton
          title={copy.lessonStart.cta}
          onPress={begin}
          disabled={!group}
        />
        <PrimaryButton
          title={copy.lessonStart.back}
          variant="secondaryOnDark"
          onPress={() => navigation.goBack()}
          style={styles.gap}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.dark, flex: 1 },
  centerScreen: {
    flex: 1,
    backgroundColor: colors.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    zIndex: 1,
  },
  title: { color: colors.white, textAlign: 'center', marginTop: spacing.lg },
  label: {
    color: colors.yellow,
    fontWeight: '800',
    fontSize: 18,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  metaCard: {
    marginTop: spacing.xl,
    backgroundColor: 'rgba(5, 150, 106, 0.45)',
    borderRadius: 16,
    padding: spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
  meta: { color: colors.white, fontWeight: '800' },
  metaSub: { color: 'rgba(255,255,255,0.65)', marginTop: 4, fontSize: 12 },
  error: { color: colors.heart, marginTop: spacing.md },
  footer: {
    padding: spacing.screenHorizontal,
    paddingBottom: spacing.xl,
    zIndex: 1,
  },
  gap: { marginTop: spacing.sm },
});

import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { Mascot } from '../../components/ui/Mascot';
import { IrabBackground } from '../../components/ui/IrabBackground';
import { useLessonStore } from '../../store/lessonStore';
import { getPendingLessonSession } from '../../services/lessonSession';
import { copy } from '../../i18n/copy';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonStart'>;

export function LessonStartScreen({ route, navigation }: Props) {
  const { groupId, label } = route.params;
  const { group, loading, error, sessionId, loadGroup, startSession } =
    useLessonStore();
  const starting = loading && !!group && !sessionId;

  const [resumeStep, setResumeStep] = useState<number | null>(null);
  const [checkingResume, setCheckingResume] = useState(true);

  useEffect(() => {
    loadGroup(groupId);
  }, [groupId, loadGroup]);

  useEffect(() => {
    getPendingLessonSession().then(pending => {
      if (pending?.groupId === groupId && (pending.stepIndex ?? 0) > 0) {
        setResumeStep(pending.stepIndex ?? 0);
      }
      setCheckingResume(false);
    }).catch(() => setCheckingResume(false));
  }, [groupId]);

  const begin = async (fromStep = 0) => {
    try {
      await startSession(fromStep);
      navigation.replace('LessonSession', { groupId });
    } catch {
      /* error shown via store */
    }
  };

  if (loading && !group) {
    return (
      <Screen style={styles.screen}>
        <IrabBackground color={colors.yellow} opacityBase={0.05} />
        <View style={styles.content}>
          <View style={styles.skeletonCircle} />
          <View style={styles.skeletonTitle} />
          <View style={[styles.skeletonTitle, { width: '50%', height: 16, marginTop: 4 }]} />
          <View style={styles.skeletonCard} />
        </View>
        <View style={styles.footer}>
          <View style={styles.skeletonBtn} />
          <View style={[styles.skeletonBtn, styles.skeletonBtnSec]} />
        </View>
      </Screen>
    );
  }

  const totalSteps = group?.ayahs?.length ?? 0;
  const resumePct = resumeStep && totalSteps > 0
    ? Math.round((resumeStep / totalSteps) * 100)
    : 0;

  return (
    <Screen style={styles.screen}>
      <IrabBackground color={colors.yellow} opacityBase={0.05} />
      <View style={styles.content}>
        <Mascot size={100} bounce />
        <AppText variant="h1" style={styles.title}>
          {copy.lessonStart.title}
        </AppText>
        <AppText variant="arabic" style={styles.label}>{label}</AppText>
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
        {resumeStep !== null && !checkingResume && (
          <View style={styles.resumeBanner}>
            <AppText style={styles.resumeTitle}>You left off at {resumePct}%</AppText>
            <AppText style={styles.resumeSub}>
              Step {resumeStep} of {totalSteps} completed
            </AppText>
          </View>
        )}
        {error ? <AppText style={styles.error}>{error}</AppText> : null}
      </View>
      <View style={styles.footer}>
        {resumeStep !== null && !checkingResume ? (
          <>
            <PrimaryButton
              title="Resume ›"
              onPress={() => begin(resumeStep)}
              disabled={!group || starting}
              loading={starting}
            />
            <PrimaryButton
              title="Start Over"
              variant="secondaryOnDark"
              onPress={() => begin(0)}
              disabled={starting}
              style={styles.gap}
            />
          </>
        ) : (
          <>
            <PrimaryButton
              title={copy.lessonStart.cta}
              onPress={() => begin(0)}
              disabled={!group || starting}
              loading={starting}
            />
            <PrimaryButton
              title={copy.lessonStart.back}
              variant="secondaryOnDark"
              onPress={() => navigation.goBack()}
              style={styles.gap}
            />
          </>
        )}
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
  resumeBanner: {
    marginTop: spacing.md,
    backgroundColor: `${colors.yellow}22`,
    borderWidth: 1.5,
    borderColor: `${colors.yellow}55`,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    width: '100%',
    alignItems: 'center',
  },
  resumeTitle: {
    color: colors.yellow,
    fontWeight: '900',
    fontSize: 13,
  },
  resumeSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  error: { color: colors.heart, marginTop: spacing.md },
  footer: {
    padding: spacing.screenHorizontal,
    paddingBottom: spacing.xl,
    zIndex: 1,
  },
  gap: { marginTop: spacing.sm },

  skeletonCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  skeletonTitle: {
    height: 28,
    width: '70%',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: spacing.lg,
  },
  skeletonCard: {
    width: '100%',
    height: 80,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginTop: spacing.xl,
  },
  skeletonBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: '100%',
  },
  skeletonBtnSec: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginTop: spacing.sm,
  },
});

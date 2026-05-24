import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { AudioPlayButton } from '../../components/ui/AudioPlayButton';
import { JourneyTopBar } from '../../components/ui/JourneyTopBar';
import { useAuthStore } from '../../store/authStore';
import { revisionApi, contentApi } from '../../api';
import { resolveAyahAudioUrl } from '../../services/reciters';
import { getReciterId } from '../../utils/storage';
import { copy } from '../../i18n/copy';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { AyahOut } from '../../types/api';

export function RevisionScreen() {
  const learning = useAuthStore(s => s.learning);
  const [ayah, setAyah] = useState<AyahOut | null>(null);
  const [dueAt, setDueAt] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);
  const [empty, setEmpty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await revisionApi.next();
      if (!next.ayah_id) {
        setEmpty(true);
        setAyah(null);
        setDueAt(null);
        return;
      }
      const [surah, ayahNum] = next.ayah_id.split('_').map(Number);
      const a = await contentApi.ayah(surah, ayahNum);
      const reciterId = await getReciterId();
      const url = await resolveAyahAudioUrl(a, reciterId);
      setAyah(a);
      setDueAt(next.due_at);
      setAudioUrl(url);
      setEmpty(false);
    } catch {
      setEmpty(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const markReviewed = async () => {
    if (!ayah) {
      return;
    }
    setScheduling(true);
    try {
      const due = new Date();
      due.setDate(due.getDate() + 3);
      await revisionApi.schedule(ayah.id, due.toISOString());
      await load();
    } catch (e) {
      Alert.alert(
        'Revision',
        e instanceof Error ? e.message : 'Could not schedule revision',
      );
    } finally {
      setScheduling(false);
    }
  };

  if (loading) {
    return (
      <Screen style={styles.centerScreen}>
        <ActivityIndicator color={colors.yellow} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <JourneyTopBar
        streak={learning?.current_streak}
        xp={learning?.xp_total}
        hearts={learning?.hearts_remaining}
      />
      <View style={styles.content}>
        <AppText variant="h1" style={styles.title}>
          {copy.revision.title}
        </AppText>
        {empty ? (
          <View style={styles.emptyCard}>
            <AppText style={styles.emptyEmoji}>📖</AppText>
            <AppText style={styles.empty}>{copy.revision.empty}</AppText>
          </View>
        ) : ayah ? (
          <View style={styles.ayahCard}>
            <AppText style={styles.meta}>
              Surah {ayah.surah_number} · Ayah {ayah.ayah_number}
            </AppText>
            {dueAt ? (
              <AppText style={styles.due}>Due: {new Date(dueAt).toLocaleString()}</AppText>
            ) : null}
            <AudioPlayButton url={audioUrl} label={copy.revision.listen} />
            <AppText variant="arabic" style={styles.ayah}>
              {ayah.arabic}
            </AppText>
            <AppText style={styles.trans}>{ayah.translation_en}</AppText>
          </View>
        ) : null}
      </View>
      {!empty && ayah ? (
        <View style={styles.footer}>
          <PrimaryButton
            title={copy.revision.markReviewed}
            onPress={markReviewed}
            loading={scheduling}
          />
        </View>
      ) : null}
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
  content: { flex: 1, padding: spacing.screenHorizontal },
  title: { color: colors.white, marginBottom: spacing.lg },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
  },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  empty: { color: colors.grey, textAlign: 'center', fontWeight: '600', lineHeight: 22 },
  ayahCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.lg,
    alignItems: 'center',
  },
  meta: { color: colors.charcoal, fontWeight: '700', fontSize: 12, alignSelf: 'flex-start' },
  due: { color: colors.grey, fontSize: 11, marginBottom: spacing.sm, alignSelf: 'flex-start' },
  ayah: {
    marginVertical: spacing.lg,
    fontSize: 28,
    textAlign: 'center',
    color: colors.dark,
  },
  trans: { color: colors.charcoal, lineHeight: 22, fontWeight: '600' },
  footer: { padding: spacing.screenHorizontal, paddingBottom: spacing.xl },
});

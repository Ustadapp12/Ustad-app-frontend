import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { revisionApi, contentApi } from '../../api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { AyahOut } from '../../types/api';

export function RevisionScreen() {
  const [ayah, setAyah] = useState<AyahOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await revisionApi.next();
      if (!next.ayah_id) {
        setEmpty(true);
        setAyah(null);
        return;
      }
      const [surah, ayahNum] = next.ayah_id.split('_').map(Number);
      const a = await contentApi.ayah(surah, ayahNum);
      setAyah(a);
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

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.content}>
        <AppText variant="h1">Revision</AppText>
        {empty ? (
          <AppText style={styles.empty}>No ayahs due right now. Keep learning!</AppText>
        ) : ayah ? (
          <>
            <AppText variant="caption">
              Surah {ayah.surah_number} · Ayah {ayah.ayah_number}
            </AppText>
            <AppText variant="arabic" style={styles.ayah}>
              {ayah.arabic}
            </AppText>
            <AppText>{ayah.translation_en}</AppText>
          </>
        ) : null}
      </View>
      {!empty && ayah ? (
        <View style={styles.footer}>
          <PrimaryButton title="Mark reviewed" onPress={load} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, padding: spacing.screenHorizontal, paddingTop: spacing.lg },
  empty: { marginTop: spacing.lg },
  ayah: { marginVertical: spacing.lg },
  footer: { padding: spacing.screenHorizontal, paddingBottom: spacing.lg },
});

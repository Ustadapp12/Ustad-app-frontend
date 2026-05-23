import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { useLessonStore } from '../../store/lessonStore';
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
    await startSession();
    navigation.replace('LessonSession', { groupId });
  };

  if (loading && !group) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.content}>
        <AppText variant="h1">{label}</AppText>
        {group ? (
          <AppText style={styles.meta}>
            {group.ayahs.length} ayahs · ~{group.estimated_minutes} min
          </AppText>
        ) : null}
        {error ? <AppText style={styles.error}>{error}</AppText> : null}
      </View>
      <View style={styles.footer}>
        <PrimaryButton title="Start lesson" onPress={begin} disabled={!group} />
        <PrimaryButton
          title="Back"
          variant="secondary"
          onPress={() => navigation.goBack()}
          style={styles.gap}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, padding: spacing.screenHorizontal, justifyContent: 'center' },
  meta: { marginTop: spacing.md },
  error: { color: colors.heart, marginTop: spacing.md },
  footer: { padding: spacing.screenHorizontal, paddingBottom: spacing.lg },
  gap: { marginTop: spacing.sm },
});

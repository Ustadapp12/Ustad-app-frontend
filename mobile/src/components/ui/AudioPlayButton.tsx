import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { AppText } from './AppText';
import { playAudioUrl } from '../../services/audioPlayer';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

type Props = {
  url: string | null;
  label?: string;
};

export function AudioPlayButton({ url, label = 'Tap to play' }: Props) {
  const [loading, setLoading] = useState(false);

  const onPress = useCallback(async () => {
    if (!url) {
      Alert.alert('Audio', 'No audio available for this ayah.');
      return;
    }
    setLoading(true);
    try {
      await playAudioUrl(url);
    } catch (e) {
      Alert.alert(
        'Audio',
        e instanceof Error ? e.message : 'Could not play audio',
      );
    } finally {
      setLoading(false);
    }
  }, [url]);

  return (
    <Pressable
      style={[styles.btn, !url && styles.btnDisabled]}
      onPress={onPress}
      disabled={loading || !url}>
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <AppText style={styles.icon}>▶</AppText>
      )}
      <AppText style={styles.hint}>{url ? label : 'No audio'}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 72,
    height: 72,
    backgroundColor: colors.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  btnDisabled: { opacity: 0.5 },
  icon: { color: colors.white, fontSize: 28 },
  hint: { color: colors.grey, fontSize: 11, marginTop: 4, textAlign: 'center' },
});

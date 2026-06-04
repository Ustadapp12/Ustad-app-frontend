import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, ActivityIndicator, View } from 'react-native';
import { AppText } from './AppText';
import { SpeakerIcon } from './Icons';
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
    if (!url) return;
    setLoading(true);
    try {
      await playAudioUrl(url);
    } finally {
      setLoading(false);
    }
  }, [url]);

  return (
    <View style={styles.wrap}>
      <Pressable
        style={[styles.btn, !url && styles.btnDisabled]}
        onPress={onPress}
        disabled={loading || !url}>
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <SpeakerIcon size={28} color={colors.white} />
        )}
      </Pressable>
      <AppText style={styles.hint}>{url ? label : 'No audio available'}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  btn: {
    width: 72,
    height: 72,
    backgroundColor: colors.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  hint: {
    color: colors.charcoal,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

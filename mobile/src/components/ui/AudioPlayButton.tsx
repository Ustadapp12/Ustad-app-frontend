import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, ActivityIndicator, View } from 'react-native';
import { AppText } from './AppText';
import { SpeakerIcon } from './Icons';
import { playAudioUrl, setPlaybackSpeed } from '../../services/audioPlayer';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const SPEEDS = [0.75, 1, 1.25] as const;
type Speed = (typeof SPEEDS)[number];

type Props = {
  url: string | null;
  label?: string;
  showSpeedControl?: boolean;
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
};

export function AudioPlayButton({
  url,
  label = 'Tap to play',
  showSpeedControl = false,
  onPlayStart,
  onPlayEnd,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);

  const handleSpeedChange = (s: Speed) => {
    setSpeed(s);
    setPlaybackSpeed(s);
  };

  const onPress = useCallback(async () => {
    if (!url) return;
    setPlaybackSpeed(speed);
    setLoading(true);
    onPlayStart?.();
    try {
      await playAudioUrl(url);
    } finally {
      setLoading(false);
      onPlayEnd?.();
    }
  }, [url, speed, onPlayStart, onPlayEnd]);

  return (
    <View style={styles.wrap}>
      <Pressable
        style={[styles.btn, !url && styles.btnDisabled]}
        onPress={onPress}
        disabled={loading || !url}
        accessibilityRole="button"
        accessibilityLabel={loading ? 'Loading audio' : url ? label : 'No audio available'}
        accessibilityState={{ disabled: loading || !url, busy: loading }}>
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <SpeakerIcon size={28} color={colors.white} />
        )}
      </Pressable>
      <AppText style={styles.hint}>{url ? label : 'No audio available'}</AppText>

      {showSpeedControl && url ? (
        <View style={styles.speedRow}>
          {SPEEDS.map(s => (
            <Pressable
              key={s}
              onPress={() => handleSpeedChange(s)}
              style={[styles.speedChip, speed === s && styles.speedChipActive]}
              accessibilityRole="radio"
              accessibilityLabel={`${s}× speed`}
              accessibilityState={{ checked: speed === s }}>
              <AppText style={[styles.speedText, speed === s && styles.speedTextActive]}>
                {s}×
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.sm,
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
    textAlign: 'center',
  },
  speedRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  speedChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: `${colors.grey}35`,
    backgroundColor: 'transparent',
  },
  speedChipActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}15`,
  },
  speedText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.grey,
  },
  speedTextActive: {
    color: colors.primary,
  },
});

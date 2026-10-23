import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { useResponsiveScale } from '../../utils/responsive';
import { formatHijriDate } from '../../utils/hijri';
import { formatPrayerTime, type NextPrayer } from '../../utils/prayerTimes';

interface Props {
  status: 'loading' | 'ready' | 'denied';
  next: NextPrayer | null;
  onRetry: () => void;
}

// The Islamic date never needs location (utils/hijri.ts). The right side is
// the real next-prayer time once a fix resolves, or the honest fallback --
// never a guessed time.
export default function DateRow({ status, next, onRetry }: Props) {
  const sc = useResponsiveScale();
  const styles = React.useMemo(() => makeStyles(sc), [sc]);

  return (
    <View style={styles.row}>
      <Text style={styles.dateText} numberOfLines={1}>{formatHijriDate().toUpperCase()}</Text>
      {status === 'ready' && next ? (
        <Text style={styles.cta} numberOfLines={1}>
          NEXT : {next.name.toUpperCase()} {formatPrayerTime(next.time)}
        </Text>
      ) : (
        <TouchableOpacity onPress={onRetry} disabled={status === 'loading'}>
          <Text style={styles.cta} numberOfLines={1}>
            {status === 'loading' ? 'FINDING PRAYER TIMES…' : 'ENABLE LOCATION FOR PRAYER TIMES'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function makeStyles(sc: (n: number) => number) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      gap: sc(8), marginBottom: sc(22),
    },
    // Date never shrinks or truncates -- it's the shorter, more load-bearing
    // side, so the CTA (longer and more variable: "ENABLE LOCATION FOR
    // PRAYER TIMES" vs "NEXT : FAJR 4:52 AM") absorbs the squeeze instead.
    dateText: { flexShrink: 0, fontFamily: 'Nunito-Bold', fontSize: sc(9), letterSpacing: 0.5, color: colors.mutedText },
    cta: { flex: 1, fontFamily: 'Nunito-Bold', fontSize: sc(10), letterSpacing: 0.5, color: colors.primary, textAlign: 'right' },
  });
}

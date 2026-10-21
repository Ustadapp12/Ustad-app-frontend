import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { useResponsiveScale } from '../../utils/responsive';

interface Props { title: string }

// Tajweed and Supplications both use this -- neither feature exists yet, so
// both read "Coming soon" instead of the Figma mock's "Jump here".
export default function LearnCard({ title }: Props) {
  const sc = useResponsiveScale();
  const styles = React.useMemo(() => makeStyles(sc), [sc]);

  return (
    <View style={styles.card} accessibilityLabel={`${title}, coming soon`}>
      <View style={styles.top}>
        <Text style={styles.comingSoon}>COMING SOON</Text>
      </View>
      <View style={styles.footer}>
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );
}

function makeStyles(sc: (n: number) => number) {
  return StyleSheet.create({
    card: {
      borderRadius: sc(10), borderWidth: 1, borderColor: colors.levelStartAccent,
      overflow: 'hidden', marginBottom: sc(14), backgroundColor: colors.white,
    },
    top: { height: sc(64), backgroundColor: colors.lightBg, alignItems: 'center', justifyContent: 'center' },
    footer: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: '#D9EFE1', paddingHorizontal: sc(16), paddingVertical: sc(12),
    },
    title: { fontFamily: 'Nunito-Bold', fontSize: sc(16), color: colors.darkText },
    comingSoon: { fontFamily: 'Nunito-Bold', fontSize: sc(12), letterSpacing: 0.8, color: colors.levelStartAccent },
  });
}

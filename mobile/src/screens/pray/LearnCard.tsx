import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { useResponsiveScale } from '../../utils/responsive';
import ComingSoonBanner from '../../components/ComingSoonBanner';

interface Props { title: string }

// Tajweed and Supplications both use this -- neither feature exists yet, so
// the card's top area is the same red "Coming Soon!" banner as the Quests
// tab (2026-10-22, on request) instead of the Figma mock's "Jump here". The
// green title strip below is unchanged.
export default function LearnCard({ title }: Props) {
  const sc = useResponsiveScale();
  const styles = React.useMemo(() => makeStyles(sc), [sc]);

  return (
    <View style={styles.card} accessibilityLabel={`${title}, coming soon`}>
      <ComingSoonBanner style={styles.top} fontSize={sc(20)} />
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
    top: { height: sc(64), paddingHorizontal: sc(16) },
    footer: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: '#D9EFE1', paddingHorizontal: sc(16), paddingVertical: sc(12),
    },
    title: { fontFamily: 'Nunito-Bold', fontSize: sc(16), color: colors.darkText },
  });
}

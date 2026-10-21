import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { useResponsiveScale } from '../../utils/responsive';
import type { Coords } from '../../utils/location';
import QiblaCompass from './QiblaCompass';
import SectionTitle from './SectionTitle';

interface Props { qiblaBearing: number; coords: Coords }

// Halved from the original sc(140) on request (2026-10-20) -- still the
// live, device-heading-driven dial (see QiblaCompass.tsx), just smaller.
const COMPASS_SIZE = 70;

export default function QiblaSection({ qiblaBearing, coords }: Props) {
  const sc = useResponsiveScale();
  const styles = React.useMemo(() => makeStyles(sc), [sc]);

  return (
    <View style={styles.wrap}>
      <SectionTitle>Qibla direction</SectionTitle>
      <QiblaCompass qiblaBearing={qiblaBearing} size={sc(COMPASS_SIZE)} coords={coords} />
      <Text style={styles.hint}>Turn until the Kaaba lines up with the red mark</Text>
    </View>
  );
}

function makeStyles(sc: (n: number) => number) {
  return StyleSheet.create({
    wrap: { alignItems: 'center', marginBottom: sc(26) },
    hint: { fontFamily: 'Nunito-Regular', fontSize: sc(11), color: colors.mutedText, marginTop: sc(10), textAlign: 'center' },
  });
}

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { useResponsiveScale } from '../../utils/responsive';

interface Props { children: string }

// Shared by QiblaSection ("Qibla direction") and PrayScreen's "Learn"
// heading, so the two section titles can't drift out of sync.
export default function SectionTitle({ children }: Props) {
  const sc = useResponsiveScale();
  const styles = React.useMemo(() => makeStyles(sc), [sc]);
  return <Text style={styles.title}>{children}</Text>;
}

function makeStyles(sc: (n: number) => number) {
  return StyleSheet.create({
    title: { fontFamily: 'Nunito-Bold', fontSize: sc(18), color: colors.darkText, marginBottom: sc(10) },
  });
}

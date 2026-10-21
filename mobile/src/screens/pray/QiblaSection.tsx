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
      <View style={styles.compassWrap}>
        <QiblaCompass qiblaBearing={qiblaBearing} size={sc(COMPASS_SIZE)} coords={coords} />
      </View>
      <Text style={styles.hint}>Turn until the Kaaba lines up with the red mark</Text>
    </View>
  );
}

function makeStyles(sc: (n: number) => number) {
  return StyleSheet.create({
    wrap: { alignItems: 'center', marginBottom: sc(26) },
    // Pulls the circle up closer to the title on request (2026-10-21) --
    // a negative margin here rather than shrinking SectionTitle's own
    // marginBottom, which is shared with the "Learn" heading above the
    // Tajweed/Supplications cards and shouldn't move.
    // -8 not -6: QiblaCompass now includes its pointer's overhang in its own
    // box, so this keeps the circle where it was while the pointer still
    // clears the title by sc(2).
    compassWrap: { marginTop: -sc(8) },
    hint: { fontFamily: 'Nunito-Regular', fontSize: sc(11), color: colors.mutedText, marginTop: sc(10), textAlign: 'center' },
  });
}

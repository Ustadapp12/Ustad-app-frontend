import React, { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useResponsiveScale } from '../../utils/responsive';

interface Props { currentPrayer: string | null }

// Figma `pray_page.zip`'s hero card. Colors sampled from the real Figma
// node (1151:10822) in a design-review pass (2026-10-20): a vertical navy
// -> deep blue -> muddy olive -> dusty gold-brown run, not the brighter,
// flatter gradient first guessed from a PNG crop. "NOW" + the clock time
// and the current-prayer pill are both real/live; "Tap to log your salah"
// has no backend endpoint yet, so the button is left out (commented below)
// rather than shipped as something that does nothing when tapped.
export default function HeroSalahCard({ currentPrayer }: Props) {
  const sc = useResponsiveScale();
  const styles = React.useMemo(() => makeStyles(sc), [sc]);
  const [time, setTime] = useState(() => formatClock(new Date()));

  useEffect(() => {
    const id = setInterval(() => setTime(formatClock(new Date())), 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <LinearGradient
      colors={['#0F1B2A', '#122134', '#172A42', '#243850', '#545345', '#6A6040']}
      locations={[0, 0.22, 0.45, 0.68, 0.85, 0.96]}
      style={styles.card}
    >
      <Text style={styles.now}>NOW</Text>
      <Text style={styles.time}>{time}</Text>
      {currentPrayer && (
        <Text style={styles.pill}>{currentPrayer}</Text>
      )}
      {/* No backend endpoint for salah-logging yet -- re-enable once one
          exists:
      <TouchableOpacity style={styles.btn}>
        <Text style={styles.btnText}>TAP TO LOG YOUR SALAH</Text>
      </TouchableOpacity> */}
    </LinearGradient>
  );
}

function formatClock(d: Date): string {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function makeStyles(sc: (n: number) => number) {
  return StyleSheet.create({
    card: {
      borderRadius: sc(16), paddingVertical: sc(18), paddingHorizontal: sc(16),
      alignItems: 'center', marginBottom: sc(20), minHeight: sc(130),
    },
    now: { fontFamily: 'Nunito-Bold', fontSize: sc(10.5), letterSpacing: 2, color: '#8D95A5', textTransform: 'uppercase', marginTop: sc(4) },
    time: { fontFamily: 'Nunito-Black', fontSize: sc(32), color: '#AFAFAF', letterSpacing: 0.5, marginTop: sc(2) },
    pill: {
      marginTop: sc(9), paddingVertical: sc(7), paddingHorizontal: sc(22), borderRadius: 999,
      backgroundColor: '#E9C468', color: '#FFFFFF', fontFamily: 'Nunito-Bold', fontSize: sc(13), overflow: 'hidden',
    },
    // Kept defined for when the button above is re-enabled.
    btn: {
      width: '100%', marginTop: sc(16), paddingVertical: sc(13), borderRadius: sc(13),
      alignItems: 'center', backgroundColor: '#E9CE68',
    },
    btnText: { fontFamily: 'Nunito-Bold', fontSize: sc(12.5), letterSpacing: 0.4, color: '#F4F5F1' },
  });
}

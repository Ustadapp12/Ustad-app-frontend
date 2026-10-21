import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View, StyleSheet, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useResponsiveScale } from '../../utils/responsive';
import type { RootNavProp } from '../../navigation/types';

interface Props {
  currentPrayer: string | null;
  locationDenied: boolean;
  onEnableLocation: () => void;
}

// Figma node 1151:10822 ("namaz Card") is full-bleed: 441x422 at y=0 of the
// 440-wide frame, running up behind the status bar with only the bottom
// corners rounded. Every size below is a Figma value scaled by width/440.
const FIGMA_W = 440;
const CARD_H = 422;
// Figma puts the 56pt button 31pt above the card edge and 63pt below the
// pill; moved up 24pt on request (2026-10-21), so the pill stays put and
// only the button rises.
const BTN_W = 277;
const BTN_H = 56;
const BTN_BOTTOM_GAP = 55;
const PILL_TO_BTN = 39;

// Figma `pray_page.zip`'s hero card. Colors sampled from the real Figma
// node in a design-review pass (2026-10-20): a vertical navy -> deep blue
// -> muddy olive -> dusty gold-brown run, not the brighter, flatter
// gradient first guessed from a PNG crop. "NOW" + the clock time and the
// current-prayer pill are both real/live. "Tap to log your salah" has no
// backend endpoint yet, so it opens the same "coming soon" page the map's
// Journey/Review buttons already use, rather than doing nothing when
// tapped.
export default function HeroSalahCard({ currentPrayer, locationDenied, onEnableLocation }: Props) {
  const navigation = useNavigation<RootNavProp>();
  const sc = useResponsiveScale();
  const { width: screenW } = useWindowDimensions();
  const styles = React.useMemo(() => makeStyles(sc, screenW / FIGMA_W), [sc, screenW]);
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
      <View style={styles.pillSlot}>
        {locationDenied ? (
          <Text style={styles.deniedText}>Enable location for prayer times</Text>
        ) : currentPrayer ? (
          <Text style={styles.pill}>{currentPrayer}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={styles.btn}
        activeOpacity={0.85}
        onPress={locationDenied
          ? onEnableLocation
          : () => navigation.navigate('LogSalah')}
      >
        <Text style={styles.btnText} numberOfLines={1} adjustsFontSizeToFit>{locationDenied ? 'ENABLE LOCATION' : 'TAP TO LOG YOUR SALAH'}</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

function formatClock(d: Date): string {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function makeStyles(sc: (n: number) => number, f: number) {
  return StyleSheet.create({
    card: {
      width: FIGMA_W * f, height: CARD_H * f,
      borderBottomLeftRadius: 24 * f, borderBottomRightRadius: 24 * f,
      alignItems: 'center', justifyContent: 'flex-end', paddingBottom: BTN_BOTTOM_GAP * f,
      marginBottom: sc(20),
    },
    now: { fontFamily: 'Nunito-Bold', fontSize: sc(12), letterSpacing: 2, color: '#8D95A5', textTransform: 'uppercase' },
    // A denied state has no pill; this keeps the button at the same height.
    pillSlot: { minHeight: 38 * f, alignItems: 'center', justifyContent: 'flex-start' },
    time: { fontFamily: 'Nunito-Black', fontSize: sc(36), color: '#AFAFAF', letterSpacing: 0.5, marginTop: sc(2) },
    pill: {
      marginTop: sc(9), paddingVertical: sc(7), paddingHorizontal: sc(22), borderRadius: 999,
      backgroundColor: '#E9C468', color: '#FFFFFF', fontFamily: 'Nunito-Bold', fontSize: sc(13), overflow: 'hidden',
    },
    deniedText: {
      marginTop: sc(9), fontFamily: 'Nunito-Bold', fontSize: sc(12), color: '#D9DEE3', textAlign: 'center',
    },
    // Darker bottom lip, as in Figma and the mockup.
    btn: {
      width: BTN_W * f, height: BTN_H * f, marginTop: PILL_TO_BTN * f, borderRadius: sc(13),
      alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9CE68',
      borderBottomWidth: 5 * f, borderBottomColor: '#B8A350',
    },
    btnText: { fontFamily: 'Nunito-Bold', fontSize: sc(12.5), letterSpacing: 0.4, color: '#F4F5F1' },
  });
}

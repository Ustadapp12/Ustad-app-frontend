import React, { useCallback, useState } from 'react';
import { Text, TouchableOpacity, View, StyleSheet, useWindowDimensions } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useResponsiveScale } from '../../utils/responsive';
import type { RootNavProp } from '../../navigation/types';
import type { Coords } from '../../utils/location';
import QiblaCompass from './QiblaCompass';

interface Props {
  currentPrayer: string | null;
  locationDenied: boolean;
  onEnableLocation: () => void;
  /** Both null until a real GPS fix resolves; no compass is drawn then. */
  qiblaBearing: number | null;
  coords: Coords | null;
}

// Figma node 1151:10822 ("namaz Card") is full-bleed: 441x422 at y=0 of the
// 440-wide frame, running up behind the status bar with only the bottom
// corners rounded. Every size below is a Figma value scaled by width/440.
const FIGMA_W = 440;
const CARD_H = 422;
// Figma puts the 56pt button 31pt above the card edge and 63pt below the
// pill; moved up 24pt on request (2026-10-21), then another 30pt
// (2026-10-22, still read as sitting on the card's border), so the pill
// stays put and only the button rises.
const BTN_W = 277;
const BTN_H = 56;
const BTN_BOTTOM_GAP = 85;
const PILL_TO_BTN = 39;
// Live qibla dial as the Figma card places it: on the right edge, its top
// level with the prayer pill's top (measured from the 1x export,
// 2026-10-22). Anchored to the pill row and the card's right edge, sized
// with sc() like the rest of the app, not pinned to card coordinates.
// Figma 77.5 / 17pt on a 440 frame = 69 / 15 at sc()'s 393 baseline.
const COMPASS_SIZE = 69;
const COMPASS_RIGHT = 15;
// Gap between the clock and the pill (and the compass, which stays level
// with it). 9 -> 24 on request (2026-10-22) so the yellow pill and button
// sit clearly below the doubled clock; the card grows at the top for it.
const PILL_TOP = 24;

// Figma `pray_page.zip`'s hero card. Colors sampled from the real Figma
// node in a design-review pass (2026-10-20): a vertical navy -> deep blue
// -> muddy olive -> dusty gold-brown run, not the brighter, flatter
// gradient first guessed from a PNG crop. "NOW" + the clock time and the
// current-prayer pill are both real/live. "Tap to log your salah" has no
// backend endpoint yet, so it opens the same "coming soon" page the map's
// Journey/Review buttons already use, rather than doing nothing when
// tapped.
export default function HeroSalahCard({ currentPrayer, locationDenied, onEnableLocation, qiblaBearing, coords }: Props) {
  const navigation = useNavigation<RootNavProp>();
  const sc = useResponsiveScale();
  const { width: screenW } = useWindowDimensions();
  const { top: topInset } = useSafeAreaInsets();
  const styles = React.useMemo(() => makeStyles(sc, screenW / FIGMA_W, topInset), [sc, screenW, topInset]);
  const [time, setTime] = useState(() => formatClock(new Date()));

  // Only while the Pray tab is focused: the tab stays mounted on other tabs,
  // so a mount-scoped interval kept firing everywhere (animation audit,
  // 2026-10-22). Refreshed at once on focus so the clock is never stale.
  useFocusEffect(
    useCallback(() => {
      setTime(formatClock(new Date()));
      const id = setInterval(() => setTime(formatClock(new Date())), 15000);
      return () => clearInterval(id);
    }, []),
  );

  return (
    <LinearGradient
      colors={['#0F1B2A', '#122134', '#172A42', '#243850', '#545345', '#6A6040']}
      locations={[0, 0.22, 0.45, 0.68, 0.85, 0.96]}
      style={styles.card}
    >
      <Text style={styles.now}>NOW</Text>
      <Text style={styles.time} numberOfLines={1} adjustsFontSizeToFit>{time}</Text>
      <View style={styles.pillSlot}>
        {locationDenied ? (
          <Text style={styles.deniedText}>Enable location for prayer times</Text>
        ) : currentPrayer ? (
          <Text style={styles.pill}>{currentPrayer}</Text>
        ) : null}
        {qiblaBearing != null && coords != null && (
          <View style={styles.compass}>
            <QiblaCompass qiblaBearing={qiblaBearing} size={sc(COMPASS_SIZE)} coords={coords} />
          </View>
        )}
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

function makeStyles(sc: (n: number) => number, f: number, topInset: number) {
  return StyleSheet.create({
    card: {
      // Figma height as a floor, not a fixed size: with NOW and the clock at
      // 2x (2026-10-22) the content can outgrow it on narrow notched phones,
      // and the top inset keeps NOW clear of the status bar it runs behind.
      width: FIGMA_W * f, minHeight: CARD_H * f, paddingTop: topInset,
      borderBottomLeftRadius: 24 * f, borderBottomRightRadius: 24 * f,
      alignItems: 'center', justifyContent: 'flex-end', paddingBottom: BTN_BOTTOM_GAP * f,
      marginBottom: sc(20),
    },
    // NOW and the clock doubled on request (2026-10-22): 12 -> 24, 36 -> 72,
    // then taken down a bit the same day: 24 -> 20, 72 -> 60.
    now: { fontFamily: 'Nunito-Bold', fontSize: sc(20), letterSpacing: 3.5, color: '#8D95A5', textTransform: 'uppercase' },
    // A denied state has no pill; this keeps the button at the same height.
    pillSlot: { alignSelf: 'stretch', minHeight: 38 * f, alignItems: 'center', justifyContent: 'flex-start' },
    // Tight line height: Nunito's default (~1.36x) adds ~20pt of empty space at 60pt.
    time: { fontFamily: 'Nunito-Black', fontSize: sc(60), lineHeight: sc(67), color: '#AFAFAF', letterSpacing: 1, marginTop: sc(2) },
    pill: {
      marginTop: sc(PILL_TOP), paddingVertical: sc(7), paddingHorizontal: sc(22), borderRadius: 999,
      backgroundColor: '#E9C468', color: '#FFFFFF', fontFamily: 'Nunito-Bold', fontSize: sc(13), overflow: 'hidden',
    },
    deniedText: {
      marginTop: sc(PILL_TOP), fontFamily: 'Nunito-Bold', fontSize: sc(12), color: '#D9DEE3', textAlign: 'center',
    },
    compass: { position: 'absolute', right: sc(COMPASS_RIGHT), top: sc(PILL_TOP) },
    // Darker bottom lip, as in Figma and the mockup.
    btn: {
      width: BTN_W * f, height: BTN_H * f, marginTop: PILL_TO_BTN * f, borderRadius: sc(13),
      alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9CE68',
      borderBottomWidth: 5 * f, borderBottomColor: '#B8A350',
    },
    btnText: { fontFamily: 'Nunito-Bold', fontSize: sc(12.5), letterSpacing: 0.4, color: '#F4F5F1' },
  });
}

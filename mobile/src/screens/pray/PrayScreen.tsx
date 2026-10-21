import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { useResponsiveScale, safeBottomInset, type Scale } from '../../utils/responsive';
import { getCurrentCoordinates, type Coords } from '../../utils/location';
import { nextPrayerFromCoords, currentPrayerFromCoords, type NextPrayer } from '../../utils/prayerTimes';
import { qiblaBearingFromCoords } from '../../utils/qibla';
import { usersApi } from '../../api';
import HeroSalahCard from './HeroSalahCard';
import DateRow from './DateRow';
import QiblaSection from './QiblaSection';
import LearnCard from './LearnCard';
import SectionTitle from './SectionTitle';

// Figma `pray_page.zip` (2026-10-20), the middle tab (the 8-point star icon
// in the bottom bar). The Islamic date needs no location (see utils/hijri.ts,
// used inside DateRow.tsx). The prayer time, current prayer, and qibla
// bearing are all real, computed on-device from one GPS fix
// (utils/location.ts) -- adhan for the math, @react-native-community/
// geolocation + react-native-compass-heading for location and live device
// heading (user's explicit calls, 2026-10-20). Never fabricated: a denied or
// unreadable location shows the "enable location" prompt and no compass, not
// a guessed time. Tajweed and Supplications aren't built yet, so both read
// "Coming soon" instead of the Figma mock's "Jump here" (see LearnCard.tsx).
// Split into one component per Figma piece on request (2026-10-20) -- this
// file is just the data-loading orchestrator now.

interface PrayerData { coords: Coords | null; next: NextPrayer | null; current: string | null; qibla: number | null }

/** Exported separately from the component so it's testable as a plain async
 * function, matching this repo's existing test style (no component-render
 * harness is set up here) -- see __tests__/prayScreen.test.ts. Carries
 * `coords` back out (not just the derived fields) so the component can
 * cache it and re-derive next/current locally as time passes, instead of
 * re-reading the GPS on every tick -- see PrayScreen's recompute(). */
export async function loadPrayerData(): Promise<PrayerData> {
  const coords = await getCurrentCoordinates();
  if (!coords) return { coords: null, next: null, current: null, qibla: null };
  // Mid-session GPS refresh: independent of session start/end, fires every
  // time this tab gets a fresh fix. Best-effort -- never blocks or affects
  // what's shown.
  usersApi.updateLocation(coords.latitude, coords.longitude).catch(() => undefined);
  return {
    coords,
    next: nextPrayerFromCoords(coords),
    current: currentPrayerFromCoords(coords),
    qibla: qiblaBearingFromCoords(coords),
  };
}

export default function PrayScreen() {
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  const sc = useResponsiveScale();
  const styles = useMemo(() => makeStyles(sc, insets.bottom), [sc, insets.bottom]);

  const [next, setNext] = useState<NextPrayer | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [qibla, setQibla] = useState<number | null>(null);
  // Also kept in state (not just coordsRef below) so QiblaSection/
  // QiblaCompass can re-render with it -- they need it to correct the live
  // compass heading for magnetic declination (utils/declination.ts).
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'denied'>('loading');

  // The last GPS fix, cached so the tick below can re-derive "what's next
  // right now" from plain date math without re-reading the GPS every time.
  const coordsRef = useRef<Coords | null>(null);

  // Cheap: pure date math against an already-resolved coordinate, no GPS or
  // permission call. Safe to run every tick.
  const recompute = useCallback((coords: Coords) => {
    setNext(nextPrayerFromCoords(coords));
    setCurrent(currentPrayerFromCoords(coords));
    setQibla(qiblaBearingFromCoords(coords));
    setCoords(coords);
  }, []);

  // Expensive-ish: loadPrayerData() does a real GPS fix (permission check +
  // hardware read) plus a location ping to the backend. Called rarely --
  // see the focus effect below -- never from the frequent tick, so a Pray
  // tab left open isn't hammering the GPS and the backend every minute for
  // no reason.
  const refetchLocation = useCallback(() => {
    setStatus('loading');
    loadPrayerData()
      .then(({ coords, next: n, current: c, qibla: q }) => {
        coordsRef.current = coords;
        setNext(n);
        setCurrent(c);
        setQibla(q);
        setCoords(coords);
        setStatus(coords ? 'ready' : 'denied');
      })
      .catch(() => { coordsRef.current = null; setCoords(null); setStatus('denied'); });
  }, []);

  // Bug (2026-10-20): "next prayer" and the hero card's clock stayed stuck
  // on whatever was computed at first mount -- e.g. still showing "Fajr
  // 4:53" hours later, well past it -- because this tab stays mounted
  // across tab switches (same as every other tab screen in MainTabs) and a
  // plain useEffect only fires once for the component's whole lifetime.
  // Fixed in two parts: refetchLocation() (a real GPS read) re-runs every
  // time the tab regains focus; the 60s tick re-derives next/current from
  // the coordinate already cached above (recompute(), cheap local math) so
  // it stays correct even if the user just leaves the tab open through a
  // prayer boundary without ever navigating away or re-reading the GPS.
  useFocusEffect(
    useCallback(() => {
      refetchLocation();
      const id = setInterval(() => {
        if (coordsRef.current) recompute(coordsRef.current);
      }, 60000);
      return () => clearInterval(id);
    }, [refetchLocation, recompute]),
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + sc(16) }]}>
      <HeroSalahCard currentPrayer={status === 'ready' ? current : null} />

      <DateRow status={status} next={next} onRetry={refetchLocation} />

      {status === 'ready' && qibla != null && coords != null && (
        <QiblaSection qiblaBearing={qibla} coords={coords} />
      )}

      <SectionTitle>Learn</SectionTitle>
      <LearnCard title="Tajweed" />
      <LearnCard title="Supplications" />
    </View>
  );
}

function makeStyles(sc: Scale, bottomInset: number) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.lightBg, paddingHorizontal: sc(16), paddingBottom: bottomInset },
  });
}

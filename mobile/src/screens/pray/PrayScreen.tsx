import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useStatusBarStyle } from '../../hooks/useStatusBarStyle';
import { useResponsiveScale } from '../../utils/responsive';
import { getLastKnownCoordinates, loadSavedCoordinates, type Coords } from '../../utils/location';
import { nextPrayerFromCoords, currentPrayerFromCoords, type NextPrayer } from '../../utils/prayerTimes';
import { qiblaBearingFromCoords } from '../../utils/qibla';
import { loadPrayerData } from './prayerData';
import HeroSalahCard from './HeroSalahCard';
import DateRow from './DateRow';
import LearnCard from './LearnCard';
import SectionTitle from './SectionTitle';
import { makeStyles } from './PrayScreen.styles';

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

// Loading the prayer data (GPS fix + server location ping) lives in
// prayerData.ts, so this screen never calls the API itself (2026-10-22).

export default function PrayScreen() {
  const sc = useResponsiveScale();
  const styles = useMemo(() => makeStyles(sc), [sc]);

  const [next, setNext] = useState<NextPrayer | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [qibla, setQibla] = useState<number | null>(null);
  // Also kept in state (not just coordsRef below) so HeroSalahCard's
  // QiblaCompass can re-render with it -- they need it to correct the live
  // compass heading for magnetic declination (utils/declination.ts).
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'denied'>('loading');

  // The last GPS fix, cached so the tick below can re-derive "what's next
  // right now" from plain date math without re-reading the GPS every time.
  const coordsRef = useRef<Coords | null>(null);
  // Whether a real GPS/permission attempt has already happened this mount --
  // see onRetryPress below.
  const attemptedRef = useRef(false);

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
  //
  // Times we can already work out are shown at once -- from this run's last
  // fix, or the one saved on the device -- and the fresh fix refreshes them
  // quietly. "Finding prayer times" only shows when there is truly no fix
  // yet. A failed read keeps the old times; only a denied permission (which
  // clears the saved fix, see utils/location.ts) switches to "denied".
  const refetchLocation = useCallback(async () => {
    attemptedRef.current = true;
    if (!coordsRef.current) {
      const saved = await loadSavedCoordinates();
      if (saved && !coordsRef.current) {
        coordsRef.current = saved;
        recompute(saved);
        setStatus('ready');
      }
    }
    if (!coordsRef.current) setStatus('loading');
    try {
      const { coords: fresh } = await loadPrayerData();
      if (fresh) {
        coordsRef.current = fresh;
        recompute(fresh);
        setStatus('ready');
      } else if (!getLastKnownCoordinates()) {
        coordsRef.current = null;
        setCoords(null);
        setStatus('denied');
      }
    } catch {
      if (!coordsRef.current) setStatus('denied');
    }
  }, [recompute]);

  // The DateRow "enable location" tap: a real GPS/permission attempt the
  // first time, but once one has already happened and come back denied,
  // re-asking is a dead end -- iOS in particular only ever shows its
  // system permission dialog once per install, so a second call to the
  // same API silently resolves denied again with no visible prompt at
  // all. Send the user to the app's Settings page instead, where turning
  // it on actually does something.
  const onRetryPress = useCallback(() => {
    if (attemptedRef.current && status === 'denied') {
      Linking.openSettings().catch(() => undefined);
      return;
    }
    refetchLocation();
  }, [refetchLocation, status]);

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
  // The hero card runs up behind the status bar (Figma), so its icons must
  // be light here and go back to dark for every other screen.
  useStatusBarStyle('light');

  useFocusEffect(
    useCallback(() => {
      refetchLocation();
      const id = setInterval(() => {
        if (coordsRef.current) recompute(coordsRef.current);
      }, 60000);
      return () => clearInterval(id);
    }, [refetchLocation, recompute]),
  );

  // Scrolls (2026-10-22): the hero card plus the Learn cards run past one
  // screen on most phones. No bounce, so pulling down never shows the light
  // page background above the dark full-bleed card.
  return (
    <View style={styles.container}>
      <ScrollView bounces={false} overScrollMode="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <HeroSalahCard
          currentPrayer={status === 'ready' ? current : null}
          locationDenied={status === 'denied'}
          onEnableLocation={onRetryPress}
          qiblaBearing={status === 'ready' ? qibla : null}
          coords={status === 'ready' ? coords : null}
        />

        <View style={styles.body}>
          <DateRow status={status} next={next} onRetry={onRetryPress} />

          <SectionTitle>Learn</SectionTitle>
          <LearnCard title="Tajweed" />
          <LearnCard title="Supplications" />
        </View>
      </ScrollView>
    </View>
  );
}

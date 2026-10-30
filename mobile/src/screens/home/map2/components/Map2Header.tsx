import React from 'react';
import { View, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import SkyHillArt, { SKY_HILL_H, SKY_HILL_W } from '../art/SkyHillArt';
import IconDumbbellArt from '../art/IconDumbbellArt';
import IconDumbbellShadowArt from '../art/IconDumbbellShadowArt';
import { MAP2_IMAGES } from '../assets';
import type { Map2Styles } from '../styles';
import type { LearningMe } from '../../../../types/api';
import StatCard from './StatCard';
import FeatureButton, { type FeatureSpec } from './FeatureButton';
import { useTourTarget } from '../../../../components/tour/useTourTarget';

// Left column: Search, Progress. Right column: Journey, Review. Search/Journey
// and Progress/Review sit on the same row — the left column's top values are
// pinned to the right column's so the two line up instead of drifting apart.
// All four moved up 20pt on request (2026-10-22): 80 -> 60, 152 -> 132,
// still clear of the stat pills, whose row ends near 27.
const SEARCH: FeatureSpec = {
  left: 15, top: 60, w: 60.17, h: 62.68,
  bg: { left: 3, top: 18, w: 57.17, h: 44.68 },
  image: { src: MAP2_IMAGES.search, left: -1, top: -4, size: 55.25, rotate: -0.98 },
  label: { text: 'Search', top: 43 },
};
const PROGRESS: FeatureSpec = {
  left: 18, top: 132, w: 60.89, h: 61.68,
  bg: { left: 3, top: 17, w: 57.17, h: 44.68 },
  image: { src: MAP2_IMAGES.journey, left: 3, top: -4, size: 55.49, rotate: -4.91 },
  label: { text: 'Progress', top: 41 },
};
const JOURNEY: FeatureSpec = {
  left: 362, top: 60, w: 60.7, h: 67.68,
  bg: { left: 0, top: 23, w: 57.18, h: 46.5 },
  image: { src: MAP2_IMAGES.review, left: 1, top: 0, size: 59.7, rotate: 4.52 },
  label: { text: 'Journey', top: 51 },
};
const REVIEW: FeatureSpec = {
  left: 364, top: 132, w: 60.7, h: 67.68,
  bg: { left: 0, top: 23, w: 57.18, h: 46.5 },
  image: { src: MAP2_IMAGES.review, left: -2, top: -2.97, size: 59.27, rotate: 3.03 },
  label: { text: 'Review', top: 51 },
  labelUnderImage: true,
};
// Lowest point any header element reaches (the Review label), in Figma points.
const HEADER_REACH = 222;
const FADE_H = 28;

interface Props {
  S: Map2Styles;
  s: number;
  topInset: number;
  learning: LearningMe | null;
  isGuestUser: boolean;
  onStreak: () => void;
  onHearts: () => void;
  onGems: () => void;
  onXp: () => void;
  onSearch: () => void;
  onProgress: () => void;
  onJourney: () => void;
  onReview: () => void;
}

// Pinned over the scrolling map: sky, sun and hill never move; nodes and sand
// slide underneath and fade out under the hill's edge.
function Map2Header({
  S, s, topInset, learning, isGuestUser, onStreak, onHearts, onGems, onXp, onSearch, onProgress, onJourney, onReview,
}: Props) {
  const banked = (n: number | undefined) => (learning ? (isGuestUser ? '—' : String(n ?? 0)) : '…');
  const hillBottom = topInset + SKY_HILL_H * s;
  const streakTarget = useTourTarget('hudStreak', 'round');
  const xpTarget = useTourTarget('hudXp', 'round');
  return (
    <View style={[S.header, { height: topInset + HEADER_REACH * s }]}>
      <View style={[S.headerSkyFill, { height: topInset + 1 }]} />
      <SkyHillArt width={SKY_HILL_W * s} style={[styles.hill, { left: -41 * s, top: topInset }]} />
      <LinearGradient
        pointerEvents="none"
        colors={['#F9F0D7', 'rgba(249,240,215,0)']}
        style={[styles.fade, { top: hillBottom - 1, height: FADE_H * s }]}
      />
      {/* Nudged up by one stat pill's own height (35pt, see StatPillBgArt)
          on request (2026-10-20), so the row sits tighter against the sky. */}
      <View style={[S.statRow, { top: topInset + (3 - 35) * s }]} pointerEvents="box-none">
        <StatCard S={S} s={s} icon={MAP2_IMAGES.streak} label="Streak" value={banked(learning?.current_streak)} onPress={onStreak} targetRef={streakTarget.ref} />
        {/* Hearts and gems aren't live in the backend yet: a dash until they
            are. Still tappable -- both open an explainer page rather than a
            live balance. */}
        <StatCard S={S} s={s} icon={MAP2_IMAGES.hearts} label="Hearts" value="—" onPress={onHearts} />
        <StatCard S={S} s={s} icon={MAP2_IMAGES.gems} label="Gems" value="—" onPress={onGems} />
        <StatCard S={S} s={s} icon={MAP2_IMAGES.xp} label="XP" value={banked(learning?.xp_total)} onPress={onXp} targetRef={xpTarget.ref} />
      </View>
      <FeatureButton S={S} s={s} topInset={topInset} spec={SEARCH} onPress={onSearch} />
      <FeatureButton S={S} s={s} topInset={topInset} spec={PROGRESS} onPress={onProgress} />
      <FeatureButton S={S} s={s} topInset={topInset} spec={JOURNEY} onPress={onJourney}>
        <IconDumbbellArt width={35 * s} style={[styles.dumbbell, { left: 25 * s, top: 27 * s }]} />
      </FeatureButton>
      <FeatureButton S={S} s={s} topInset={topInset} spec={REVIEW} onPress={onReview}>
        <IconDumbbellShadowArt width={37 * s} style={[styles.dumbbellShadow, { left: 20 * s, top: 23 * s }]} />
        <IconDumbbellArt width={35 * s} height={26 * s} style={[styles.dumbbellRaised, { left: 21 * s, top: 24 * s }]} />
      </FeatureButton>
    </View>
  );
}

export default React.memo(Map2Header);

const styles = StyleSheet.create({
  hill: { position: 'absolute' },
  fade: { position: 'absolute', left: 0, right: 0 },
  dumbbell: { position: 'absolute' },
  dumbbellShadow: { position: 'absolute' },
  dumbbellRaised: { position: 'absolute' },
});

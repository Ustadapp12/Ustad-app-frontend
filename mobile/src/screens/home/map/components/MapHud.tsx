import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import ShieldIcon from '../../../../components/ShieldIcon';
import { colors } from '../../../../theme/colors';
import { STREAK_ACTIVE_ICON_SMALL, STREAK_FROZEN_ICON_SMALL, isStreakFrozen, streakColor } from '../../../../utils/streak';
import { useTourStore } from '../../../../store/tourStore';
import { TOUR_STEPS } from '../../../../components/tour/tourSteps';
import { TOUR_GLOW } from '../../../../components/tour/tourGlow';
import { useTourTarget } from '../../../../components/tour/useTourTarget';
import type { LearningMe } from '../../../../types/api';
import type { MapNavProp } from '../../../../navigation/types';
import type { Styles } from '../mapStyles';

// The map's top bar: streak pill + Search on the left, XP pill + Progress on
// the right. Owns its own tour targets/glow and pill measurements, so a tour
// step change or a pill re-measure re-renders only this, not the whole map.
interface Props {
  S: Styles['S'];
  sc: (n: number) => number;
  topInset: number;
  learning: LearningMe | null;
  isGuestUser: boolean;
  onGuestPress: () => void;
  navigation: MapNavProp;
}

function MapHud({ S, sc, topInset, learning, isGuestUser, onGuestPress, navigation }: Props) {
  // Separate refs (not one ref around the whole HUD row) so the tour can
  // glow the streak pill and the XP pill as two distinct targets, matching
  // how they're introduced as two separate steps.
  // 'round': S.hudPill's declared borderRadius (sc(20)) always exceeds half
  // its own rendered height, so it clamps to a full stadium regardless of sc
  // scale — matching that clamp here directly is simpler and no less
  // correct than importing sc() to restate the same number.
  const streakTarget = useTourTarget('hudStreak', 'round');
  const xpTarget = useTourTarget('hudXp', 'round');
  // Tour-only: each pill glows itself (a real border+shadow on the real
  // pill, inheriting S.hudPill's own borderRadius) exactly while the tour's
  // current step targets it — same pattern as the tab icons in MainTabs, so
  // there's no drawn ring to fall out of sync with the pill's real shape.
  const glowStreak = useTourStore(s => s.active && TOUR_STEPS[s.stepIndex]?.target === 'hudStreak');
  const glowXp = useTourStore(s => s.active && TOUR_STEPS[s.stepIndex]?.target === 'hudXp');
  // Streak pill's own measured width, so the search button below it (which
  // has no natural size tied to the pill's variable digit count) can be
  // sized to exactly match it instead of a guessed constant — keeps both
  // edges flush with the pill across every screen width.
  const [streakPillWidth, setStreakPillWidth] = useState<number | null>(null);
  const [xpPillWidth, setXpPillWidth] = useState<number | null>(null);
  // Search button image box, and the visible art square inside it (45 of 91px).
  const searchBox = (streakPillWidth ?? sc(40)) * 2;
  const searchArtSize = searchBox * (45 / 91);
  // Vertical gap between each HUD pill and the button under it — search on
  // the left, Progress on the right. Deliberately ONE value shared by both
  // columns: the Progress side adds the search art's own internal top padding
  // on top of this and nothing else, so changing this number moves the two
  // together and they stay parallel by construction.
  //
  // Negative pulls the row up under the pills. Safe to go negative because
  // search box (1).png carries its art 20/91 of the way down a 91x90 canvas,
  // so roughly a quarter of the image box above the visible art is
  // transparent padding. Was sc(6); raised per request.
  const HUD_BTN_GAP = sc(-10);

  // HUD — streak (emoji) top-left, XP top-right. Hearts hidden on the
  // map for now (still shown in-lesson). No backdrop of its own: the
  // pills carry their own opaque background and shadow, so they read
  // fine straight over the live sky.
  // box-none throughout: only the pills/buttons take touches, so a drag
  // starting on empty sky between them still scrolls the map.
  return (
    <View style={[S.hud, { paddingTop: topInset + sc(4) }]} pointerEvents="box-none">
      <View style={S.hudRow} pointerEvents="box-none">
        <View style={{ alignItems: 'flex-start' }} pointerEvents="box-none">
          {/* alignItems: 'flex-start' above keeps this column hugging its
              own children's widths — without it, RN's default `stretch`
              widens the streak pill (intrinsically narrow) out to match
              whatever the search button below measures, warping its
              rounded-pill shape into an elongated bar. */}
          <TouchableOpacity
            {...streakTarget}
            style={[S.hudPill, glowStreak && TOUR_GLOW]}
            activeOpacity={0.7}
            onPress={() => (isGuestUser ? onGuestPress() : navigation.navigate('Streak'))}
            onLayout={e => setStreakPillWidth(e.nativeEvent.layout.width)}
          >
            <Image
              source={isStreakFrozen(learning?.streak_state) ? STREAK_FROZEN_ICON_SMALL : STREAK_ACTIVE_ICON_SMALL}
              style={S.hudStreakIcon}
              resizeMode="contain"
            />
            <Text style={[S.hudVal, { color: streakColor(learning?.streak_state) }]}>
              {learning ? (isGuestUser ? '—' : learning.current_streak) : '…'}
            </Text>
          </TouchableOpacity>
          {/* Search button — own row directly below the streak pill, sized
              off the pill's own measured width (streakPillWidth) then
              doubled per explicit request (was flush 1x-with-the-pill, now
              2x that). Wrapped in a box exactly streakPillWidth wide with
              alignItems: 'center' so the now-wider button image centers
              *under the pill's own footprint* — the outer column above
              stays alignItems: 'flex-start', so the pill's own position is
              completely untouched; only the button (now wider than the
              pill) is recentered relative to it, overflowing evenly left
              and right of the pill's edges instead of starting flush with
              its left edge. Falls back to sc(40) before the first layout
              pass measures the pill. */}
          <View style={{ width: streakPillWidth ?? sc(40), alignItems: 'center', marginTop: HUD_BTN_GAP }} pointerEvents="box-none">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('SearchSurahs')}
              accessibilityLabel="Search surahs"
            >
              <Image
                source={require('../../../../../assets/map/search box (1).png')}
                style={{
                  width: (streakPillWidth ?? sc(40)) * 2,
                  height: (streakPillWidth ?? sc(40)) * 2,
                }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>
        {/* Right column mirrors the left: XP pill, then the Progress button
            centered under it. alignItems: 'flex-end' keeps the XP pill at
            its original right edge. The button matches the search art's
            VISIBLE square (search box (1).png is 91x90 with a 45x45 art
            area 22/20px in), not its padded image box, and starts at the
            same height, so the two read as one row. */}
        <View style={{ alignItems: 'flex-end', alignSelf: 'flex-start' }} pointerEvents="box-none">
          <TouchableOpacity
            {...xpTarget}
            style={[S.hudPill, glowXp && TOUR_GLOW]}
            activeOpacity={0.7}
            onPress={() => (isGuestUser ? onGuestPress() : navigation.navigate('XP'))}
            onLayout={e => setXpPillWidth(e.nativeEvent.layout.width)}
          >
            <Text>⚡</Text>
            <Text style={[S.hudVal, { color: colors.primary }]}>
              {learning ? (isGuestUser ? '— XP' : `${learning.xp_total} XP`) : '… XP'}
            </Text>
          </TouchableOpacity>
          <View
            style={{
              width: Math.max(xpPillWidth ?? 0, searchArtSize),
              alignItems: 'center',
              // contain letterboxes the 91x90 canvas by box/182 vertically.
              marginTop: HUD_BTN_GAP + searchBox * (20 / 91) + searchBox / 182,
            }}
            pointerEvents="box-none"
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('SurahProgress')}
              accessibilityLabel="Progress"
              style={[S.progressBtn, { width: searchArtSize, height: searchArtSize, borderRadius: searchArtSize * 0.22 }]}
            >
              <ShieldIcon size={searchArtSize * 0.5} />
              <Text style={[S.progressBtnText, { fontSize: searchArtSize * 0.17 }]} numberOfLines={1} adjustsFontSizeToFit>
                Progress
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

export default React.memo(MapHud);

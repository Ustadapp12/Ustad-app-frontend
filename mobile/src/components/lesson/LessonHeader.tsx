import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { colors } from '../../theme/colors';
import { TOUR_GLOW_ROUND, TOUR_GLOW_ROUND_THIN } from '../tour/tourGlow';
import LessonProgressBar from './LessonProgressBar';
import HintButton from './HintButton';

// 5 heart icons, each worth 2 half-heart units (full -> half -> empty), so a
// session ends at 10 mistakes, not 5. These must move together or the "out of
// hearts" trigger drifts out of sync with what the icons show.
export const MAX_HEARTS = 5;
export const MAX_MISTAKES = MAX_HEARTS * 2;

const HEART_FULL = require('../../../assets/map/redh.png');
const HEART_HALF = require('../../../assets/map/halfh.png');
const HEART_EMPTY = require('../../../assets/map/whiteh.png');

export interface LessonHeaderTargets {
  progress?: React.Ref<View>;
  hearts?: React.Ref<View>;
  hint?: React.Ref<View>;
}

interface Props {
  /** In half-heart units, see MAX_MISTAKES. */
  mistakes: number;
  progressFraction: number;
  hintUrl?: string | null;
  hintAyahAr?: string | null;
  hintAyahTranslation?: string | null;
  onExit: () => void;
  /** Refs so the guided tour can measure what it spotlights. */
  targets?: LessonHeaderTargets;
  /** Tour-only: which element of this header glows. */
  glowTarget?: 'hint' | 'hearts' | 'progress' | null;
  /** Special (merged/review) levels: hearts aren't shown at all. */
  hideHearts?: boolean;
}

// The ✕ / progress bar / chest / hearts / hint strip above every exercise.
// Shared by the real lesson and the guided tour so the two can't drift apart.
export default function LessonHeader({
  mistakes, progressFraction, hintUrl, hintAyahAr, hintAyahTranslation,
  onExit, targets, glowTarget, hideHearts,
}: Props) {
  const heartsLeftHalf = MAX_MISTAKES - mistakes;

  return (
    <View style={S.header}>
      <TouchableOpacity
        style={S.exitBtn}
        onPress={onExit}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel="Exit lesson"
      >
        <Text style={S.exitText}>✕</Text>
      </TouchableOpacity>

      {/* Wrapper exists so the tour has something to measure; needs its own
          row direction so the bar's flex:1 stays horizontal. */}
      <View
        ref={targets?.progress}
        collapsable={false}
        style={[S.progressSlot, glowTarget === 'progress' && TOUR_GLOW_ROUND_THIN]}
      >
        <LessonProgressBar fraction={progressFraction} />
      </View>

      {/* Fixed "finish line" marker joined onto the end of the bar.
          Decorative only, unlike the tappable reward chests on
          Search/Progress. */}
      <View style={S.chestBadge}>
        <Image source={require('../../../assets/images/chest.png')} style={S.chestImage} resizeMode="contain" />
      </View>

      {!hideHearts && (
        <View
          ref={targets?.hearts}
          collapsable={false}
          style={[S.heartsRow, glowTarget === 'hearts' && TOUR_GLOW_ROUND]}
        >
          {Array.from({ length: MAX_HEARTS }).map((_, i) => {
            const left = heartsLeftHalf - i * 2;
            const src = left >= 2 ? HEART_FULL : left === 1 ? HEART_HALF : HEART_EMPTY;
            return <Image key={i} source={src} style={S.heart} resizeMode="contain" />;
          })}
        </View>
      )}

      {/* With hearts showing the row is full, so Hint floats below-right over
          the card; with hearts hidden it fits inline. Matches both mocks. */}
      <View
        ref={targets?.hint}
        collapsable={false}
        style={[!hideHearts && S.hintFloating, glowTarget === 'hint' && TOUR_GLOW_ROUND]}
      >
        <HintButton url={hintUrl} ayahAr={hintAyahAr} ayahTranslation={hintAyahTranslation} />
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  exitBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F7FA', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  exitText: { fontSize: 14, color: colors.mutedText },
  progressSlot: { flex: 1, flexDirection: 'row' },
  // The negative margin cancels the row gap (8) and the bar's own right
  // margin (10), plus 6px of overlap, so the bar's end tucks under the
  // chest. Only the flex:1 bar grows to fill it: the chest and hearts stay
  // exactly where they were.
  chestBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FEFCF8', alignItems: 'center', justifyContent: 'center', marginLeft: -24 },
  chestImage: { width: 22, height: 18 },
  heartsRow: { flexDirection: 'row', gap: 3 },
  heart: { width: 20, height: 20 },
  hintFloating: { position: 'absolute', top: 50, right: 14 },
});

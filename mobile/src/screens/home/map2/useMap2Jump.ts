import { useCallback, useEffect, useRef, type MutableRefObject, type RefObject } from 'react';
import type { FlatList } from 'react-native';
import { SURAH_TO_SEASON } from '../map/mapModel';
import { SLOT_OF, type Map2Layout } from './map2Model';

interface Args {
  listRef: RefObject<FlatList<number> | null>;
  layout: Map2Layout;
  height: number;
  activeSlot: number | null;
  activeId: string | null;
  loading: boolean;
  returnedFromLevelTick: number;
  fetchPhase: (phaseIdx: number, currentSurah: number | null) => Promise<void>;
  currentSurahNumRef: MutableRefObject<number | null>;
  // Set by the level-launch handlers before a fetch that can change which
  // node reads as active, so that change doesn't yank the view mid-tap.
  suppressFollowRef: MutableRefObject<boolean>;
  /** Where to land after a lesson ends, or null for the active level. */
  returnSlot: () => number | null;
}

// Moves the continuous map to the learner. No chapters, so this is only:
// land on the active level, follow it when it advances, and jump to a surah.
export function useMap2Jump({
  listRef, layout, height, activeSlot, activeId, loading, returnedFromLevelTick,
  fetchPhase, currentSurahNumRef, suppressFollowRef, returnSlot,
}: Args) {
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const scrollToSlot = useCallback((slot: number, animated: boolean) => {
    const offset = Math.max(0, layoutRef.current.cy[slot] - height / 2);
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset, animated }));
  }, [height, listRef]);

  // First landing is instant (behind the loading screen); later moves animate.
  const followedIdRef = useRef<string | null>(null);
  const landedRef = useRef(false);
  // A surah jump asked for before the first landing (map still loading).
  // The first landing goes there instead of to the learner's own level,
  // which would otherwise override it.
  const pendingJumpSlotRef = useRef<number | null>(null);
  useEffect(() => {
    if (loading || activeSlot == null || activeId == null) return;
    if (suppressFollowRef.current && landedRef.current) {
      suppressFollowRef.current = false;
      followedIdRef.current = activeId;
      return;
    }
    if (followedIdRef.current === activeId) return;
    followedIdRef.current = activeId;
    const pending = pendingJumpSlotRef.current;
    pendingJumpSlotRef.current = null;
    scrollToSlot(pending ?? activeSlot, landedRef.current);
    landedRef.current = true;
  }, [activeId, activeSlot, loading, scrollToSlot, suppressFollowRef]);

  // Every time a lesson ends, back to where the learner was playing: the
  // next unfinished level of that lesson's surah, else the active level.
  // Was always the active level, which for a jumped-to surah is back in the
  // main progression, so finishing its level dropped the view at the
  // bottom of the map (2026-10-22).
  const activeSlotRef = useRef(activeSlot);
  activeSlotRef.current = activeSlot;
  const returnSlotRef = useRef(returnSlot);
  returnSlotRef.current = returnSlot;
  useEffect(() => {
    if (returnedFromLevelTick === 0) return;
    const target = returnSlotRef.current() ?? activeSlotRef.current;
    if (target != null) scrollToSlot(target, true);
  }, [returnedFromLevelTick, scrollToSlot]);

  const jumpToActive = useCallback(() => {
    if (activeSlotRef.current != null) scrollToSlot(activeSlotRef.current, true);
  }, [scrollToSlot]);

  // A surah's opening level (or one specific level), e.g. after confirming
  // "Start {surah}?" on a locked node.
  const jumpToSurahStart = useCallback((surah: number, level?: { groupId: string; levelIdx: number }) => {
    void fetchPhase(SURAH_TO_SEASON[surah] ?? 0, currentSurahNumRef.current);
    const slot = SLOT_OF[`${surah}:${level?.levelIdx ?? 0}`];
    if (slot == null) return;
    if (!landedRef.current) { pendingJumpSlotRef.current = slot; return; }
    suppressFollowRef.current = true;
    scrollToSlot(slot, true);
  }, [currentSurahNumRef, fetchPhase, scrollToSlot, suppressFollowRef]);

  return { scrollToSlot, jumpToActive, jumpToSurahStart };
}

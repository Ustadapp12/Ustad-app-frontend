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
}

// Moves the continuous map to the learner. No chapters, so this is only:
// land on the active level, follow it when it advances, and jump to a surah.
export function useMap2Jump({
  listRef, layout, height, activeSlot, activeId, loading, returnedFromLevelTick,
  fetchPhase, currentSurahNumRef, suppressFollowRef,
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
  useEffect(() => {
    if (loading || activeSlot == null || activeId == null) return;
    if (suppressFollowRef.current && landedRef.current) {
      suppressFollowRef.current = false;
      followedIdRef.current = activeId;
      return;
    }
    if (followedIdRef.current === activeId) return;
    followedIdRef.current = activeId;
    scrollToSlot(activeSlot, landedRef.current);
    landedRef.current = true;
  }, [activeId, activeSlot, loading, scrollToSlot, suppressFollowRef]);

  // Every time a lesson ends, back to the active level.
  const activeSlotRef = useRef(activeSlot);
  activeSlotRef.current = activeSlot;
  useEffect(() => {
    if (returnedFromLevelTick === 0 || activeSlotRef.current == null) return;
    scrollToSlot(activeSlotRef.current, true);
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
    suppressFollowRef.current = true;
    scrollToSlot(slot, true);
  }, [currentSurahNumRef, fetchPhase, scrollToSlot, suppressFollowRef]);

  return { scrollToSlot, jumpToActive, jumpToSurahStart };
}

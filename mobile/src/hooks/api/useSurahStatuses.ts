import { useCallback, useEffect, useState } from 'react';
import { learningApi } from '../../api';
import { ALL_SURAHS } from '../../data/allSurahs';
import type { LevelStatus } from '../../types/api';

/**
 * What the user sees per row.
 *
 *   done     every level of the surah is complete
 *   open     the first level is complete, so the surah is genuinely underway
 *   closed   the first level is not complete
 *   unknown  we could not load the status
 *
 * "open" deliberately means "first level DONE", not "first level reachable".
 * The backend never locks a surah's first level (see
 * learning/service.py's get_first_levels_for_surahs: "A surah's first group
 * has no cross-surah gate — never locked"), so every surah is technically
 * startable and an availability-based badge would mark all 114 open and tell
 * the user nothing. Keying off completion is what makes the list answer the
 * question actually being asked: which surahs am I already working on?
 *
 * `unknown` is a first-class state and is never rendered as "closed".
 * statusBySurah starts empty and the fetch can fail, so treating absence as
 * closed would label all 114 surahs closed on any network hiccup — telling a
 * user their finished work is gone, which is the one thing this screen must
 * never do.
 */
export type SurahState = 'done' | 'open' | 'closed' | 'unknown';

/** Every surah's open/closed/done state and real progress fraction, for the
 * Search Surah list. Moved out of SearchSurahsScreen (2026-10-22) so the
 * screen never calls the API itself; logic unchanged. */
export function useSurahStatuses() {
  // First-level status for all 114 in one batched call. This alone decides
  // open vs closed, because open means "first level complete".
  const [statusBySurah, setStatusBySurah] = useState<Record<number, LevelStatus>>({});
  // Surahs confirmed fully complete, and the real completed/total fraction for
  // the progress bar. Needs a second pass: firstLevels returns only the FIRST
  // level, so it cannot distinguish "started" from "finished" or say how far
  // in, and there is no per-surah completion endpoint. Resolved lazily and
  // only for surahs whose first level is already complete, which is bounded
  // by how many surahs the user has actually started (small) rather than 114.
  // Never estimated or interpolated — a surah with no entry here simply shows
  // no progress bar, because there is no real number to show one with.
  const [doneSurahs, setDoneSurahs] = useState<Set<number>>(new Set());
  const [progressBySurah, setProgressBySurah] = useState<Record<number, number>>({});
  // 'loading' until the batched call settles. Drives the retry affordance and
  // keeps rows unlabelled rather than wrongly "closed" while in flight.
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadState('loading');

    (async () => {
      let levels;
      try {
        levels = await learningApi.firstLevels(ALL_SURAHS.map(s => s.surah_number));
      } catch (e) {
        if (cancelled) return;
        // Used to be a bare console.warn, which left every row silently
        // uncoloured and indistinguishable from a real state. Surfaced now,
        // with a retry, because a cold backend start is a normal event here.
        console.warn('[SearchSurahsScreen] first-levels fetch failed:', e);
        setLoadState('failed');
        return;
      }
      if (cancelled) return;

      const map: Record<number, LevelStatus> = {};
      for (const lvl of levels) map[lvl.surah_number] = lvl.status;
      setStatusBySurah(map);
      setLoadState('ready');

      // Second pass, for the "done" refinement and the real progress fraction.
      // Sequential rather than parallel: these are extra round-trips against
      // a cold-start-prone backend and the bar they feed is cosmetic, so they
      // must never stampede it. A failure just leaves the surah showing no
      // progress bar, which is less specific but never claims completion or
      // a percentage it cannot prove.
      const started = Object.entries(map)
        .filter(([, st]) => st === 'completed')
        .map(([n]) => Number(n));

      for (const surahNumber of started) {
        if (cancelled) return;
        try {
          const all = await learningApi.levels(surahNumber);
          if (cancelled) return;
          if (all.length > 0) {
            const completedCount = all.filter(l => l.status === 'completed').length;
            setProgressBySurah(prev => ({ ...prev, [surahNumber]: completedCount / all.length }));
            if (completedCount === all.length) {
              setDoneSurahs(prev => new Set(prev).add(surahNumber));
            }
          }
        } catch {
          // Best-effort by design — see above.
        }
      }
    })();

    return () => { cancelled = true; };
  }, [reloadKey]);

  // The single place a row's badge is decided, so the list and the confirm
  // dialog can never disagree about what state a surah is in.
  const stateFor = useCallback((surahNumber: number): SurahState => {
    if (doneSurahs.has(surahNumber)) return 'done';
    const status = statusBySurah[surahNumber];
    if (status === undefined) return loadState === 'ready' ? 'closed' : 'unknown';
    // Anything short of a completed first level is closed: 'available' means
    // merely reachable, which is true of every surah and so says nothing.
    return status === 'completed' ? 'open' : 'closed';
  }, [doneSurahs, statusBySurah, loadState]);

  const reload = useCallback(() => setReloadKey(k => k + 1), []);
  return { stateFor, progressBySurah, loadState, reload };
}

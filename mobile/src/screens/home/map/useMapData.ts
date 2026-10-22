import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { learningApi } from '../../../api';
import { captureError } from '../../../services/crashReporter';
import { getCachedRecommended, getLastRecommended, setCachedRecommended, getCachedLevels, getCachedFirstLevel } from '../../../services/bootCache';
import { AnalyticsEvents, logAnalyticsEvent } from '../../../services/analytics';
import { useLessonStore } from '../../../store/lessonStore';
import type { LearningMe, SurahLevel } from '../../../types/api';
import { SECTIONS_DEF, PHASE_GROUPS, SURAH_TO_CHAPTER, CHAPTER_SEASON_INDICES } from './mapModel';

// Sort by the real sort_order field, not start_ayah — review levels are
// now interleaved one after every 2 normal levels (see buildLevels below)
// and each review's own ayah range overlaps the normal levels it covers,
// so start_ayah no longer reflects true display order (a review covering
// groups 1-2 and group 2 itself can share the same start_ayah). Nodes are
// indexed by array position after this (see enrichedSections below), so
// getting this order right is load-bearing, not cosmetic.
//
// Falls back to end_ayah when sort_order is missing — confirmed live
// against the testing environment that this happens: its /levels
// response already carries the new interleaved is_special content
// (correct overlapping ranges, e.g. a review at start=1/end=4 alongside
// groups 1-2 and 3-4) but every item's sort_order came back undefined,
// so `a.sort_order - b.sort_order` is NaN for every pair and Array.sort
// silently leaves the API's raw (non-interleaved: normals then reviews)
// order in place. end_ayah works as a substitute because a review's own
// end_ayah always equals the last normal group it covers (same overlap
// property that broke start_ayah-sorting in the first place) — sorting
// ascending by it and breaking ties by putting is_special after normal
// reconstructs "review right after the pair/group it covers" without
// needing sort_order at all. Once every environment actually serves
// sort_order this fallback stops mattering (the first branch always
// wins), so it's safe to leave in rather than ripping out later.
export function sortedLevels(levels: SurahLevel[]): SurahLevel[] {
  return levels.slice().sort((a, b) => {
    if (a.sort_order != null && b.sort_order != null) return a.sort_order - b.sort_order;
    if (a.end_ayah !== b.end_ayah) return a.end_ayah - b.end_ayah;
    return (a.is_special ? 1 : 0) - (b.is_special ? 1 : 0);
  });
}

// The map's level data: which surahs' levels are loaded (full detail for the
// current surah, first level for the rest), how they are fetched, and when
// they refresh (first open, pull-to-refresh, app back from background,
// returning from a lesson). Moved verbatim out of MapScreen; the effects run
// exactly as they did there.
export function useMapData(learning: LearningMe | null) {
  // fullLevels: every group of a surah (only fetched for the current surah).
  // firstLevel: just the first group's status (fetched for every other surah,
  // one phase at a time, batched). Nodes with neither yet render 'pending'
  // (see enrichedSections below) but stay tappable — see handleNodePress.
  const [fullLevels, setFullLevels]   = useState<Record<number, SurahLevel[]>>({});
  const [firstLevel, setFirstLevel]   = useState<Record<number, SurahLevel>>({});
  const [loadingPaths, setLoading]    = useState(true);
  const [fetchingSurah, setFetchingSurah] = useState<number | null>(null);
  const fetchedPhasesRef = useRef<Set<number>>(new Set());

  // Latest resolved "current surah" — read (not reactive) by the chapter and
  // search-jump prefetches, set by both the mount effect and the focus effect.
  const currentSurahNumRef = useRef<number | null>(null);
  // `refreshing` is ONLY a refresh the user pulled for; it drives the native
  // RefreshControl. Automatic reloads (app back from background) set
  // `silentRefreshing` instead. Driving RefreshControl from code makes iOS
  // pull the map down ~60pt as if swiped; when that happened while a level
  // was open on top, iOS often didn't scroll it back after the refresh, so
  // the map came back stuck pulled down with the Lumo pull indicator above
  // the mountain until the user scrolled (reported 2026-10-13).
  const [refreshing, setRefreshing] = useState(false);
  const [silentRefreshing, setSilentRefreshing] = useState(false);


  const mergeFirstLevels = (levels: SurahLevel[]) => {
    if (levels.length === 0) return;
    setFirstLevel(prev => {
      const next = { ...prev };
      for (const lvl of levels) next[lvl.surah_number] = lvl;
      return next;
    });
  };

  // Batched fetch for one phase's surahs (skips the current surah, which
  // gets full detail instead, and anything already cached from boot).
  // Runs for every surah, with no readiness filter: the first-levels endpoint
  // reads lesson groups directly and has no content gate of its own, and
  // groups exist for the whole Quran — so this returns real status for any
  // surah, including ones that can't be started yet. Filtering by a readiness
  // list here would only replace real data with placeholders.
  const fetchPhase = async (phaseIdx: number, currentSurah: number | null) => {
    if (fetchedPhasesRef.current.has(phaseIdx)) return;
    fetchedPhasesRef.current.add(phaseIdx);
    const surahs = PHASE_GROUPS[phaseIdx] ?? [];
    const targets = surahs.filter(n => n !== currentSurah);
    if (targets.length === 0) return;
    const fromCache = targets.filter(n => getCachedFirstLevel(n));
    if (fromCache.length) {
      mergeFirstLevels(fromCache.map(n => getCachedFirstLevel(n)!).filter(Boolean));
    }
    const uncached = targets.filter(n => !getCachedFirstLevel(n));
    if (uncached.length === 0) return;
    try {
      mergeFirstLevels(await learningApi.firstLevels(uncached));
    } catch (e) {
      console.warn(`[MapScreen] phase ${phaseIdx} fetch failed:`, e);
      fetchedPhasesRef.current.delete(phaseIdx); // allow a later on-demand retry
    }
  };

  // Pull-to-refresh: per bootCache's own contract ("pull-to-refresh always
  // bypasses the cache"), hit the network directly for the recommendation
  // and every surah whose phase has already loaded, instead of reading
  // getCachedRecommended()/getCachedLevels().
  const runRefresh = useCallback(async (silent: boolean) => {
    const setBusy = silent ? setSilentRefreshing : setRefreshing;
    setBusy(true);
    try {
      // undefined = the request failed (e.g. offline): keep what we had
      // instead of overwriting it with null, which used to wipe the current
      // node off the map (2026-10-22). A real null answer is still stored.
      const fetched = await learningApi.recommendedNext().catch(() => undefined);
      if (fetched !== undefined) setCachedRecommended(fetched);
      const recommended = fetched === undefined ? getLastRecommended() : fetched;
      const currentSurah = recommended?.surah_number
        ?? (learning?.mvp_surah_numbers?.[0] ?? SECTIONS_DEF[0]?.surahNum ?? null);
      currentSurahNumRef.current = currentSurah;

      const tasks: Promise<void>[] = [];
      if (currentSurah != null) {
        tasks.push(
          learningApi.levels(currentSurah)
            .then(levels => setFullLevels(prev => ({ ...prev, [currentSurah]: sortedLevels(levels) })))
            .catch(e => console.warn('[MapScreen] refresh current-surah levels failed:', e)),
        );
      }
      const otherSurahs = Array.from(fetchedPhasesRef.current)
        .flatMap(i => PHASE_GROUPS[i] ?? [])
        .filter(n => n !== currentSurah);
      if (otherSurahs.length) {
        tasks.push(
          learningApi.firstLevels(otherSurahs)
            .then(levels => mergeFirstLevels(levels))
            .catch(e => console.warn('[MapScreen] refresh firstLevels failed:', e)),
        );
      }
      await Promise.all(tasks);
    } finally {
      setBusy(false);
    }
  }, [learning]);
  // RefreshControl's onRefresh: the user pulled.
  const handleRefresh = useCallback(() => runRefresh(false), [runRefresh]);

  // MapScreen only mounts once for the app's lifetime (see the comments on
  // lastVisitedSurah/the focus-effect above), so the initial-load effect
  // below never runs again after the very first open. The ONLY other refresh
  // path was the focus-effect a few lines up, gated on lastVisitedSurah —
  // which is set exclusively by completeSession/abandonSession. Reopening
  // the app from the background WITHOUT having just finished or left a
  // lesson (e.g. just switching away and back, or a real cold start where
  // this component instance survives) hit neither path: fullLevels,
  // getCachedRecommended(), and unlockedSeasons kept showing whatever was
  // already in memory, however old, with nothing to re-validate it against
  // the backend — reported 2026-09-01 as "Continue here" landing next to a
  // node that still rendered locked, self-correcting only on a manual
  // pull-to-refresh. Re-running the same handleRefresh() pull-to-refresh
  // uses (recommendedNext + current-surah levels + every already-loaded
  // surah, all from the network, none from cache) on every real
  // background-to-foreground transition closes that gap. It runs silently
  // (overlay + loading bar only, never the native RefreshControl), see
  // `silentRefreshing` above for why.
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (next === 'active' && prev.match(/inactive|background/)) {
        void runRefresh(true);
      }
    });
    return () => sub.remove();
  }, [runRefresh]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const recommended = getCachedRecommended();
      const currentSurah = recommended?.surah_number
        ?? (learning?.mvp_surah_numbers?.[0] ?? SECTIONS_DEF[0]?.surahNum ?? null);
      currentSurahNumRef.current = currentSurah;

      // 1. Current surah (full detail) and 2. rest of phase 1 (batched,
      // lightweight) are independent network calls — run them in parallel
      // so the loading overlay is up for max(call1, call2), not the sum of
      // both (they used to run as two sequential awaits back-to-back).
      const currentSurahFetch = (async () => {
        if (currentSurah == null) return;
        const cached = getCachedLevels(currentSurah);
        if (cached) {
          if (!cancelled) setFullLevels(prev => ({ ...prev, [currentSurah]: sortedLevels(cached) }));
          return;
        }
        try {
          const levels = await learningApi.levels(currentSurah);
          if (!cancelled) setFullLevels(prev => ({ ...prev, [currentSurah]: sortedLevels(levels) }));
        } catch (e) { console.warn('[MapScreen] current-surah levels fetch failed:', e); }
      })();

      // The chapter the user actually opens into (same lookup the chapterIdx
      // state seed uses) may not be chapter 0 — a returning user with real
      // progress can land straight into chapter 2. Phase 0 is only "season
      // 0", which that user never sees, so prioritizing it unconditionally
      // used to leave the chapter actually on screen showing placeholder
      // ('pending') nodes until the staggered loop below happened to reach
      // it several seconds later. Fetch the visible chapter's own
      // (unlocked) seasons up front instead — season 0 stays included
      // whenever it's part of that chapter, since chapter 0 is still the
      // overwhelmingly common case.
      const startSurah = currentSurah ?? SECTIONS_DEF[0]?.surahNum;
      const startChapterIdx = startSurah != null ? (SURAH_TO_CHAPTER[startSurah] ?? 0) : 0;
      const prioritySeasons = CHAPTER_SEASON_INDICES[startChapterIdx] ?? [0];

      const startTime = Date.now();
      await Promise.all([
        currentSurahFetch,
        ...prioritySeasons.map(i => fetchPhase(i, currentSurah)),
      ]);
      const measureDuration = Date.now() - startTime;
      if (cancelled) return;
      console.log(`[Map] Initial nodes loaded in ${measureDuration}ms`);
      setLoading(false);

      // 3. The chapters immediately either side — staggered in the background
      // so they don't compete with the initial paint, but already warm by the
      // time someone pages one chapter over with the arrows.
      //
      // This deliberately does NOT walk every season any more. It used to, and
      // that was affordable when the whole curriculum was 21 surahs / 7
      // seasons; across the full Quran it's ~38x that, which would mean tens
      // of seconds of trickling background fetches for chapters the user isn't
      // looking at and may never open. Anything further away is fetched when
      // it's actually reached — goToChapter fetches the chapter it pages into,
      // the search jump fetches what it lands on, and any single node can
      // always resolve itself on tap regardless.
      const neighbourSeasons = [
        ...(CHAPTER_SEASON_INDICES[startChapterIdx + 1] ?? []),
        ...(CHAPTER_SEASON_INDICES[startChapterIdx - 1] ?? []),
      ].filter(i => !prioritySeasons.includes(i));
      for (const seasonIdx of new Set(neighbourSeasons)) {
        if (cancelled) return;
        await new Promise(res => setTimeout(res, 700));
        if (cancelled) return;
        await fetchPhase(seasonIdx, currentSurah);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Re-fetch the current surah's levels when the map regains focus after a
  // genuine lesson completion (skip the very first focus — the mount effect
  // above already covers it). MapScreen sits underneath
  // LessonStart/LessonSession/LessonComplete in the same native stack, so it
  // never remounts between lessons; without this, finishing a lesson
  // invalidates the shared bootCache (see lessonStore.completeSession) but
  // this screen's own `fullLevels` state — already populated before the
  // lesson — never gets told to reload, so the map kept showing
  // pre-completion statuses indefinitely.
  //
  // Gated on lastVisitedSurah, not on plain focus: only a real lesson
  // session (completed OR abandoned) sets it, so the map still doesn't
  // re-fetch on every trivial focus change (switching tabs and back, for
  // instance) — that's what made the map look like it "reloads" every time
  // you came back to it even when nothing had changed, which was the whole
  // reason this used to gate on completion alone.
  //
  // completion-only gating (2026-08-xx) was too narrow, though:
  // abandonSession never invalidated anything, so leaving a level any way
  // other than finishing it (backing out, losing connection, the app dying
  // mid-session) left the map showing pre-session data with nothing to tell
  // it otherwise — reported as "the map looked stale after exiting a level".
  // lastVisitedSurah is set by BOTH completeSession and abandonSession (see
  // lessonStore.ts), so this now runs on either.
  const isFirstFocusRef = useRef(true);
  // Bumped once this effect's refresh has actually landed, so a SEPARATE
  // effect (see jumpToRecommended's own useEffect below) can re-scroll the
  // viewport to the recommended node on every return from a level, not just
  // when the recommended node itself happens to change. The existing scroll-
  // follow effect only re-scrolls on an id CHANGE (autoScrolledNodeIdRef
  // dedup) — exiting a level without advancing (abandon, or a level that
  // wasn't the last one) leaves firstActiveNode.id identical to before, so
  // that effect silently does nothing and the viewport stays wherever it
  // was left, which could be nowhere near "Continue here" (2026-08-28,
  // user: "when I come back from a level the thing I should see is where
  // the continue here button is"). A plain counter, not a boolean: two
  // returns in a row must both trigger a re-scroll even if nothing else
  // about the state changed between them.
  const [returnedFromLevelTick, setReturnedFromLevelTick] = useState(0);
  // The surah the lesson that just ended belonged to, set alongside each
  // tick. Map2 lands back on it instead of the recommended level, which for
  // a jumped-to surah sits back in the learner's main progression (2026-10-22).
  const returnedFromSurahRef = useRef<number | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocusRef.current) { isFirstFocusRef.current = false; return; }
      const leftSurah = useLessonStore.getState().lastVisitedSurah;
      if (leftSurah == null) return;
      let cancelled = false;
      (async () => {
        let currentSurah = getCachedRecommended()?.surah_number ?? null;
        if (currentSurah == null) {
          try {
            const recommended = await learningApi.recommendedNext();
            // invalidateLevels() (called on lesson completion) nulls the
            // shared bootCache recommendation and nothing else ever refills
            // it for the rest of the app session — write the fresh value
            // back so getCachedRecommended() (and Lumo's placement below)
            // stops reading null until the next full app relaunch.
            setCachedRecommended(recommended ?? null);
            currentSurah = recommended?.surah_number ?? null;
          } catch { /* fall back to mvp default below */ }
        }
        currentSurah = currentSurah ?? (learning?.mvp_surah_numbers?.[0] ?? SECTIONS_DEF[0]?.surahNum ?? null);
        if (currentSurah == null || cancelled) return;
        currentSurahNumRef.current = currentSurah;
        try {
          const levels = await learningApi.levels(currentSurah);
          if (!cancelled) setFullLevels(prev => ({ ...prev, [currentSurah]: sortedLevels(levels) }));
        } catch (e) { console.warn('[MapScreen] focus refresh failed:', e); }

        // The surah the user just left a lesson session in (completed OR
        // abandoned) may no longer be `currentSurah` above — finishing a
        // surah's last level advances the "recommended next" pointer to the
        // next surah, so without this, whichever surah the user was actually
        // just looking at never gets refreshed: its last node stays stuck
        // non-golden, or (the abandon case) it keeps showing whatever was
        // cached before the session started at all.
        const visitedSurah = useLessonStore.getState().lastVisitedSurah;
        if (visitedSurah != null && visitedSurah !== currentSurah && !cancelled) {
          try {
            const visitedLevels = await learningApi.levels(visitedSurah);
            if (!cancelled) setFullLevels(prev => ({ ...prev, [visitedSurah]: sortedLevels(visitedLevels) }));
            // Re-derives "was this surah actually finished" from the fresh
            // fetch rather than trusting why the refresh was triggered —
            // safe to run this check after an abandon too: an abandoned
            // session's group only reads 'completed' here if it genuinely
            // was (e.g. abandoning a Retry replay of an already-done level),
            // never merely because a session existed and was exited.
            if (!cancelled && visitedLevels.length > 0 && visitedLevels.every(l => l.status === 'completed')) {
              void logAnalyticsEvent(AnalyticsEvents.SURAH_COMPLETE, { surah_number: visitedSurah });
            }
            useLessonStore.getState().clearLastCompletedSurah();
            useLessonStore.getState().clearLastVisitedSurah();
          } catch (e) {
            console.warn('[MapScreen] visited-surah refresh failed:', e);
            // Clear even on failure. Leaving lastVisitedSurah set here meant a
            // single failed refetch (one network blip right after a lesson)
            // left this flag stuck indefinitely -- every later focus regain
            // (switching tabs and back, opening/closing Streak/XP/Feedback,
            // backgrounding and returning) re-entered this whole block and
            // ended in the unconditional setReturnedFromLevelTick below, which
            // jumps the viewport straight to the recommended node with no
            // suppression check (unlike the other follow-effect). Reported as
            // "pressing any other level or button snaps the map back to
            // recommended, and I have to scroll back" -- this is what made it
            // keep happening on unrelated taps well after the lesson had
            // ended, instead of just once.
            useLessonStore.getState().clearLastCompletedSurah();
            useLessonStore.getState().clearLastVisitedSurah();
          }
        } else if (visitedSurah != null) {
          useLessonStore.getState().clearLastCompletedSurah();
          useLessonStore.getState().clearLastVisitedSurah();
        }
        if (!cancelled) {
          returnedFromSurahRef.current = leftSurah;
          setReturnedFromLevelTick(t => t + 1);
        }
      })();
      return () => { cancelled = true; };
    }, [learning]),
  );

  // On-demand fallback: fetch a single surah's first level the moment its
  // node is tapped, in case the background phase fetch hasn't landed yet.
  async function fetchFirstLevelNow(surahNumber: number): Promise<SurahLevel | null> {
    const cached = getCachedFirstLevel(surahNumber);
    if (cached) { mergeFirstLevels([cached]); return cached; }
    setFetchingSurah(surahNumber);
    try {
      const [lvl] = await learningApi.firstLevels([surahNumber]);
      if (lvl) mergeFirstLevels([lvl]);
      else {
        // Reported repeatedly as "couldn't open X" specifically via search —
        // this is the only place that error can come from for a
        // surahLevelIdx-0 tap, and until now it swallowed the actual reason
        // (exception vs a genuinely empty array back from the backend).
        // Logged as non-fatal so the next repro shows which one it actually
        // is instead of guessing further.
        captureError(`fetchFirstLevelNow: empty response for surah ${surahNumber}`, { surahNumber, path: 'empty_response' });
      }
      return lvl ?? null;
    } catch (e) {
      console.warn('[MapScreen] on-demand first-level fetch failed:', e);
      captureError(e instanceof Error ? e : new Error(String(e)), { surahNumber, path: 'exception' });
      return null;
    } finally {
      setFetchingSurah(null);
    }
  }

  return {
    fullLevels, setFullLevels, firstLevel, loadingPaths, fetchingSurah, refreshing,
    // Either kind of refresh in flight: drives the loading bar and overlay.
    reloading: refreshing || silentRefreshing,
    handleRefresh, fetchPhase, fetchFirstLevelNow,
    currentSurahNumRef, fetchedPhasesRef, returnedFromLevelTick, returnedFromSurahRef,
  };
}

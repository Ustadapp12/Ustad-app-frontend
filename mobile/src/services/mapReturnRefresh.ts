import { learningApi } from '../api';
import { getCachedRecommended, setCachedRecommended } from './bootCache';
import type { SurahLevel } from '../types/api';

/**
 * The fresh map data needed right after a lesson ends: which surah is
 * recommended next, plus the levels of that surah and of the surah the
 * lesson belonged to. `levels[n]` is null when that fetch failed and
 * missing when it wasn't needed.
 */
export interface MapReturnData {
  recommendedSurah: number | null;
  levels: Record<number, SurahLevel[] | null>;
}

let pending: { surah: number; promise: Promise<MapReturnData> } | null = null;

// The "recommended next" call and the left surah's levels go out together
// (the next level is almost always in the same surah, so that's usually the
// whole job in one round trip). Only when the recommendation moved to a new
// surah is a second levels call needed. Used to be up to three calls one
// after the other, each waiting on the last (2026-10-25).
async function load(leftSurah: number): Promise<MapReturnData> {
  const cached = getCachedRecommended();
  const recommendedP = cached
    ? Promise.resolve(cached.surah_number ?? null)
    : learningApi.recommendedNext()
      .then(r => {
        // invalidateLevels() (on lesson completion) nulls the shared
        // recommendation and nothing else refills it this app session.
        setCachedRecommended(r ?? null);
        return r?.surah_number ?? null;
      })
      .catch(() => null);
  const leftP = learningApi.levels(leftSurah).catch(e => {
    console.warn('[MapReturnRefresh] left-surah levels fetch failed:', e);
    return null;
  });

  const [recommendedSurah, leftLevels] = await Promise.all([recommendedP, leftP]);
  const levels: Record<number, SurahLevel[] | null> = { [leftSurah]: leftLevels };
  if (recommendedSurah != null && recommendedSurah !== leftSurah) {
    levels[recommendedSurah] = await learningApi.levels(recommendedSurah).catch(e => {
      console.warn('[MapReturnRefresh] recommended-surah levels fetch failed:', e);
      return null;
    });
  }
  return { recommendedSurah, levels };
}

/** Start loading while the user is still on Lesson Complete, so the map has
 * the new level and Lumo's spot ready the moment they tap Continue. Call only
 * after the completion is saved server-side. */
export function prefetchMapReturn(leftSurah: number): void {
  pending = { surah: leftSurah, promise: load(leftSurah) };
}

/** The map's focus refresh: reuse the prefetch for this surah if one is
 * running or done, otherwise load now. Each prefetch is used once. */
export function takeMapReturn(leftSurah: number): Promise<MapReturnData> {
  if (pending?.surah === leftSurah) {
    const { promise } = pending;
    pending = null;
    return promise;
  }
  pending = null;
  return load(leftSurah);
}

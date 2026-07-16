/**
 * Boot-time prefetch cache.
 *
 * After the user authenticates, prefetchAll() fires every expensive API call
 * in parallel. Each result is stored in memory with a 5-minute TTL so screens
 * can render instantly without their own network round-trips.
 *
 * Screens check the cache first. On cache miss (first ever launch, or cache
 * expired) they fall back to their own fetch. Pull-to-refresh always bypasses
 * the cache.
 */

import { authApi, learningApi } from '../api';
import { setCachedLevelsToDisk, invalidateLevelsFromDisk } from './contentCache';
import { groupIntoPhases } from '../utils/mapPhases';
import type {
  ExerciseOut,
  LearningStats,
  RecommendedNext,
  SurahLevel,
  UserProfile,
} from '../types/api';

const TTL_MS = 5 * 60 * 1000; // 5 minutes

type Stamped<T> = { data: T; at: number };

// ── In-memory stores ──────────────────────────────────────────────

let _recommended: Stamped<RecommendedNext | null> | null = null;
let _stats: Stamped<LearningStats> | null = null;
let _profile: Stamped<UserProfile> | null = null;
const _levels = new Map<number, Stamped<SurahLevel[]>>();
// Lightweight first-group-only status, for surahs we haven't full-fetched yet
const _firstLevels = new Map<number, Stamped<SurahLevel>>();
// Set of surah numbers that have at least one weak exercise due
let _weakSurahs: Stamped<Set<number>> | null = null;

// In-flight dedup so two callers racing for the same surah's data (e.g.
// prefetchAll() during hydrate and MapScreen's own mount effect) share one
// network request instead of firing a duplicate.
const _levelsInFlight = new Map<number, Promise<SurahLevel[]>>();
const _firstLevelInFlight = new Map<number, Promise<void>>();

// ── Helpers ───────────────────────────────────────────────────────

function alive<T>(e: Stamped<T> | null | undefined): e is Stamped<T> {
  return !!e && Date.now() - e.at < TTL_MS;
}

function stamp<T>(data: T): Stamped<T> {
  return { data, at: Date.now() };
}

// ── Public getters ────────────────────────────────────────────────

export function getCachedRecommended(): RecommendedNext | null {
  return alive(_recommended) ? _recommended.data : null;
}

export function getCachedStats(): LearningStats | null {
  return alive(_stats) ? _stats.data : null;
}

export function getCachedProfile(): UserProfile | null {
  return alive(_profile) ? _profile.data : null;
}

export function getCachedLevels(surahNumber: number): SurahLevel[] | null {
  const e = _levels.get(surahNumber);
  return alive(e) ? e.data : null;
}

export function getCachedFirstLevel(surahNumber: number): SurahLevel | null {
  const e = _firstLevels.get(surahNumber);
  return alive(e) ? e.data : null;
}

/** Returns the set of surah numbers with at least one weak exercise due. */
export function getCachedWeakSurahs(): Set<number> | null {
  return alive(_weakSurahs) ? _weakSurahs.data : null;
}

/** True when every surah in the list has a live cache entry. */
export function allLevelsCached(surahNumbers: number[]): boolean {
  return surahNumbers.length > 0 && surahNumbers.every(n => alive(_levels.get(n)));
}

// ── Setters (exposed so screens can update cache after a save) ────

export function setCachedProfile(profile: UserProfile): void {
  _profile = stamp(profile);
}

/** Call after re-fetching recommendedNext() directly (bypassing prefetchAll)
 * so later reads of getCachedRecommended() — e.g. MapScreen's Lumo placement —
 * see the fresh value instead of staying null until the next app launch. */
export function setCachedRecommended(data: RecommendedNext | null): void {
  _recommended = stamp(data);
}

// ── Invalidation ──────────────────────────────────────────────────

/** Call after a lesson completes so HomeScreen re-fetches fresh levels. */
export function invalidateLevels(mvpSurahNumbers?: number[]): void {
  const surahNumbers = mvpSurahNumbers ?? Array.from(_levels.keys());
  _levels.clear();
  _firstLevels.clear();
  _recommended = null;
  // Also clear the disk cache so HomeScreen re-fetches from network
  void invalidateLevelsFromDisk(surahNumbers);
}

export function invalidateAll(): void {
  _recommended = null;
  _stats = null;
  _profile = null;
  _levels.clear();
  _firstLevels.clear();
  _weakSurahs = null;
}

// ── Prefetch ──────────────────────────────────────────────────────

/**
 * Fire the cheap, always-needed calls in parallel right after auth, then
 * load only the first "season" of the map: full level detail for whichever
 * surah the user is actually on, and one batched lightweight call for the
 * rest of that first phase. Later phases are NOT fetched here — MapScreen
 * calls prefetchPhase() for those on demand (proactively when their season
 * sign scrolls into view, or reactively the first time a node in them is
 * tapped). This replaces the old behavior of eagerly full-fetching every
 * MVP surah on every login.
 *
 * Do NOT await this at the call site — let it populate the cache in the
 * background while the user navigates to the first screen.
 */
export async function prefetchAll(mvpSurahNumbers: number[]): Promise<void> {
  const [recommendedResult] = await Promise.allSettled([
    learningApi.recommendedNext()
      .then(d => { _recommended = stamp(d); return d; }),

    // TODO: stats() currently unused on frontend — re-enable if needed for profile/dashboard
    // learningApi.stats()
    //   .then(d => { _stats = stamp(d); }),

    authApi.me()
      .then(res => { _profile = stamp(res.profile); }),

    // Fetch weak exercises and derive a set of surah numbers for badge display
    learningApi.weakExercises(50)
      .then((exercises: ExerciseOut[]) => {
        const surahSet = new Set(exercises.map(e => e.surah_no));
        _weakSurahs = stamp(surahSet);
      }),
  ]);

  const recommended = recommendedResult.status === 'fulfilled' ? recommendedResult.value : null;
  const currentSurah = recommended?.surah_number ?? mvpSurahNumbers[0] ?? null;

  const [firstPhase] = groupIntoPhases(mvpSurahNumbers);
  const restOfFirstPhase = (firstPhase ?? []).filter(n => n !== currentSurah);

  await Promise.allSettled([
    currentSurah != null ? fetchLevels(currentSurah) : Promise.resolve(),
    prefetchPhase(restOfFirstPhase),
  ]);
}

/**
 * Full level detail for one surah, cache-first with in-flight dedup — two
 * callers racing for the same surah (prefetchAll during hydrate, MapScreen's
 * own mount effect if it lands before that finishes) share one network
 * request instead of firing a duplicate.
 */
export async function fetchLevels(surahNumber: number): Promise<SurahLevel[]> {
  const cached = getCachedLevels(surahNumber);
  if (cached) return cached;
  let inFlight = _levelsInFlight.get(surahNumber);
  if (!inFlight) {
    inFlight = learningApi.levels(surahNumber)
      .then(d => {
        _levels.set(surahNumber, stamp(d));
        void setCachedLevelsToDisk(surahNumber, d);
        return d;
      })
      .finally(() => { _levelsInFlight.delete(surahNumber); });
    _levelsInFlight.set(surahNumber, inFlight);
  }
  return inFlight;
}

/**
 * Batched lightweight fetch of first-group status for a set of surahs —
 * used for a map phase that hasn't been full-loaded yet. Safe to call with
 * an empty array. Never throws — a failure just leaves those surahs
 * uncached, and MapScreen falls back to fetching on demand when tapped.
 *
 * In-flight dedup is per-surah-number: if some requested surahs are already
 * being fetched by another overlapping call (e.g. MapScreen's per-phase fetch
 * racing this same function called from hydrate), this awaits those shared
 * promises instead of re-requesting them.
 */
export async function prefetchPhase(surahNumbers: number[]): Promise<void> {
  const toFetch = surahNumbers.filter(n => !getCachedFirstLevel(n) && !_firstLevelInFlight.has(n));
  const waitOnly = surahNumbers.filter(n => _firstLevelInFlight.has(n));

  let ownPromise: Promise<void> | null = null;
  if (toFetch.length > 0) {
    ownPromise = (async () => {
      try {
        const levels = await learningApi.firstLevels(toFetch);
        const at = Date.now();
        for (const level of levels) {
          _firstLevels.set(level.surah_number, { data: level, at });
        }
      } catch {
        // Leave uncached — MapScreen fetches on demand if the user taps in first.
      } finally {
        for (const n of toFetch) _firstLevelInFlight.delete(n);
      }
    })();
    for (const n of toFetch) _firstLevelInFlight.set(n, ownPromise);
  }

  await Promise.allSettled([
    ownPromise,
    ...waitOnly.map(n => _firstLevelInFlight.get(n)),
  ]);
}


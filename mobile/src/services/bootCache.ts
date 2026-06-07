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
// Set of surah numbers that have at least one weak exercise due
let _weakSurahs: Stamped<Set<number>> | null = null;

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

// ── Invalidation ──────────────────────────────────────────────────

/** Call after a lesson completes so HomeScreen re-fetches fresh levels. */
export function invalidateLevels(mvpSurahNumbers?: number[]): void {
  const surahNumbers = mvpSurahNumbers ?? Array.from(_levels.keys());
  _levels.clear();
  _recommended = null;
  // Also clear the disk cache so HomeScreen re-fetches from network
  void invalidateLevelsFromDisk(surahNumbers);
}

export function invalidateAll(): void {
  _recommended = null;
  _stats = null;
  _profile = null;
  _levels.clear();
  _weakSurahs = null;
}

// ── Prefetch ──────────────────────────────────────────────────────

/**
 * Fire all expensive calls in parallel right after auth.
 * Uses Promise.allSettled so a single failure never blocks the rest.
 * Do NOT await this at the call site — let it populate the cache in the
 * background while the user navigates to the first screen.
 */
export async function prefetchAll(mvpSurahNumbers: number[]): Promise<void> {
  await Promise.allSettled([
    learningApi.recommendedNext()
      .then(d => { _recommended = stamp(d); }),

    learningApi.stats()
      .then(d => { _stats = stamp(d); }),

    authApi.me()
      .then(res => { _profile = stamp(res.profile); }),

    ...mvpSurahNumbers.map(n =>
      learningApi.levels(n)
        .then(d => {
          _levels.set(n, stamp(d));
          void setCachedLevelsToDisk(n, d);
        }),
    ),

    // Fetch weak exercises and derive a set of surah numbers for badge display
    learningApi.weakExercises(50)
      .then((exercises: ExerciseOut[]) => {
        const surahSet = new Set(exercises.map(e => e.surah_no));
        _weakSurahs = stamp(surahSet);
      }),
  ]);
}

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
import type {
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
export function invalidateLevels(): void {
  _levels.clear();
  _recommended = null;
}

export function invalidateAll(): void {
  _recommended = null;
  _stats = null;
  _profile = null;
  _levels.clear();
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
        .then(d => { _levels.set(n, stamp(d)); }),
    ),
  ]);
}

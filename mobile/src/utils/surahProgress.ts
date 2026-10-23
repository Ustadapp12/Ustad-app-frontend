import { learningApi } from '../api';
import { ALL_SURAHS, type SurahListing } from '../data/allSurahs';
import type { SurahLevel } from '../types/api';

// Must stay in step with MapScreen's buildLevelsWithReviews: one normal level
// per 2 ayahs, plus one review after every 2 normal levels and one after a
// trailing odd one. A mismatch against the backend's real count is treated as
// "unknown", never as a number.
export function expectedLevelCount(ayahCount: number): number {
  const normal = Math.ceil(ayahCount / 2);
  return normal + Math.ceil(normal / 2);
}

export type SurahProgressState = 'not_started' | 'in_progress' | 'completed' | 'unavailable';

export interface SurahProgress {
  surah: SurahListing;
  state: SurahProgressState;
  total: number;
  completed: number;
  /** Next level to play, for jumping the map straight to it. */
  nextGroupId: string | null;
  nextLevelIdx: number | null;
}

const LEVEL_FETCH_CONCURRENCY = 4;

async function mapLimited<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

function fromLevels(surah: SurahListing, levels: SurahLevel[]): SurahProgress {
  const total = expectedLevelCount(surah.ayah_count);
  if (levels.length !== total) {
    return { surah, state: 'unavailable', total, completed: 0, nextGroupId: null, nextLevelIdx: null };
  }
  const sorted = [...levels].sort((a, b) => a.sort_order - b.sort_order);
  const completed = sorted.filter(l => l.status === 'completed').length;
  const nextIdx = sorted.findIndex(l => l.status !== 'completed');
  return {
    surah,
    state: completed === total ? 'completed' : 'in_progress',
    total,
    completed,
    nextGroupId: nextIdx >= 0 ? sorted[nextIdx].lesson_group_id : null,
    nextLevelIdx: nextIdx >= 0 ? nextIdx : null,
  };
}

/**
 * Real per-surah progress for all 114 surahs. Levels unlock strictly in
 * order and completions are only ever written by finishing a level, so a
 * surah whose first level isn't completed has zero completions: only surahs
 * with a completed first level need their full level list fetched.
 */
export async function fetchAllSurahProgress(): Promise<SurahProgress[]> {
  const firsts = await learningApi.firstLevels(ALL_SURAHS.map(s => s.surah_number));
  const firstBySurah = new Map(firsts.map(l => [l.surah_number, l]));

  const started = ALL_SURAHS.filter(s => firstBySurah.get(s.surah_number)?.status === 'completed');
  const detailed = await mapLimited(started, LEVEL_FETCH_CONCURRENCY, async s => {
    try {
      return fromLevels(s, await learningApi.levels(s.surah_number));
    } catch {
      return {
        surah: s, state: 'unavailable' as const, total: expectedLevelCount(s.ayah_count),
        completed: 0, nextGroupId: null, nextLevelIdx: null,
      };
    }
  });
  const detailedBySurah = new Map(detailed.map(p => [p.surah.surah_number, p]));

  return ALL_SURAHS.map(s => {
    const d = detailedBySurah.get(s.surah_number);
    if (d) return d;
    const first = firstBySurah.get(s.surah_number);
    return {
      surah: s,
      state: first?.status === 'in_progress' ? 'in_progress' : 'not_started',
      total: expectedLevelCount(s.ayah_count),
      completed: 0,
      nextGroupId: first?.lesson_group_id ?? null,
      nextLevelIdx: 0,
    };
  });
}

import { contentApi, lessonsApi } from '../api';
import type { LessonGroupDetail, SurahBrief } from '../types/api';
import {
  getCachedLessonGroup,
  getCachedSurahs,
  setCachedLessonGroup,
  setCachedSurahs,
} from './contentCache';

/**
 * Surahs: return cache immediately when available; refresh network in background.
 */
export async function loadSurahs(
  juz = 30,
  mvpOnly = true,
  opts?: { force?: boolean },
): Promise<SurahBrief[]> {
  const cached = opts?.force ? null : await getCachedSurahs(juz, mvpOnly);

  const fetchFresh = async (): Promise<SurahBrief[]> => {
    const data = await contentApi.surahs(juz, mvpOnly);
    await setCachedSurahs(juz, mvpOnly, data);
    return data;
  };

  if (cached?.length) {
    void fetchFresh().catch(() => null);
    return cached;
  }

  return fetchFresh();
}

/** Lesson group (ayahs): cache after first fetch; optional force refresh. */
export async function loadLessonGroup(
  groupId: string,
  opts?: { force?: boolean },
): Promise<LessonGroupDetail> {
  if (!opts?.force) {
    const cached = await getCachedLessonGroup(groupId);
    if (cached) return cached;
  }
  const data = await lessonsApi.group(groupId);
  await setCachedLessonGroup(groupId, data);
  return data;
}


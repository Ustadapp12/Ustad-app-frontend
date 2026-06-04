import { JUZ30_SURAHS } from '../data/juz30Surahs';
import { isMvpSurah, MVP_SURAH_NUMBERS } from '../constants/mvp';
import type { SurahBrief } from '../types/api';

const MVP_CATALOG = JUZ30_SURAHS.filter(s => isMvpSurah(s.surah_number));

/** Merge API surahs with local MVP catalog (105–114). API fields win when present. */
export function mergeMvpCatalog(apiSurahs: SurahBrief[]): SurahBrief[] {
  const byNumber = new Map(apiSurahs.map(s => [s.surah_number, s]));
  return MVP_CATALOG.map(meta => {
    const fromApi = byNumber.get(meta.surah_number);
    return fromApi ? { ...meta, ...fromApi } : meta;
  });
}

/** @deprecated Use mergeMvpCatalog */
export const mergeJuz30Catalog = mergeMvpCatalog;

export function sortSurahsForJourney(surahs: SurahBrief[]): SurahBrief[] {
  return [...surahs].sort((a, b) => b.surah_number - a.surah_number);
}

export function filterToMvpSurahs(
  surahs: SurahBrief[],
  mvpFromServer?: number[],
): SurahBrief[] {
  const allowed =
    mvpFromServer && mvpFromServer.length > 0
      ? new Set(mvpFromServer)
      : new Set<number>(MVP_SURAH_NUMBERS);
  return surahs.filter(s => allowed.has(s.surah_number));
}

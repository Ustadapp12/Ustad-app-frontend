/**
 * MVP scope: last 10 surahs of the Quran (114 → 105).
 * Learning order is highest-to-lowest (shortest/most-memorised first).
 * Backend filter `mvp_only=true` must return these same numbers.
 */
export const MVP_SURAH_NUMBERS = [105, 106, 107, 108, 109, 110, 111, 112, 113, 114] as const;

export const MVP_SURAH_MIN = 105;
export const MVP_SURAH_MAX = 114;

export function isMvpSurah(surahNumber: number): boolean {
  return surahNumber >= MVP_SURAH_MIN && surahNumber <= MVP_SURAH_MAX;
}


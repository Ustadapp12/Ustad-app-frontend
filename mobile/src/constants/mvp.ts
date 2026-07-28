/**
 * MVP scope: 21 surahs of Juz Amma, 114 → 93, EXCLUDING 96 (Al-'Alaq).
 * Learning order is highest-to-lowest (shortest/most-memorised first).
 * Backend filter `mvp_only=true` must return these same numbers. Not a
 * contiguous range — isMvpSurah must check membership, not min/max bounds.
 */
export const MVP_SURAH_NUMBERS = [
  93, 94, 95, 97, 98, 99, 100, 101, 102, 103, 104,
  105, 106, 107, 108, 109, 110, 111, 112, 113, 114,
] as const;

export const MVP_SURAH_MIN = 93;
export const MVP_SURAH_MAX = 114;

const MVP_SURAH_SET = new Set<number>(MVP_SURAH_NUMBERS);

export function isMvpSurah(surahNumber: number): boolean {
  return MVP_SURAH_SET.has(surahNumber);
}


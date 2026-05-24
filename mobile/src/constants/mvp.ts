/** Server MVP scope (see API guide §12). */
export const MVP_SURAH_NUMBERS = [78, 79, 80, 81, 82, 83, 84, 85, 86, 87] as const;

export const MVP_SURAH_MIN = 78;
export const MVP_SURAH_MAX = 87;

export function isMvpSurah(surahNumber: number): boolean {
  return surahNumber >= MVP_SURAH_MIN && surahNumber <= MVP_SURAH_MAX;
}

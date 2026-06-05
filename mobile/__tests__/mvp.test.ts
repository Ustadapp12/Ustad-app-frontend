import { scorePlacement } from '../src/data/placementQuestions';
import {
  MVP_SURAH_MAX,
  MVP_SURAH_MIN,
  MVP_SURAH_NUMBERS,
  isMvpSurah,
} from '../src/constants/mvp';

describe('MVP surah scope', () => {
  it('covers surahs 105–114', () => {
    expect(MVP_SURAH_MIN).toBe(105);
    expect(MVP_SURAH_MAX).toBe(114);
    expect(MVP_SURAH_NUMBERS).toEqual([
      105, 106, 107, 108, 109, 110, 111, 112, 113, 114,
    ]);
  });

  it('excludes surah 78 from MVP', () => {
    expect(isMvpSurah(78)).toBe(false);
    expect(isMvpSurah(105)).toBe(true);
    expect(isMvpSurah(114)).toBe(true);
  });
});

describe('placement scoring', () => {
  const total = 4;

  it('starts beginners at An-Nas (114)', () => {
    const result = scorePlacement(Array(total).fill(null));
    expect(result.startSurah).toBe(114);
    expect(result.level).toBe('beginner');
  });

  it('starts advanced learners at Al-Fil (105)', () => {
    const result = scorePlacement([1, 2, 1, 2]);
    expect(result.startSurah).toBe(105);
    expect(result.level).toBe('advanced');
  });
});

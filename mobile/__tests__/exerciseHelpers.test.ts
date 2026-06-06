import {
  BLANK_PLACEHOLDER,
  getFillBlankCorrectAnswer,
  resolveBlankDisplay,
  resolveFullAyahArabic,
  wordAtBlankPosition,
} from '../src/lesson/exerciseHelpers';
import type { ExerciseStep } from '../src/lesson/types';
import type { AyahOut } from '../src/types/api';

const ayah: AyahOut = {
  id: '114_001',
  surah_number: 114,
  ayah_number: 1,
  arabic: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ',
  words: [
    { position: 1, arabic: 'قُلْ', transliteration: 'qul' },
    { position: 2, arabic: 'أَعُوذُ', transliteration: 'a\'udhu' },
    { position: 3, arabic: 'بِرَبِّ', transliteration: 'bi-rabb' },
    { position: 4, arabic: 'النَّاسِ', transliteration: 'an-nas' },
  ],
};

const fillStep = (overrides: Partial<ExerciseStep> = {}): ExerciseStep => ({
  type: 'fill_blank',
  ayah,
  blankPosition: 4,
  options: ['مَلِكِ', 'النَّاسِ'],
  correctIndex: 0,
  ...overrides,
});

describe('exerciseHelpers', () => {
  it('resolves blank word by 1-based position', () => {
    expect(wordAtBlankPosition(ayah.words!, 4)?.arabic).toBe('النَّاسِ');
  });

  it('uses blank position for correct answer, not stale correctIndex', () => {
    expect(getFillBlankCorrectAnswer(fillStep())).toBe('النَّاسِ');
  });

  it('builds blank display with placeholder', () => {
    const display = resolveBlankDisplay(fillStep({ blankDisplay: undefined }));
    expect(display).toContain(BLANK_PLACEHOLDER);
    expect(display).not.toContain('النَّاسِ');
  });

  it('replaces answer inside API full ayah when blank missing', () => {
    const display = resolveBlankDisplay(
      fillStep({ blankDisplay: ayah.arabic }),
    );
    expect(display).toContain(BLANK_PLACEHOLDER);
  });

  it('prefers joined words when ayah.arabic is partial', () => {
    const short = resolveFullAyahArabic('النَّاسِ', ayah.words!);
    expect(short.split(' ').length).toBe(4);
  });
});

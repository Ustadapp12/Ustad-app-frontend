import { scorePlacement } from '../src/data/placementQuestions';

describe('placement scoring', () => {
  const total = 8;

  it('starts beginners at An-Nas (114)', () => {
    const result = scorePlacement(Array(total).fill(null));
    expect(result.startSurah).toBe(114);
    expect(result.level).toBe('beginner');
  });

  it('starts advanced learners at Al-Fil (105)', () => {
    // All 8 correct answers: p1→1, p2→2, p3→1, p4→2, p5→0, p6→0, p7→0, p8→0
    const result = scorePlacement([1, 2, 1, 2, 0, 0, 0, 0]);
    expect(result.startSurah).toBe(105);
    expect(result.level).toBe('advanced');
  });
});

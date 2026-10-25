import { throttledCountUpListener } from '../src/utils/countUp';

describe('throttledCountUpListener', () => {
  let now = 0;
  beforeEach(() => {
    now = 1_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });
  afterEach(() => jest.restoreAllMocks());

  it('passes at most one number per interval and always lands on the total', () => {
    const shown: number[] = [];
    const listener = throttledCountUpListener(120, n => shown.push(n));
    // One second at ~60 frames, value rising linearly to 120.
    for (let f = 1; f <= 60; f++) {
      now += 1000 / 60;
      listener({ value: (120 * f) / 60 });
    }
    expect(shown[shown.length - 1]).toBe(120);
    expect(shown.length).toBeLessThanOrEqual(11);
    for (let i = 1; i < shown.length; i++) expect(shown[i]).toBeGreaterThan(shown[i - 1]);
  });

  it('never repeats the same number', () => {
    const shown: number[] = [];
    const listener = throttledCountUpListener(3, n => shown.push(n));
    for (const v of [0.2, 0.4, 3, 3, 3]) { now += 200; listener({ value: v }); }
    expect(shown).toEqual([0, 3]);
  });
});

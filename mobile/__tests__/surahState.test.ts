/**
 * The open/closed/done rule from SearchSurahsScreen, extracted so the
 * boundary is pinned independently of rendering.
 *
 * The rule, per explicit product decision: "if first level done then that
 * surah is opened, if not done then it's closed". NOT availability — the
 * backend never locks a surah's first level (learning/service.py:
 * "A surah's first group has no cross-surah gate — never locked"), so an
 * availability-based badge would mark all 114 surahs open and say nothing.
 *
 * The case that matters most is `unknown`. statusBySurah starts empty and the
 * fetch can fail, so treating absence as "closed" before the load settles
 * would label every surah closed on a network hiccup — telling a user their
 * finished work is gone.
 */
type LevelStatus = 'locked' | 'available' | 'in_progress' | 'completed';
type SurahState = 'done' | 'open' | 'closed' | 'unknown';
type LoadState = 'loading' | 'ready' | 'failed';

// Mirrors stateFor() in SearchSurahsScreen.tsx.
function stateFor(
  surahNumber: number,
  doneSurahs: Set<number>,
  statusBySurah: Record<number, LevelStatus>,
  loadState: LoadState,
): SurahState {
  if (doneSurahs.has(surahNumber)) return 'done';
  const status = statusBySurah[surahNumber];
  if (status === undefined) return loadState === 'ready' ? 'closed' : 'unknown';
  return status === 'completed' ? 'open' : 'closed';
}

const none = new Set<number>();

describe('surah state rule', () => {
  it('is open when the first level is completed', () => {
    expect(stateFor(1, none, { 1: 'completed' }, 'ready')).toBe('open');
  });

  it('is closed when the first level is merely available', () => {
    // The whole point: "available" is true of every surah, so it is not open.
    expect(stateFor(1, none, { 1: 'available' }, 'ready')).toBe('closed');
  });

  it('is closed when the first level is in progress but unfinished', () => {
    expect(stateFor(1, none, { 1: 'in_progress' }, 'ready')).toBe('closed');
  });

  it('is closed when the first level is locked', () => {
    expect(stateFor(1, none, { 1: 'locked' }, 'ready')).toBe('closed');
  });

  it('is done when every level is complete, outranking open', () => {
    expect(stateFor(1, new Set([1]), { 1: 'completed' }, 'ready')).toBe('done');
  });

  it('still reports done even if the status map never loaded', () => {
    // doneSurahs is only ever populated from a successful full-levels fetch,
    // so it is trustworthy on its own.
    expect(stateFor(1, new Set([1]), {}, 'failed')).toBe('done');
  });
});

describe('unknown is never mistaken for closed', () => {
  it('is unknown while the status call is still in flight', () => {
    expect(stateFor(1, none, {}, 'loading')).toBe('unknown');
  });

  it('is unknown when the status call failed', () => {
    expect(stateFor(1, none, {}, 'failed')).toBe('unknown');
  });

  it('does not mark all 114 closed on a failed fetch', () => {
    const states = Array.from({ length: 114 }, (_, i) =>
      stateFor(i + 1, none, {}, 'failed'));
    expect(states.every(s => s === 'unknown')).toBe(true);
    expect(states).not.toContain('closed');
  });

  it('only calls a missing surah closed once the load has succeeded', () => {
    // A surah genuinely absent from a successful response has no content
    // seeded, which is a real closed state.
    expect(stateFor(99, none, { 1: 'completed' }, 'ready')).toBe('closed');
  });
});

describe('sort ranking', () => {
  const STATE_RANK: Record<SurahState, number> = { open: 0, closed: 1, unknown: 1, done: 2 };

  it('puts work in progress first and finished work last', () => {
    const order = (['done', 'closed', 'open'] as SurahState[])
      .sort((a, b) => STATE_RANK[a] - STATE_RANK[b]);
    expect(order).toEqual(['open', 'closed', 'done']);
  });

  it('parks unknown with closed rather than claiming a position', () => {
    expect(STATE_RANK.unknown).toBe(STATE_RANK.closed);
  });
});

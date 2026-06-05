import { ayahIdForApi, formatAyahId } from '../src/utils/ayahId';

describe('ayah id formatting', () => {
  it('formats surah 114 ayah 1 as 114_001', () => {
    expect(formatAyahId(114, 1)).toBe('114_001');
  });

  it('formats surah 105 ayah 5 as 105_005', () => {
    expect(formatAyahId(105, 5)).toBe('105_005');
  });

  it('builds API id from ayah fields', () => {
    expect(
      ayahIdForApi({ surah_number: 114, ayah_number: 1 }),
    ).toBe('114_001');
  });
});

import { JUZ30_SURAHS } from '../data/juz30Surahs';

/** Tashkeel-rich surah titles for Juz 30 (78–114) — used when API names lack harakat. */
const SURAH_AR_TASHKEEL: Record<number, string> = {
  78: 'النَّبَأ',
  79: 'النَّازِعَات',
  80: 'عَبَسَ',
  81: 'التَّكْوِير',
  82: 'الانْفِطَار',
  83: 'الْمُطَفِّفِين',
  84: 'الانْشِقَاق',
  85: 'الْبُرُوج',
  86: 'الطَّارِق',
  87: 'الْأَعْلَىٰ',
  88: 'الْغَاشِيَة',
  89: 'الْفَجْر',
  90: 'الْبَلَد',
  91: 'الشَّمْس',
  92: 'اللَّيْل',
  93: 'الضُّحَىٰ',
  94: 'الشَّرْح',
  95: 'التِّين',
  96: 'الْعَلَق',
  97: 'الْقَدْر',
  98: 'الْبَيِّنَة',
  99: 'الزَّلْزَلَة',
  100: 'الْعَادِيَات',
  101: 'الْقَارِعَة',
  102: 'التَّكَاثُر',
  103: 'الْعَصْر',
  104: 'الْهُمَزَة',
  105: 'الْفِيل',
  106: 'قُرَيْش',
  107: 'الْمَاعُون',
  108: 'الْكَوْثَر',
  109: 'الْكَافِرُون',
  110: 'النَّصْر',
  111: 'الْمَسَد',
  112: 'الْإِخْلَاص',
  113: 'الْفَلَق',
  114: 'النَّاس',
};

export function displaySurahNameAr(surahNumber: number, fallback: string): string {
  return SURAH_AR_TASHKEEL[surahNumber] ?? fallback;
}

export function displaySurahNameEn(surahNumber: number): string {
  const meta = JUZ30_SURAHS.find(s => s.surah_number === surahNumber);
  return meta ? `Surah ${meta.name_en}` : `Surah ${surahNumber}`;
}


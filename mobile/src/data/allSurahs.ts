import { JUZ30_SURAHS } from './juz30Surahs';

/** Static catalogue only: names and ayah counts, nothing about availability.
 * The map lays out all 114 from this, and whether a surah opens is answered by
 * the backend at the moment it's tapped rather than predicted from any list
 * shipped in the app. */
export interface SurahListing {
  surah_number: number;
  name_en: string;
  name_ar: string;
  ayah_count: number;
  revelation: 'meccan' | 'medinan';
}

// Surahs 1-77 (78-114 already exist, verified, in juz30Surahs.ts — reused
// below instead of re-typed here). Names/ayah counts cross-checked against
// api.quran.com's chapter list.
const SURAHS_1_TO_77: SurahListing[] = [
  { surah_number: 1, name_en: 'Al-Fatihah', name_ar: 'الفاتحة', ayah_count: 7, revelation: 'meccan' },
  { surah_number: 2, name_en: 'Al-Baqarah', name_ar: 'البقرة', ayah_count: 286, revelation: 'medinan' },
  { surah_number: 3, name_en: "Ali 'Imran", name_ar: 'آل عمران', ayah_count: 200, revelation: 'medinan' },
  { surah_number: 4, name_en: 'An-Nisa', name_ar: 'النساء', ayah_count: 176, revelation: 'medinan' },
  { surah_number: 5, name_en: "Al-Ma'idah", name_ar: 'المائدة', ayah_count: 120, revelation: 'medinan' },
  { surah_number: 6, name_en: "Al-An'am", name_ar: 'الأنعام', ayah_count: 165, revelation: 'meccan' },
  { surah_number: 7, name_en: "Al-A'raf", name_ar: 'الأعراف', ayah_count: 206, revelation: 'meccan' },
  { surah_number: 8, name_en: 'Al-Anfal', name_ar: 'الأنفال', ayah_count: 75, revelation: 'medinan' },
  { surah_number: 9, name_en: 'At-Tawbah', name_ar: 'التوبة', ayah_count: 129, revelation: 'medinan' },
  { surah_number: 10, name_en: 'Yunus', name_ar: 'يونس', ayah_count: 109, revelation: 'meccan' },
  { surah_number: 11, name_en: 'Hud', name_ar: 'هود', ayah_count: 123, revelation: 'meccan' },
  { surah_number: 12, name_en: 'Yusuf', name_ar: 'يوسف', ayah_count: 111, revelation: 'meccan' },
  { surah_number: 13, name_en: "Ar-Ra'd", name_ar: 'الرعد', ayah_count: 43, revelation: 'medinan' },
  { surah_number: 14, name_en: 'Ibrahim', name_ar: 'ابراهيم', ayah_count: 52, revelation: 'meccan' },
  { surah_number: 15, name_en: 'Al-Hijr', name_ar: 'الحجر', ayah_count: 99, revelation: 'meccan' },
  { surah_number: 16, name_en: 'An-Nahl', name_ar: 'النحل', ayah_count: 128, revelation: 'meccan' },
  { surah_number: 17, name_en: 'Al-Isra', name_ar: 'الإسراء', ayah_count: 111, revelation: 'meccan' },
  { surah_number: 18, name_en: 'Al-Kahf', name_ar: 'الكهف', ayah_count: 110, revelation: 'meccan' },
  { surah_number: 19, name_en: 'Maryam', name_ar: 'مريم', ayah_count: 98, revelation: 'meccan' },
  { surah_number: 20, name_en: 'Taha', name_ar: 'طه', ayah_count: 135, revelation: 'meccan' },
  { surah_number: 21, name_en: 'Al-Anbya', name_ar: 'الأنبياء', ayah_count: 112, revelation: 'meccan' },
  { surah_number: 22, name_en: 'Al-Hajj', name_ar: 'الحج', ayah_count: 78, revelation: 'medinan' },
  { surah_number: 23, name_en: "Al-Mu'minun", name_ar: 'المؤمنون', ayah_count: 118, revelation: 'meccan' },
  { surah_number: 24, name_en: 'An-Nur', name_ar: 'النور', ayah_count: 64, revelation: 'medinan' },
  { surah_number: 25, name_en: 'Al-Furqan', name_ar: 'الفرقان', ayah_count: 77, revelation: 'meccan' },
  { surah_number: 26, name_en: "Ash-Shu'ara", name_ar: 'الشعراء', ayah_count: 227, revelation: 'meccan' },
  { surah_number: 27, name_en: 'An-Naml', name_ar: 'النمل', ayah_count: 93, revelation: 'meccan' },
  { surah_number: 28, name_en: 'Al-Qasas', name_ar: 'القصص', ayah_count: 88, revelation: 'meccan' },
  { surah_number: 29, name_en: "Al-'Ankabut", name_ar: 'العنكبوت', ayah_count: 69, revelation: 'meccan' },
  { surah_number: 30, name_en: 'Ar-Rum', name_ar: 'الروم', ayah_count: 60, revelation: 'meccan' },
  { surah_number: 31, name_en: 'Luqman', name_ar: 'لقمان', ayah_count: 34, revelation: 'meccan' },
  { surah_number: 32, name_en: 'As-Sajdah', name_ar: 'السجدة', ayah_count: 30, revelation: 'meccan' },
  { surah_number: 33, name_en: 'Al-Ahzab', name_ar: 'الأحزاب', ayah_count: 73, revelation: 'medinan' },
  { surah_number: 34, name_en: 'Saba', name_ar: 'سبإ', ayah_count: 54, revelation: 'meccan' },
  { surah_number: 35, name_en: 'Fatir', name_ar: 'فاطر', ayah_count: 45, revelation: 'meccan' },
  { surah_number: 36, name_en: 'Ya-Sin', name_ar: 'يس', ayah_count: 83, revelation: 'meccan' },
  { surah_number: 37, name_en: 'As-Saffat', name_ar: 'الصافات', ayah_count: 182, revelation: 'meccan' },
  { surah_number: 38, name_en: 'Sad', name_ar: 'ص', ayah_count: 88, revelation: 'meccan' },
  { surah_number: 39, name_en: 'Az-Zumar', name_ar: 'الزمر', ayah_count: 75, revelation: 'meccan' },
  { surah_number: 40, name_en: 'Ghafir', name_ar: 'غافر', ayah_count: 85, revelation: 'meccan' },
  { surah_number: 41, name_en: 'Fussilat', name_ar: 'فصلت', ayah_count: 54, revelation: 'meccan' },
  { surah_number: 42, name_en: 'Ash-Shuraa', name_ar: 'الشورى', ayah_count: 53, revelation: 'meccan' },
  { surah_number: 43, name_en: 'Az-Zukhruf', name_ar: 'الزخرف', ayah_count: 89, revelation: 'meccan' },
  { surah_number: 44, name_en: 'Ad-Dukhan', name_ar: 'الدخان', ayah_count: 59, revelation: 'meccan' },
  { surah_number: 45, name_en: 'Al-Jathiyah', name_ar: 'الجاثية', ayah_count: 37, revelation: 'meccan' },
  { surah_number: 46, name_en: 'Al-Ahqaf', name_ar: 'الأحقاف', ayah_count: 35, revelation: 'meccan' },
  { surah_number: 47, name_en: 'Muhammad', name_ar: 'محمد', ayah_count: 38, revelation: 'medinan' },
  { surah_number: 48, name_en: 'Al-Fath', name_ar: 'الفتح', ayah_count: 29, revelation: 'medinan' },
  { surah_number: 49, name_en: 'Al-Hujurat', name_ar: 'الحجرات', ayah_count: 18, revelation: 'medinan' },
  { surah_number: 50, name_en: 'Qaf', name_ar: 'ق', ayah_count: 45, revelation: 'meccan' },
  { surah_number: 51, name_en: 'Adh-Dhariyat', name_ar: 'الذاريات', ayah_count: 60, revelation: 'meccan' },
  { surah_number: 52, name_en: 'At-Tur', name_ar: 'الطور', ayah_count: 49, revelation: 'meccan' },
  { surah_number: 53, name_en: 'An-Najm', name_ar: 'النجم', ayah_count: 62, revelation: 'meccan' },
  { surah_number: 54, name_en: 'Al-Qamar', name_ar: 'القمر', ayah_count: 55, revelation: 'meccan' },
  { surah_number: 55, name_en: 'Ar-Rahman', name_ar: 'الرحمن', ayah_count: 78, revelation: 'medinan' },
  { surah_number: 56, name_en: "Al-Waqi'ah", name_ar: 'الواقعة', ayah_count: 96, revelation: 'meccan' },
  { surah_number: 57, name_en: 'Al-Hadid', name_ar: 'الحديد', ayah_count: 29, revelation: 'medinan' },
  { surah_number: 58, name_en: 'Al-Mujadila', name_ar: 'المجادلة', ayah_count: 22, revelation: 'medinan' },
  { surah_number: 59, name_en: 'Al-Hashr', name_ar: 'الحشر', ayah_count: 24, revelation: 'medinan' },
  { surah_number: 60, name_en: 'Al-Mumtahanah', name_ar: 'الممتحنة', ayah_count: 13, revelation: 'medinan' },
  { surah_number: 61, name_en: 'As-Saf', name_ar: 'الصف', ayah_count: 14, revelation: 'medinan' },
  { surah_number: 62, name_en: "Al-Jumu'ah", name_ar: 'الجمعة', ayah_count: 11, revelation: 'medinan' },
  { surah_number: 63, name_en: 'Al-Munafiqun', name_ar: 'المنافقون', ayah_count: 11, revelation: 'medinan' },
  { surah_number: 64, name_en: 'At-Taghabun', name_ar: 'التغابن', ayah_count: 18, revelation: 'medinan' },
  { surah_number: 65, name_en: 'At-Talaq', name_ar: 'الطلاق', ayah_count: 12, revelation: 'medinan' },
  { surah_number: 66, name_en: 'At-Tahrim', name_ar: 'التحريم', ayah_count: 12, revelation: 'medinan' },
  { surah_number: 67, name_en: 'Al-Mulk', name_ar: 'الملك', ayah_count: 30, revelation: 'meccan' },
  { surah_number: 68, name_en: 'Al-Qalam', name_ar: 'القلم', ayah_count: 52, revelation: 'meccan' },
  { surah_number: 69, name_en: 'Al-Haqqah', name_ar: 'الحاقة', ayah_count: 52, revelation: 'meccan' },
  { surah_number: 70, name_en: "Al-Ma'arij", name_ar: 'المعارج', ayah_count: 44, revelation: 'meccan' },
  { surah_number: 71, name_en: 'Nuh', name_ar: 'نوح', ayah_count: 28, revelation: 'meccan' },
  { surah_number: 72, name_en: 'Al-Jinn', name_ar: 'الجن', ayah_count: 28, revelation: 'meccan' },
  { surah_number: 73, name_en: 'Al-Muzzammil', name_ar: 'المزمل', ayah_count: 20, revelation: 'meccan' },
  { surah_number: 74, name_en: 'Al-Muddaththir', name_ar: 'المدثر', ayah_count: 56, revelation: 'meccan' },
  { surah_number: 75, name_en: 'Al-Qiyamah', name_ar: 'القيامة', ayah_count: 40, revelation: 'meccan' },
  { surah_number: 76, name_en: 'Al-Insan', name_ar: 'الانسان', ayah_count: 31, revelation: 'medinan' },
  { surah_number: 77, name_en: 'Al-Mursalat', name_ar: 'المرسلات', ayah_count: 50, revelation: 'meccan' },
];

/** All 114 surahs, ascending by surah number. */
export const ALL_SURAHS: SurahListing[] = [
  ...SURAHS_1_TO_77,
  ...JUZ30_SURAHS.map(s => ({
    surah_number: s.surah_number,
    name_en: s.name_en,
    name_ar: s.name_ar,
    ayah_count: s.ayah_count,
    revelation: s.revelation as 'meccan' | 'medinan',
  })),
];

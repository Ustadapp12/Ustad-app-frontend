export type PlacementQuestion = {
  id: string;
  promptAr: string;
  promptEn: string;
  options: string[];
  correctIndex: number;
};

/** Client-side placement quiz (Juz Amma sample) until backend placement API exists. */
export const PLACEMENT_QUESTIONS: PlacementQuestion[] = [
  {
    id: 'p1',
    promptAr: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ',
    promptEn: 'Which surah begins with this ayah?',
    options: ['Al-Ikhlas', 'Al-Falaq', 'An-Nas', 'Al-Fatiha'],
    correctIndex: 0,
  },
  {
    id: 'p2',
    promptAr: 'إِذَا زُلْزِلَتِ ٱلْأَرْضُ',
    promptEn: 'Name this surah opening:',
    options: ['Az-Zalzalah', 'Al-Qadr', 'Al-Asr', 'Al-Kawthar'],
    correctIndex: 0,
  },
  {
    id: 'p3',
    promptAr: 'وَٱلْعَصْرِ',
    promptEn: 'This is the beginning of:',
    options: ["Al-'Asr", 'Al-Humazah', 'Al-Fil', 'An-Nasr'],
    correctIndex: 0,
  },
  {
    id: 'p4',
    promptAr: 'قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ',
    promptEn: 'Which surah is this from?',
    options: ['An-Nas', 'Al-Falaq', 'Al-Ikhlas', 'Al-Masad'],
    correctIndex: 0,
  },
];

export function scorePlacement(answers: (number | null)[]): {
  correct: number;
  total: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  startSurah: number;
} {
  const total = PLACEMENT_QUESTIONS.length;
  let correct = 0;
  answers.forEach((a, i) => {
    if (a === PLACEMENT_QUESTIONS[i].correctIndex) correct += 1;
  });
  const pct = correct / total;
  if (pct >= 0.75) {
    return { correct, total, level: 'advanced', startSurah: 80 };
  }
  if (pct >= 0.5) {
    return { correct, total, level: 'intermediate', startSurah: 85 };
  }
  return { correct, total, level: 'beginner', startSurah: 87 };
}

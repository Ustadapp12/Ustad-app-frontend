export type PlacementQuestion = {
  id: string;
  teacher: 'sheikh' | 'sheikha';
  teacherIntro: string;
  promptLabel: string;
  promptAr: string;
  promptIsSymbol?: boolean;
  promptNote?: string;
  options: string[];
  correctIndex: number;
  layout: 'column' | 'grid';
  optionAr: boolean;
};

export const PLACEMENT_QUESTIONS: PlacementQuestion[] = [
  {
    id: 'p1',
    teacher: 'sheikh',
    teacherIntro:
      "As-salamu alaykum! Let's begin with Surah An-Nas. Can you complete this verse?",
    promptLabel: 'Complete the Ayah',
    promptAr: 'قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ _____',
    options: [
      'إِلَٰهِ ٱلنَّاسِ',
      'مَلِكِ ٱلنَّاسِ',
      'مِن شَرِّ ٱلْوَسْوَاسِ',
      'مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ',
    ],
    correctIndex: 1,
    layout: 'column',
    optionAr: true,
  },
  {
    id: 'p2',
    teacher: 'sheikha',
    teacherIntro:
      "Excellent! Now Surah Al-Ikhlas — one of the most beloved surahs. Which verse follows this one?",
    promptLabel: 'What comes next?',
    promptAr: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ',
    options: [
      'لَمْ يَلِدْ وَلَمْ يُولَدْ',
      'وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌ',
      'ٱللَّهُ ٱلصَّمَدُ',
      'قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ',
    ],
    correctIndex: 2,
    layout: 'column',
    optionAr: true,
  },
  {
    id: 'p3',
    teacher: 'sheikh',
    teacherIntro:
      "Masha'Allah! You're doing great. Now Surah Al-Falaq — can you fill in the missing word?",
    promptLabel: 'Fill in the blank',
    promptAr: 'مِن شَرِّ مَا ____',
    options: ['غَسَقَ', 'خَلَقَ', 'نَفَثَ', 'حَسَدَ'],
    correctIndex: 1,
    layout: 'grid',
    optionAr: true,
  },
  {
    id: 'p4',
    teacher: 'sheikha',
    teacherIntro:
      'Great! A quick Tajweed question — can you identify this symbol? 📖',
    promptLabel: 'Match the symbol',
    promptAr: 'ّ',
    promptIsSymbol: true,
    promptNote: 'This symbol appears above letters',
    options: [
      'Madd — Prolongation',
      'Sukoon — No vowel',
      'Shaddah — Emphasis',
      'Tanween — Nunation',
    ],
    correctIndex: 2,
    layout: 'column',
    optionAr: false,
  },
  {
    id: 'p5',
    teacher: 'sheikh',
    teacherIntro:
      "Surah Al-Asr — one of the shortest but most profound Surahs. What comes after this verse?",
    promptLabel: 'What comes next?',
    promptAr: 'وَٱلْعَصْرِ',
    options: [
      'إِنَّ ٱلْإِنسَـٰنَ لَفِى خُسْرٍ',
      'إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا',
      'ٱللَّهُ لَآ إِلَـٰهَ إِلَّا هُوَ',
      'وَمَآ أَدْرَىٰكَ مَا ٱلْقَارِعَةُ',
    ],
    correctIndex: 0,
    layout: 'column',
    optionAr: true,
  },
  {
    id: 'p6',
    teacher: 'sheikha',
    teacherIntro:
      "Surah Al-Kawthar has three beautiful verses. Complete the second one.",
    promptLabel: 'Fill in the blank',
    promptAr: 'فَصَلِّ لِرَبِّكَ ___',
    options: ['وَٱنْحَرْ', 'وَٱصْبِرْ', 'وَٱشْكُرْ', 'وَٱسْتَغْفِرْ'],
    correctIndex: 0,
    layout: 'grid',
    optionAr: true,
  },
  {
    id: 'p7',
    teacher: 'sheikh',
    teacherIntro:
      "Surah Al-Fatiha opens every unit of prayer. Complete this verse.",
    promptLabel: 'Complete the Ayah',
    promptAr: 'ٱهْدِنَا ٱلصِّرَٰطَ ___',
    options: [
      'ٱلْمُسْتَقِيمَ',
      'ٱلْعَظِيمَ',
      'ٱلرَّحِيمَ',
      'ٱلصَّوَابَ',
    ],
    correctIndex: 0,
    layout: 'grid',
    optionAr: true,
  },
  {
    id: 'p8',
    teacher: 'sheikha',
    teacherIntro:
      "Last one — can you identify this Tajweed symbol? Almost there! 🌟",
    promptLabel: 'Match the symbol',
    promptAr: 'ٓ',
    promptIsSymbol: true,
    promptNote: 'This small superscript mark extends the vowel sound',
    options: [
      'Madd — Prolongation',
      'Sukoon — No vowel',
      'Hamza — Glottal stop',
      'Waqf — Stopping sign',
    ],
    correctIndex: 0,
    layout: 'column',
    optionAr: false,
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
    // Advanced — start from the harder end (Al-Fil 105)
    return { correct, total, level: 'advanced', startSurah: 105 };
  }
  if (pct >= 0.5) {
    // Intermediate — start from the middle (Al-Kafirun 109)
    return { correct, total, level: 'intermediate', startSurah: 109 };
  }
  // Beginner — start from the very end (An-Nas 114)
  return { correct, total, level: 'beginner', startSurah: 114 };
}

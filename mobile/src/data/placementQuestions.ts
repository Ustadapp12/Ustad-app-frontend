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
      "As-salamu alaykum! Let's begin with Surah Al-Fatiha. Can you complete this verse?",
    promptLabel: 'Complete the Ayah',
    promptAr: 'ٱلْحَمْدُ لِلَّهِ _____',
    options: [
      'ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
      'رَبِّ ٱلْعَـٰلَمِينَ',
      'مَـٰلِكِ يَوْمِ ٱلدِّينِ',
      'إِيَّاكَ نَعْبُدُ',
    ],
    correctIndex: 1,
    layout: 'column',
    optionAr: true,
  },
  {
    id: 'p2',
    teacher: 'sheikha',
    teacherIntro:
      "Excellent! Now let's test your knowledge of Surah Al-Ikhlas. Which verse follows?",
    promptLabel: 'What comes next?',
    promptAr: 'ٱللَّهُ ٱلصَّمَدُ',
    options: [
      'قُلْ هُوَ ٱللَّهُ أَحَدٌ',
      'ٱللَّهُ ٱلصَّمَدُ',
      'لَمْ يَلِدْ وَلَمْ يُولَدْ',
      'وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌ',
    ],
    correctIndex: 2,
    layout: 'column',
    optionAr: true,
  },
  {
    id: 'p3',
    teacher: 'sheikh',
    teacherIntro:
      "Masha'Allah! You're doing great. Back to Al-Fatiha — can you fill in the missing word?",
    promptLabel: 'Fill in the blank',
    promptAr: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ ____',
    options: ['نَعْبُدُ', 'نَسْتَعِينُ', 'ٱهْدِنَا', 'صِرَٰطَ'],
    correctIndex: 1,
    layout: 'grid',
    optionAr: true,
  },
  {
    id: 'p4',
    teacher: 'sheikha',
    teacherIntro:
      'Almost done! One final question about Tajweed. Show me what you know! 📖',
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

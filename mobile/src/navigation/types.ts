export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Intro: undefined;
  OnboardingMotivation: undefined;
  OnboardingScript: undefined;
  OnboardingDailyGoal: undefined;
  OnboardingNotifications: undefined;
  OnboardingAccount: undefined;
  RecitationLevel: undefined;
  OnboardingStreakGoal: undefined;
  StreakDay1: undefined;
  PathChoose: undefined;
  PlacementIntro: undefined;
  PlacementTest: undefined;
  PlacementResults: { answers: (number | null)[] };
  VerifyEmail: { email: string };
  ForgotPassword: undefined;
  ResetCode: { email: string };
  NewPassword: { email: string; code: string };
  Celebration: {
    answers?: (number | null)[];
    scorePct?: number;
    level?: string;
    startSurah?: number;
  };
  AuthLogin: undefined;
  AuthRegister: undefined;
  MainTabs: undefined;
  SurahLevels: { surahNumber: number; nameEn: string; nameAr?: string };
  LessonStart: { groupId: string; label: string };
  LessonSession: { groupId: string };
  LessonComplete: {
    xp: number;
    scorePct: number;
    stars: number;
    gems?: number;
    heartsRemaining?: number;
  };
  StreakModal: { streak: number };
  StageIntro: {
    groupId: string;
    stageType: 'listening' | 'recognition' | 'building' | 'recall' | 'mastery';
    stageTitle: string;
    surahNameEn: string;
    surahNumber: number;
    xpReward: number;
  };
  Terms: undefined;
  Privacy: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Revision: undefined;
  Stats: undefined;
  Profile: undefined;
};

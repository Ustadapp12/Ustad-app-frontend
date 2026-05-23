export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Intro: undefined;
  OnboardingMotivation: undefined;
  OnboardingDailyGoal: undefined;
  OnboardingNotifications: undefined;
  OnboardingAccount: undefined;
  OnboardingStreakGoal: undefined;
  PathChoose: undefined;
  PlacementIntro: undefined;
  AuthLogin: undefined;
  AuthRegister: undefined;
  MainTabs: undefined;
  SurahLevels: { surahNumber: number; nameEn: string };
  LessonStart: { groupId: string; label: string };
  LessonSession: { groupId: string };
  LessonComplete: {
    xp: number;
    scorePct: number;
    stars: number;
    gems?: number;
  };
  StreakModal: { streak: number };
};

export type MainTabParamList = {
  Home: undefined;
  Journey: undefined;
  Revision: undefined;
  Profile: undefined;
};

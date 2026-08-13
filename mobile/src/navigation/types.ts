import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { StreakState } from '../types/api';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  SignUp: undefined;
  VerifyEmail: { email?: string } | undefined;
  ForgotPassword: undefined;
  VerifyResetCode: { email: string };
  ResetPassword: { email: string; code: string };
  OnboardUsername: undefined;
  OnboardAge: undefined;
  OnboardGender: undefined;
  OnboardWelcome: { gender: 'male' | 'female' };
  OnboardGoal: undefined;
  OnboardScript: undefined;
  OnboardPath: undefined;
  OnboardAssessment: undefined;
  MainTabs: undefined;
  // Lesson half of the guided tour — a display-only clone of the lesson screen.
  GuidedTour: undefined;
  // Lesson flow (Phase 2)
  LessonSession: { groupId: string; surahName: string; surahNumber: number };
  LessonComplete: {
    xp: number; scorePct: number; stars: number; gems?: number;
    streakIncremented?: boolean; currentStreak?: number;
    streakRepaired?: boolean;
    // Present (and streakState === 'frozen') on a completion that made repair
    // progress but didn't finish it — routes Continue to StreakRepairProgress
    // instead of MainTabs, distinct from the streakRepaired case above.
    streakState?: StreakState;
    repairLevelsCompleted?: number;
    repairLevelsRequired?: number;
  };
  // Modals
  Streak: { justIncremented?: boolean; currentStreak?: number } | undefined;
  // Post-lesson streak celebration — see StreakCelebrationScreen.
  // streakRepaired: true only on the exact completion that unfroze a frozen
  // streak — plays the ice-break-then-fire sequence instead of the plain loop.
  StreakCelebration: { currentStreak: number; streakRepaired?: boolean };
  // A level completed while frozen that made repair progress but didn't
  // finish it — its own screen (see StreakRepairProgressScreen), not a badge
  // on LessonSummaryScreen.
  StreakRepairProgress: { repairLevelsCompleted: number; repairLevelsRequired: number };
};

export type TabParamList = {
  Map: undefined;
  DailyQuest: undefined;
  Leaderboard: undefined;
  Profile: undefined;
  Help: undefined;
};

export type RootNavProp = NativeStackNavigationProp<RootStackParamList>;
export type TabNavProp = BottomTabNavigationProp<TabParamList>;

export type MapNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Map'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export type ProfileNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;


import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp, NavigatorScreenParams } from '@react-navigation/native';
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
  MainTabs: NavigatorScreenParams<TabParamList> | undefined;
  // WIP clone of the map for the new Figma-driven theme — see
  // MapScreenV2.tsx's own header comment. Not in any real nav flow yet.
  MapV2: undefined;
  // Full 114-surah browse/search list, opened from the map's search button.
  // Confirming "Start" there navigates back to MainTabs/Map with
  // params.jumpToSurah set (see TabParamList.Map below).
  SearchSurahs: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  Feedback: undefined;
  // Lesson half of the guided tour — a display-only clone of the lesson screen.
  GuidedTour: undefined;
  // Lesson flow (Phase 2)
  LessonSession: {
    groupId: string; surahName: string; surahNumber: number;
    // Merged/review levels (the green-star map nodes) — hearts are neither
    // shown nor ever lost throughout the whole level, not just specific
    // phases within it.
    isSpecial?: boolean;
  };
  LessonComplete: {
    xp: number; scorePct: number; stars: number; gems?: number;
    // Whole-session wall-clock time in seconds, from lesson start to the
    // completing submit — omitted on the assessment/placement flow, which
    // doesn't track it.
    durationSec?: number;
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
  XP: undefined;
  // Post-lesson streak celebration — see StreakCelebrationScreen.
  // streakRepaired: true only on the exact completion that unfroze a frozen
  // streak — plays the ice-break-then-fire sequence instead of the plain loop.
  StreakCelebration: { currentStreak: number; streakRepaired?: boolean };
  // A level completed while frozen that made repair progress but didn't
  // finish it — its own screen (see StreakRepairProgressScreen), not a badge
  // on LessonSummaryScreen.
  StreakRepairProgress: { repairLevelsCompleted: number; repairLevelsRequired: number };
  // Where a guest lands after every post-lesson streak celebration (that
  // screen pins the shown streak at 0 for guests) — see
  // GuestStreakPitchScreen and StreakCelebrationScreen.
  GuestStreakPitch: undefined;
};

export type TabParamList = {
  // jumpToSurah: set once by SearchSurahsScreen's "Start" confirm. MapScreen
  // reads and clears it to scroll to (and unlock, if needed) that surah's
  // first level — see MapScreen.tsx's search-jump effect.
  Map: { jumpToSurah?: number } | undefined;
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


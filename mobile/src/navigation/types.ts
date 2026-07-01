import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  SignUp: undefined;
  OnboardGoal: undefined;
  OnboardPath: undefined;
  OnboardScript: undefined;
  MainTabs: undefined;
  // Lesson flow (Phase 2)
  LessonStart: { groupId: string; surahName: string; surahNumber: number };
  LessonSession: { groupId: string; surahName: string; surahNumber: number };
  LessonComplete: { xp: number; scorePct: number; stars: number; gems?: number; heartsRemaining?: number };
  // Modals
  Streak: undefined;
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


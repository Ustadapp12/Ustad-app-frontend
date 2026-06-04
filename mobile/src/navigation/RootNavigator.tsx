import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SplashScreen } from '../screens/startup/SplashScreen';
import { WelcomeScreen } from '../screens/startup/WelcomeScreen';
import { IntroScreen } from '../screens/startup/IntroScreen';
import { MotivationScreen } from '../screens/onboarding/MotivationScreen';
import { ScriptScreen } from '../screens/onboarding/ScriptScreen';
import { DailyGoalScreen } from '../screens/onboarding/DailyGoalScreen';
import { NotificationsScreen } from '../screens/onboarding/NotificationsScreen';
import { AccountPromptScreen } from '../screens/onboarding/AccountPromptScreen';
import { StreakGoalScreen } from '../screens/onboarding/StreakGoalScreen';
import { PathChooseScreen } from '../screens/path/PathChooseScreen';
import { PlacementIntroScreen } from '../screens/path/PlacementIntroScreen';
import { PlacementTestScreen } from '../screens/placement/PlacementTestScreen';
import { PlacementResultsScreen } from '../screens/placement/PlacementResultsScreen';
import { CelebrationScreen } from '../screens/placement/CelebrationScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { VerifyEmailScreen } from '../screens/auth/VerifyEmailScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { ResetCodeScreen } from '../screens/auth/ResetCodeScreen';
import { NewPasswordScreen } from '../screens/auth/NewPasswordScreen';
import { MainTabs } from './MainTabs';
import { SurahLevelsScreen } from '../screens/journey/SurahLevelsScreen';
import { LessonStartScreen } from '../screens/lesson/LessonStartScreen';
import { LessonSessionScreen } from '../screens/lesson/LessonSessionScreen';
import { LessonCompleteScreen } from '../screens/lesson/LessonCompleteScreen';
import { StreakModalScreen } from '../screens/gamification/StreakModalScreen';
import { TermsScreen } from '../screens/legal/TermsScreen';
import { PrivacyScreen } from '../screens/legal/PrivacyScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Intro" component={IntroScreen} />
        <Stack.Screen name="OnboardingMotivation" component={MotivationScreen} />
        <Stack.Screen name="OnboardingScript" component={ScriptScreen} />
        <Stack.Screen name="OnboardingDailyGoal" component={DailyGoalScreen} />
        <Stack.Screen name="OnboardingNotifications" component={NotificationsScreen} />
        <Stack.Screen name="OnboardingAccount" component={AccountPromptScreen} />
        <Stack.Screen name="OnboardingStreakGoal" component={StreakGoalScreen} />
        <Stack.Screen name="PathChoose" component={PathChooseScreen} />
        <Stack.Screen name="PlacementIntro" component={PlacementIntroScreen} />
        <Stack.Screen name="PlacementTest" component={PlacementTestScreen} />
        <Stack.Screen name="PlacementResults" component={PlacementResultsScreen} />
        <Stack.Screen name="Celebration" component={CelebrationScreen} />
        <Stack.Screen name="AuthLogin" component={LoginScreen} />
        <Stack.Screen name="AuthRegister" component={RegisterScreen} />
        <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetCode" component={ResetCodeScreen} />
        <Stack.Screen name="NewPassword" component={NewPasswordScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="SurahLevels" component={SurahLevelsScreen} />
        <Stack.Screen name="LessonStart" component={LessonStartScreen} />
        <Stack.Screen name="LessonSession" component={LessonSessionScreen} />
        <Stack.Screen
          name="LessonComplete"
          component={LessonCompleteScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="StreakModal"
          component={StreakModalScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="Terms" component={TermsScreen} />
        <Stack.Screen name="Privacy" component={PrivacyScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

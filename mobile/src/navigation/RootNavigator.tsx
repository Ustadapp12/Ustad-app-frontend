import React, { useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import type { NavigationContainerRef } from '@react-navigation/native';
import { logScreenView } from '../services/analytics';
import type { RootStackParamList } from './types';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SplashScreen } from '../screens/startup/SplashScreen';
import { WelcomeScreen } from '../screens/startup/WelcomeScreen';
import { IntroScreen } from '../screens/startup/IntroScreen';
import { MotivationScreen } from '../screens/onboarding/MotivationScreen';
import { ScriptScreen } from '../screens/onboarding/ScriptScreen';
import { DailyGoalScreen } from '../screens/onboarding/DailyGoalScreen';
import { RecitationLevelScreen } from '../screens/onboarding/RecitationLevelScreen';
import { StreakGoalScreen } from '../screens/onboarding/StreakGoalScreen';
import { StreakDay1Screen } from '../screens/onboarding/StreakDay1Screen';
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
import { StageIntroScreen } from '../screens/lesson/StageIntroScreen';
import { LessonSessionScreen } from '../screens/lesson/LessonSessionScreen';
import { LessonCompleteScreen } from '../screens/lesson/LessonCompleteScreen';
import { StreakModalScreen } from '../screens/gamification/StreakModalScreen';
import { TermsScreen } from '../screens/legal/TermsScreen';
import { PrivacyScreen } from '../screens/legal/PrivacyScreen';
const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const routeNameRef = useRef<string | undefined>(undefined);

  const onNavReady = () => {
    const name = navigationRef.current?.getCurrentRoute()?.name;
    routeNameRef.current = name;
    if (name) void logScreenView(name);
  };

  const onNavStateChange = () => {
    const previous = routeNameRef.current;
    const current = navigationRef.current?.getCurrentRoute()?.name;
    if (current && current !== previous) {
      void logScreenView(current);
    }
    routeNameRef.current = current;
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={onNavReady}
      onStateChange={onNavStateChange}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Intro" component={IntroScreen} />
        <Stack.Screen name="OnboardingMotivation" component={MotivationScreen} />
        <Stack.Screen name="OnboardingScript" component={ScriptScreen} />
        <Stack.Screen name="OnboardingDailyGoal" component={DailyGoalScreen} />
        <Stack.Screen name="RecitationLevel" component={RecitationLevelScreen} />
        <Stack.Screen name="OnboardingStreakGoal" component={StreakGoalScreen} />
        <Stack.Screen name="StreakDay1" component={StreakDay1Screen} />
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
        <Stack.Screen name="StageIntro" component={StageIntroScreen} />
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

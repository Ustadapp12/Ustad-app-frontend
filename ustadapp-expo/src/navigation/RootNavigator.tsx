import React, { useEffect, Suspense, lazy } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import SplashScreen from '../screens/startup/SplashScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Only Splash is on-screen at first paint, so it's the only screen imported
// eagerly. Every other screen (~1560 combined lines across Login/SignUp/
// Onboard*/Streak/LessonStart/LessonSummary, plus MainTabs pulling in
// MapScreen ~1400 lines + 24 asset requires, and LessonSessionScreen
// ~2600 lines) was being statically imported and evaluated before Splash's
// first frame even though none of them are reachable until well after the
// user has seen Splash. Deferring all of them with React.lazy cuts that
// startup cost down to just what Splash itself needs.
const LoginScreen = lazy(() => import('../screens/auth/LoginScreen'));
const SignUpScreen = lazy(() => import('../screens/auth/SignUpScreen'));
const OnboardGoalScreen = lazy(() => import('../screens/onboarding/OnboardGoalScreen'));
const OnboardPathScreen = lazy(() => import('../screens/onboarding/OnboardPathScreen'));
const OnboardScriptScreen = lazy(() => import('../screens/onboarding/OnboardScriptScreen'));
const StreakScreen = lazy(() => import('../screens/gamification/StreakScreen'));
const LessonStartScreen = lazy(() => import('../screens/lesson/LessonStartScreen'));
const LessonSummaryScreen = lazy(() => import('../screens/lesson/LessonSummaryScreen'));
const MainTabs = lazy(() => import('./MainTabs'));
const LessonSessionScreen = lazy(() => import('../screens/lesson/LessonSessionScreen'));

function withSuspense<P extends object>(LazyComponent: React.LazyExoticComponent<React.ComponentType<P>>) {
  return function SuspendedScreen(props: P) {
    return (
      <Suspense fallback={null}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}
const LoginScreenLazy = withSuspense(LoginScreen);
const SignUpScreenLazy = withSuspense(SignUpScreen);
const OnboardGoalScreenLazy = withSuspense(OnboardGoalScreen);
const OnboardPathScreenLazy = withSuspense(OnboardPathScreen);
const OnboardScriptScreenLazy = withSuspense(OnboardScriptScreen);
const StreakScreenLazy = withSuspense(StreakScreen);
const LessonStartScreenLazy = withSuspense(LessonStartScreen);
const LessonSummaryScreenLazy = withSuspense(LessonSummaryScreen);
const MainTabsLazy = withSuspense(MainTabs);
const LessonSessionScreenLazy = withSuspense(LessonSessionScreen);

export default function RootNavigator() {
  const hydrate = useAuthStore(s => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false, animation: 'fade' }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreenLazy} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="SignUp" component={SignUpScreenLazy} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="OnboardGoal" component={OnboardGoalScreenLazy} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="OnboardPath" component={OnboardPathScreenLazy} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="OnboardScript" component={OnboardScriptScreenLazy} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="MainTabs" component={MainTabsLazy} options={{ animation: 'fade' }} />
        <Stack.Screen
          name="Streak"
          component={StreakScreenLazy}
          options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
        />
        <Stack.Screen name="LessonStart"    component={LessonStartScreenLazy}   options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="LessonSession"  component={LessonSessionScreenLazy}  options={{ animation: 'slide_from_right', gestureEnabled: false }} />
        <Stack.Screen name="LessonComplete" component={LessonSummaryScreenLazy} options={{ animation: 'fade' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}


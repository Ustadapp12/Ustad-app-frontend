import React, { useEffect, Suspense, lazy } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import SplashScreen from '../screens/startup/SplashScreen';
import { navigationRef } from './navigationRef';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Only Splash is on-screen at first paint, so it's the only screen imported
// eagerly. Every other screen (~1560 combined lines across Login/SignUp/
// Onboard*/Streak/LessonSummary, plus MainTabs pulling in
// MapScreen ~1400 lines + 24 asset requires, and LessonSessionScreen
// ~2600 lines) was being statically imported and evaluated before Splash's
// first frame even though none of them are reachable until well after the
// user has seen Splash. Deferring all of them with React.lazy cuts that
// startup cost down to just what Splash itself needs.
const LoginScreen = lazy(() => import('../screens/auth/LoginScreen'));
const SignUpScreen = lazy(() => import('../screens/auth/SignUpScreen'));
const VerifyEmailScreen = lazy(() => import('../screens/auth/VerifyEmailScreen'));
const ForgotPasswordScreen = lazy(() => import('../screens/auth/ForgotPasswordScreen'));
const VerifyResetCodeScreen = lazy(() => import('../screens/auth/VerifyResetCodeScreen'));
const ResetPasswordScreen = lazy(() => import('../screens/auth/ResetPasswordScreen'));
const OnboardAgeScreen = lazy(() => import('../screens/onboarding/OnboardAgeScreen'));
const OnboardGenderScreen = lazy(() => import('../screens/onboarding/OnboardGenderScreen'));
const OnboardWelcomeScreen = lazy(() => import('../screens/onboarding/OnboardWelcomeScreen'));
const OnboardGoalScreen = lazy(() => import('../screens/onboarding/OnboardGoalScreen'));
const OnboardScriptScreen = lazy(() => import('../screens/onboarding/OnboardScriptScreen'));
const OnboardPathScreen = lazy(() => import('../screens/onboarding/OnboardPathScreen'));
const OnboardAssessmentScreen = lazy(() => import('../screens/onboarding/OnboardAssessmentScreen'));
const StreakScreen = lazy(() => import('../screens/gamification/StreakScreen'));
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
const VerifyEmailScreenLazy = withSuspense(VerifyEmailScreen);
const ForgotPasswordScreenLazy = withSuspense(ForgotPasswordScreen);
const VerifyResetCodeScreenLazy = withSuspense(VerifyResetCodeScreen);
const ResetPasswordScreenLazy = withSuspense(ResetPasswordScreen);
const OnboardAgeScreenLazy = withSuspense(OnboardAgeScreen);
const OnboardGenderScreenLazy = withSuspense(OnboardGenderScreen);
const OnboardWelcomeScreenLazy = withSuspense(OnboardWelcomeScreen);
const OnboardGoalScreenLazy = withSuspense(OnboardGoalScreen);
const OnboardScriptScreenLazy = withSuspense(OnboardScriptScreen);
const OnboardPathScreenLazy = withSuspense(OnboardPathScreen);
const OnboardAssessmentScreenLazy = withSuspense(OnboardAssessmentScreen);
const StreakScreenLazy = withSuspense(StreakScreen);
const LessonSummaryScreenLazy = withSuspense(LessonSummaryScreen);
const MainTabsLazy = withSuspense(MainTabs);
const LessonSessionScreenLazy = withSuspense(LessonSessionScreen);

export default function RootNavigator() {
  const hydrate = useAuthStore(s => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false, animation: 'fade',
          // react-native-screens defaults each screen's native container to
          // white until the JS content paints over it — on cold start that
          // shows as a white flash between the native (SplashTheme) splash
          // and this Splash screen's own dark background.
          contentStyle: { backgroundColor: '#0D1B2A' },
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreenLazy} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="SignUp" component={SignUpScreenLazy} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="VerifyEmail" component={VerifyEmailScreenLazy} options={{ animation: 'slide_from_right', gestureEnabled: false }} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreenLazy} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="VerifyResetCode" component={VerifyResetCodeScreenLazy} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreenLazy} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="OnboardAge" component={OnboardAgeScreenLazy} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="OnboardGender" component={OnboardGenderScreenLazy} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="OnboardWelcome" component={OnboardWelcomeScreenLazy} options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="OnboardGoal" component={OnboardGoalScreenLazy} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="OnboardScript" component={OnboardScriptScreenLazy} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="OnboardPath" component={OnboardPathScreenLazy} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="OnboardAssessment" component={OnboardAssessmentScreenLazy} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="MainTabs" component={MainTabsLazy} options={{ animation: 'fade' }} />
        <Stack.Screen
          name="Streak"
          component={StreakScreenLazy}
          options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
        />
        <Stack.Screen name="LessonSession"  component={LessonSessionScreenLazy}  options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="LessonComplete" component={LessonSummaryScreenLazy} options={{ animation: 'fade' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}


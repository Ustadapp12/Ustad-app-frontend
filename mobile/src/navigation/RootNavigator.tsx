import React, { useEffect, useRef } from 'react';
import { Alert, BackHandler } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import SplashScreen from '../screens/startup/SplashScreen';
import StreakLostModal from '../components/StreakLostModal';
import { navigationRef } from './navigationRef';
import { logScreenView } from '../services/analytics';
import { recordScreenView } from '../services/screenHistory';
import { setImmersiveMode } from '../utils/responsive';
import { hydrateScriptPreference } from '../utils/storage';
import { stopAudio } from '../services/audioPlayer';
import type { RootStackParamList } from './types';

// Every screen is imported statically and deliberately so — do NOT put these
// back behind React.lazy/Suspense.
//
// The startup cost that motivated lazy-loading them is already handled one
// level down: metro.config.js sets `inlineRequires: true`, which (per its own
// comment) "makes every require()/import lazy by default … not just the
// handful of screens manually wrapped in React.lazy". So these imports do not
// actually evaluate MapScreen/LessonSessionScreen at Splash's first frame —
// they evaluate on first use, which is exactly what the lazy wrappers were
// for. The wrappers bought nothing on top of that.
//
// What they did cost: a Suspense fallback of `null` inside a native-stack
// screen renders no content at all, so the navigator's own `contentStyle`
// (#0D1B2A) is what's on screen until the import resolves and a re-render
// lands. Metro does resolve these correctly in a release bundle (its
// asyncRequire falls back to a synchronous `importAll` when no
// `__loadBundleAsync` loader is registered, which is the case in this bare RN
// setup — verified by inspecting a release bundle), so this was never an
// outright hang. But it is a whole extra async hop, and a blank-screen window,
// bought for a startup win that inlineRequires already delivers.
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import VerifyEmailScreen from '../screens/auth/VerifyEmailScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import VerifyResetCodeScreen from '../screens/auth/VerifyResetCodeScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import OnboardUsernameScreen from '../screens/onboarding/OnboardUsernameScreen';
import OnboardAgeScreen from '../screens/onboarding/OnboardAgeScreen';
import OnboardGenderScreen from '../screens/onboarding/OnboardGenderScreen';
import OnboardWelcomeScreen from '../screens/onboarding/OnboardWelcomeScreen';
import OnboardGoalScreen from '../screens/onboarding/OnboardGoalScreen';
import OnboardScriptScreen from '../screens/onboarding/OnboardScriptScreen';
import OnboardPathScreen from '../screens/onboarding/OnboardPathScreen';
import OnboardAssessmentScreen from '../screens/onboarding/OnboardAssessmentScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import ChangePasswordScreen from '../screens/profile/ChangePasswordScreen';
import FeedbackScreen from '../screens/feedback/FeedbackScreen';
import StreakScreen from '../screens/gamification/StreakScreen';
import XPScreen from '../screens/gamification/XPScreen';
import StreakCelebrationScreen from '../screens/gamification/StreakCelebrationScreen';
import StreakRepairProgressScreen from '../screens/gamification/StreakRepairProgressScreen';
import GuestStreakPitchScreen from '../screens/gamification/GuestStreakPitchScreen';
import LessonSummaryScreen from '../screens/lesson/LessonSummaryScreen';
import MainTabs from './MainTabs';
import LessonSessionScreen from '../screens/lesson/LessonSessionScreen';
import TourLessonScreen from '../screens/tour/TourLessonScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const hydrate = useAuthStore(s => s.hydrate);
  const streakJustLost = useAuthStore(s => s.streakJustLost);
  const clearStreakJustLost = useAuthStore(s => s.clearStreakJustLost);

  useEffect(() => {
    void hydrate();
    // The user's Arabic-script choice (Profile > font) is written to
    // AsyncStorage by setScriptPreference (utils/storage.ts) the moment they
    // change it, and useScriptStore is updated in the same call so a font
    // switch is instant for the rest of that session -- but the store itself
    // holds no persistence of its own (create<ScriptState> with no persist
    // middleware, seeded 'uthmani' every time the module re-evaluates). On a
    // cold start nothing ever read the saved value back in, so every fresh
    // launch silently reverted to uthmani/Naskh regardless of what was
    // chosen, and the choice looked "reset" rather than saved. This is the
    // one missing read -- hydrateScriptPreference() itself already existed,
    // fully correct, and pushes straight into useScriptStore; it was simply
    // never called from anywhere.
    void hydrateScriptPreference();
  }, [hydrate]);

  // App-wide, set once at mount — not toggled per-screen. Swipe-from-edge
  // still reveals the system nav bar temporarily (Android's own
  // BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE, auto-hides again on its own);
  // this never removes the user's access to it, just the persistent bar.
  useEffect(() => {
    setImmersiveMode(true);
  }, []);

  // Hardware back only ever reaches here when the root stack itself has
  // nothing left to pop to (any screen with its own confirm — e.g.
  // LessonSessionScreen's exit-lesson prompt — intercepts back before this
  // fires, since BackHandler calls listeners most-recently-added-first and
  // stops at the first one returning true). At that point Android's default
  // behavior would exit the app immediately with no confirmation — ask first.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (navigationRef.current?.canGoBack()) return false;
      Alert.alert('Exit app', 'Do you want to close the app?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Exit', style: 'destructive', onPress: () => BackHandler.exitApp() },
      ]);
      return true;
    });
    return () => sub.remove();
  }, []);

  // Screen-view tracking — logScreenView() itself has existed in analytics.ts
  // since it shipped, but nothing ever called it. Tracks the leaf route only
  // (React Navigation resolves getCurrentRoute() through nested navigators
  // like MainTabs' bottom tabs), and only on an actual route-name change —
  // onStateChange also fires for in-place param updates on the same screen.
  const routeNameRef = useRef<string | undefined>(undefined);

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        routeNameRef.current = navigationRef.getCurrentRoute()?.name;
        if (routeNameRef.current) {
          void logScreenView(routeNameRef.current);
          recordScreenView(routeNameRef.current);
        }
      }}
      onStateChange={() => {
        const previousRouteName = routeNameRef.current;
        const currentRouteName = navigationRef.getCurrentRoute()?.name;
        if (currentRouteName && currentRouteName !== previousRouteName) {
          void logScreenView(currentRouteName);
          recordScreenView(currentRouteName);
          // Global backstop, not a replacement for LessonSessionScreen's own
          // activeExerciseId guard (which still stops audio the instant one
          // exercise swaps for the next, without waiting on a route change).
          // This is the layer above it: whichever screen requested audio,
          // leaving that SCREEN entirely -- not just moving to the next
          // exercise within it -- must be an absolute guarantee that nothing
          // still-loading from it can surface later. See stopAudio's own
          // comment (services/audioPlayer.ts) for the incident this closes:
          // several taps' worth of stalled network audio loads all finishing
          // at once, minutes later, and playing on whatever screen the user
          // had since moved to. This is what makes "only play audio if I'm
          // still on that page" true everywhere, not just inside a lesson.
          stopAudio();
        }
        routeNameRef.current = currentRouteName;
      }}
    >
      {streakJustLost !== null && (
        <StreakLostModal priorStreak={streakJustLost} onDismiss={clearStreakJustLost} />
      )}
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
        <Stack.Screen name="Login" component={LoginScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="SignUp" component={SignUpScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{ animation: 'slide_from_right', gestureEnabled: false }} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="VerifyResetCode" component={VerifyResetCodeScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="OnboardUsername" component={OnboardUsernameScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="OnboardAge" component={OnboardAgeScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="OnboardGender" component={OnboardGenderScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="OnboardWelcome" component={OnboardWelcomeScreen} options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="OnboardGoal" component={OnboardGoalScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="OnboardScript" component={OnboardScriptScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="OnboardPath" component={OnboardPathScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="OnboardAssessment" component={OnboardAssessmentScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ animation: 'fade' }} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Feedback" component={FeedbackScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="GuidedTour" component={TourLessonScreen} options={{ animation: 'slide_from_right', gestureEnabled: false }} />
        <Stack.Screen
          name="Streak"
          component={StreakScreen}
          options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
        />
        <Stack.Screen
          name="XP"
          component={XPScreen}
          options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
        />
        <Stack.Screen name="StreakCelebration" component={StreakCelebrationScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="StreakRepairProgress" component={StreakRepairProgressScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="GuestStreakPitch" component={GuestStreakPitchScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="LessonSession"  component={LessonSessionScreen}  options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="LessonComplete" component={LessonSummaryScreen} options={{ animation: 'fade' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}


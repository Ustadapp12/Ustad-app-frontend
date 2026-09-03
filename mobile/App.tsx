import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initAnalytics } from './src/services/analytics';
import { syncDeviceTimezone } from './src/api';
import { abandonActiveLessonSessionSilent } from './src/services/lessonSession';
import { startUsageSession, endUsageSession } from './src/services/usageSession';
import { useAuthStore } from './src/store/authStore';
import { useLessonStore } from './src/store/lessonStore';
import RootNavigator from './src/navigation/RootNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import AndroidKeyboardDoneBar from './src/components/AndroidKeyboardDoneBar';

const LEARNING_ME_POLL_MS = 60_000;

function App() {
  useEffect(() => {
    void initAnalytics();
  }, []);

  useEffect(() => {
    // Starts the first usage session once a user exists — covers both a
    // fresh hydrate() on cold start and a fresh login/register/guest call.
    // A returning-from-background restart is handled by the AppState effect
    // below, once the prior session has actually been ended there.
    if (useAuthStore.getState().user) void startUsageSession();
    const unsub = useAuthStore.subscribe((state, prevState) => {
      if (state.user && !prevState.user) void startUsageSession();
      if (!state.user && prevState.user) void endUsageSession();
    });
    return unsub;
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      // Skip while backgrounded or mid-lesson — this poll has no reason to
      // compete with an in-flight recitation upload or run at all while the
      // user isn't looking at the app.
      if (AppState.currentState !== 'active') return;
      if (useLessonStore.getState().sessionId) return;
      const { user } = useAuthStore.getState();
      if (user) {
        void useAuthStore.getState().refreshLearning();
      }
    }, LEARNING_ME_POLL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // Momentary transitions to 'background'/'inactive' — the mic permission
    // dialog, pulling the notification shade, a call banner, the app
    // switcher — must NOT kill an in-progress lesson session. Only abandon
    // if the app stays away for a real amount of time without coming back.
    const ABANDON_GRACE_MS = 60_000;
    let graceTimer: ReturnType<typeof setTimeout> | null = null;
    let wasBackgrounded = false;

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        if (graceTimer) { clearTimeout(graceTimer); graceTimer = null; }
        // Re-sync the device timezone on a real background→active return —
        // users travel, and their streak day boundary should follow them.
        if (wasBackgrounded) {
          wasBackgrounded = false;
          if (useAuthStore.getState().user) {
            void syncDeviceTimezone();
            void useAuthStore.getState().refreshLearning({ force: true });
            void startUsageSession();
          }
        }
        return;
      }
      if ((state === 'background' || state === 'inactive') && !wasBackgrounded) {
        wasBackgrounded = true;
        // End the usage session right away instead of deferring it into the
        // setTimeout below — a JS timer scheduled while backgrounded is not
        // reliable in React Native (the engine gets throttled/suspended once
        // the app actually leaves the foreground), so a delayed
        // endUsageSession() call here almost never fires in practice, which
        // left duration_s/last_screen NULL on nearly every real session. A
        // quick app-switcher glance now produces two short session rows
        // instead of one merged row, but that beats losing the data outright.
        void endUsageSession();
        graceTimer = setTimeout(() => {
          abandonActiveLessonSessionSilent();
          graceTimer = null;
        }, ABANDON_GRACE_MS);
      }
    });
    return () => {
      sub.remove();
      if (graceTimer) clearTimeout(graceTimer);
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <RootNavigator />
          <AndroidKeyboardDoneBar />
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;

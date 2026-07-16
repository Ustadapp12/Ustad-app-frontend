import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initAnalytics } from './src/services/analytics';
import { abandonActiveLessonSessionSilent } from './src/services/lessonSession';
import { useAuthStore } from './src/store/authStore';
import { useLessonStore } from './src/store/lessonStore';
import RootNavigator from './src/navigation/RootNavigator';

const LEARNING_ME_POLL_MS = 60_000;

function App() {
  useEffect(() => {
    void initAnalytics();
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

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        if (graceTimer) { clearTimeout(graceTimer); graceTimer = null; }
        return;
      }
      if ((state === 'background' || state === 'inactive') && !graceTimer) {
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
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;

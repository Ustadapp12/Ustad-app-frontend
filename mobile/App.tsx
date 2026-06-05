import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initAnalytics } from './src/services/analytics';
import { abandonActiveLessonSessionSilent } from './src/services/lessonSession';
import { useAuthStore } from './src/store/authStore';
import { RootNavigator } from './src/navigation/RootNavigator';

const LEARNING_ME_POLL_MS = 60_000;

function App() {
  useEffect(() => {
    void initAnalytics();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const { user } = useAuthStore.getState();
      if (user) {
        void useAuthStore.getState().refreshLearning();
      }
    }, LEARNING_ME_POLL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'background' || state === 'inactive') {
        abandonActiveLessonSessionSilent();
      }
    });
    return () => sub.remove();
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

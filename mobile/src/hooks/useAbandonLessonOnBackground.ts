import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  abandonActiveLessonSessionSilent,
  clearPendingLessonSession,
} from '../services/lessonSession';
import { useLessonStore } from '../store/lessonStore';

/**
 * POST /learning/sessions/abandon-active when the app backgrounds or becomes inactive.
 */
export function useAbandonLessonOnBackground() {
  const sessionId = useLessonStore(s => s.sessionId);
  const result = useLessonStore(s => s.result);
  const reset = useLessonStore(s => s.reset);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!sessionId || result) return;

    const endSession = () => {
      const state = useLessonStore.getState();
      if (!state.sessionId || state.result || busyRef.current) return;
      busyRef.current = true;
      abandonActiveLessonSessionSilent();
      void clearPendingLessonSession();
      reset();
      busyRef.current = false;
    };

    const onChange = (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        endSession();
      }
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [sessionId, result, reset]);
}

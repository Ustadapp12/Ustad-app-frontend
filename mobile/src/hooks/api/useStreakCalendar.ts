import { useEffect, useState } from 'react';
import { learningApi } from '../../api';
import type { StreakCalendar } from '../../types/api';

/** The learner's per-day practice history for the streak calendar, or null
 * until it loads (and if it fails: the calendar section just doesn't render).
 * Moved out of StreakScreen (2026-10-22). */
export function useStreakCalendar(): StreakCalendar | null {
  const [calendar, setCalendar] = useState<StreakCalendar | null>(null);
  useEffect(() => {
    let cancelled = false;
    learningApi.streakCalendar()
      .then(data => { if (!cancelled) setCalendar(data); })
      .catch(() => { /* leave null */ });
    return () => { cancelled = true; };
  }, []);
  return calendar;
}

import { useEffect, useState } from 'react';
import { checkStreakFrozenPopup } from '../../../utils/streak';
import type { LearningMe } from '../../../types/api';

// "You opened the map and your streak is frozen" — shown once per freeze
// occurrence (see checkStreakFrozenPopup's AsyncStorage-backed gate), not
// once per map visit. Re-checks whenever streak_state changes under this
// screen (a poll/foreground refresh can flip it while the map stays open),
// not just on first mount.
export function useStreakFrozenPopup(learning: LearningMe | null) {
  const [frozenPopupVisible, setFrozenPopupVisible] = useState(false);
  // Only the state itself, not the whole learning object (a new one arrives
  // on every poll). null until learning has loaded.
  const streakState = learning ? (learning.streak_state ?? 'active') : null;
  useEffect(() => {
    if (!streakState) return;
    void (async () => {
      const shouldShow = await checkStreakFrozenPopup(streakState);
      if (shouldShow) setFrozenPopupVisible(true);
    })();
  }, [streakState]);
  return [frozenPopupVisible, setFrozenPopupVisible] as const;
}

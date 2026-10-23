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
  useEffect(() => {
    if (!learning) return;
    void (async () => {
      const shouldShow = await checkStreakFrozenPopup(learning.streak_state ?? 'active');
      if (shouldShow) setFrozenPopupVisible(true);
    })();
  }, [learning?.streak_state]);
  return [frozenPopupVisible, setFrozenPopupVisible] as const;
}

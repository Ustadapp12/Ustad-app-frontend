import { useCallback, useState } from 'react';
import { leaderboardApi } from '../../api';
import type { LeaderboardEntry } from '../../types/api';

/** The leaderboard's top entries and the learner's own standing. `load`
 * fetches (silently keeps the current list on screen when `silent`); the
 * screen decides when. Moved out of LeaderboardScreen (2026-10-22). */
export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [me, setMe] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(false);
    try {
      const data = await leaderboardApi.top();
      setEntries(data.entries);
      setMe(data.me ?? null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  return { entries, me, loading, error, load };
}

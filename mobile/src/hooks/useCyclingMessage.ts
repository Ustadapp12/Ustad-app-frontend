import { useEffect, useState } from 'react';

/**
 * Cycles through `messages` on an interval while `active` is true — used for
 * loading overlays on requests slow enough (cold-started backend) that a
 * single static "Loading…" reads as frozen. Resets to the first message each
 * time `active` goes false→true so a fresh attempt always starts the story
 * from the beginning. Holds on the last message unless `loop` is true
 * (the map's loading screen loops; user, 2026-10-22).
 */
export function useCyclingMessage(
  active: boolean,
  messages: readonly string[],
  intervalMs = 1800,
  loop = false,
): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setIndex(i => (i + 1 < messages.length ? i + 1 : loop ? 0 : i));
    }, intervalMs);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, intervalMs, loop]);

  return messages[index] ?? messages[0];
}

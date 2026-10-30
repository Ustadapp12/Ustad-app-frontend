/**
 * Listener for an Animated.Value that counts a shown number up to `target`.
 *
 * The count-ups on Lesson Complete and the streak celebration are JS-driven
 * (a listener calling setState), and a plain listener fires every frame, so a
 * big XP or streak number re-rendered the whole screen about 60 times a second
 * (review A-10). This passes a new number on at most once per `minIntervalMs`,
 * except the final value, which always lands at once so the count ends on the
 * exact total.
 */
export function throttledCountUpListener(
  target: number,
  setShown: (n: number) => void,
  minIntervalMs = 100,
): (state: { value: number }) => void {
  const end = Math.round(target);
  let lastShown: number | null = null;
  let lastAt = 0;
  return ({ value }) => {
    const n = Math.round(value);
    if (n === lastShown) return;
    const now = Date.now();
    if (n !== end && now - lastAt < minIntervalMs) return;
    lastShown = n;
    lastAt = now;
    setShown(n);
  };
}

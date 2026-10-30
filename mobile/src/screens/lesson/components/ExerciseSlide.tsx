import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

// ── Exercise slide-in — mounts fresh (via the `key={exercise.ex_id}` on its
// parent) every time the current exercise changes, so each new exercise
// animates in from the right instead of just popping into place.
//
// This used to start translateX at the full screen `width` (i.e. the new
// exercise's content was mounted completely off-screen) and only kick the
// slide-in animation off from a `useEffect`, which React/RN only runs AFTER
// the first frame has already been committed and painted. That guaranteed at
// least one fully-off-screen frame on every single exercise transition —
// LessonHeader (the X/progress bar/hearts/Hint row) sits outside this
// component as a sibling, so it kept rendering normally while the entire
// exercise body beneath it was blank/white. On iOS that gap was consistently
// visible (reported "goes to a white screen... then it loads again," present
// since the iOS build existed); Android's compositor apparently holds the
// previous frame through the same gap, which is why this never showed up
// there — same JS/animation code, no platform branch, so the discrepancy was
// timing, not logic.
//
// Fixed two ways, together: `useLayoutEffect` instead of `useEffect` so the
// native `.start()` command is queued in the same commit as the view's
// mount (before that first frame is handed to the native side to paint)
// instead of one JS-thread round-trip later; and a much smaller starting
// offset (40px, not a full screen width) so that even if the animation start
// is ever delayed by a frame or two regardless, the exercise content is
// already sitting almost exactly where it belongs instead of fully
// off-screen — worst case a barely-noticeable shift, never a blank screen.
//
// Once the slide ends, the transform is dropped from the style. The native
// driver moves the real view but never tells React's own layout tree, which
// keeps the starting 40px; on the new architecture measureInWindow reads that
// tree, so the guided tour's mic spotlight sat 40px right of the mic for good.
// `onSettled` then fires (after that commit) so the tour measures its targets
// (Check, mic, option) where they really are.
export function ExerciseSlide({ children, onSettled }: { children: React.ReactNode; onSettled?: () => void }) {
  const SLIDE_OFFSET = 40;
  const translateX = useRef(new Animated.Value(SLIDE_OFFSET)).current;
  const [settled, setSettled] = useState(false);
  useLayoutEffect(() => {
    translateX.setValue(SLIDE_OFFSET);
    Animated.timing(translateX, {
      toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start(({ finished }) => { if (finished) setSettled(true); });
  }, [translateX]);
  // Through a ref so a new onSettled from a parent re-render can't fire it twice.
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;
  useEffect(() => { if (settled) onSettledRef.current?.(); }, [settled]);
  return <Animated.View style={settled ? SETTLED : [styles.sliding, { transform: [{ translateX }] }]}>{children}</Animated.View>;
}

const SETTLED = { flex: 1 } as const;

const styles = StyleSheet.create({
  sliding: { flex: 1 },
});

import { useCallback, useEffect, useRef } from 'react';
import { useTourStore } from '../../store/tourStore';
import type { TourTargetKey } from './tourSteps';

/**
 * Publishes the real on-screen box of whatever element this is attached to,
 * so the tour's spotlight can be cut at the element's own coordinates instead
 * of at coordinates inferred from style constants.
 *
 * Usage: `const t = useTourTarget('lessonCheck', 16)` then spread `{...t}`
 * onto the real component (`ref` + `onLayout` together). The second argument
 * is that element's own real corner radius — a dp number taken from its own
 * style (e.g. 16 for EX.continueBtn), or 'round' for anything that should
 * clamp to a full circle/pill (bare wrapper views with no radius of their
 * own, matching the TOUR_GLOW_ROUND already applied to the same element).
 * This is the shape counterpart of the position fix: the hole this feeds is
 * sized and shaped from the target's own declared style, not guessed from
 * its measured aspect ratio.
 *
 * Two triggers, because neither alone is sufficient:
 *
 *  - `onLayout` fires whenever the element is actually laid out or moves as a
 *    result of layout, which covers mount, rotation, font-scale changes and
 *    content reflow. It does NOT fire for transform-driven movement.
 *  - a re-measure when the tour advances, because the lesson's exercise
 *    slides in on a 260ms translateX (see ExerciseSlide in
 *    LessonSessionScreen). That is a transform, so no onLayout accompanies
 *    it. Measuring once on the next frame and again after the animation has
 *    had time to settle catches both the already-static case and the
 *    mid-flight one.
 *
 * There is deliberately no correction term applied to the result. Every
 * consumer of these rects renders in the same native window as the measured
 * element, so raw measureInWindow output already means the same thing on both
 * sides. A previous version added `insets.top` here to reconcile the overlay's
 * separate Modal window; that constant was derived on one device and was pure
 * error on any device whose measureInWindow origin differed.
 */
export function useTourTarget(key: TourTargetKey, radius: number | 'round') {
  // Deliberately untyped: this same ref is attached to a plain View (the HUD
  // pills, the lesson header rows, the tab icon chip). All of them expose
  // measureInWindow, which is all this needs, but they share no common
  // public ref type.
  const ref = useRef<any>(null);
  const setRect = useTourStore(s => s.setRect);
  const active = useTourStore(s => s.active);
  const stepIndex = useTourStore(s => s.stepIndex);

  const measure = useCallback(() => {
    ref.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
      // A zero-sized or off-window measurement means the element is not
      // really laid out yet (or has just unmounted). Publishing that would
      // move the spotlight to the top-left corner, which is worse than
      // leaving the previous good rect in place until the next pass.
      if (width > 0 && height > 0) setRect(key, { x, y, width, height, radius });
    });
  }, [key, radius, setRect]);

  const onLayout = useCallback(() => { measure(); }, [measure]);

  useEffect(() => {
    if (!active) return;
    const raf = requestAnimationFrame(measure);
    // 320ms clears the 260ms slide with margin to spare.
    const settle = setTimeout(measure, 320);
    return () => { cancelAnimationFrame(raf); clearTimeout(settle); };
  }, [active, stepIndex, measure]);

  return { ref, onLayout };
}

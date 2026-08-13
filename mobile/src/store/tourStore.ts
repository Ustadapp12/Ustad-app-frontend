import { create } from 'zustand';
import { TOUR_STEPS } from '../components/tour/tourSteps';
import type { TourTargetKey } from '../components/tour/tourSteps';

export interface TourRect {
  x: number;
  y: number;
  width: number;
  height: number;
  /**
   * The target's own real corner radius: a number of dp, or 'round' for
   * anything that should clamp to a full circle/pill at whatever size it
   * measures (the same effect borderRadius: 999 has on the element itself).
   * Set once per call site to match that element's actual style — see each
   * useTourTarget() call for the value taken from. Never guessed from the
   * rect's aspect ratio: a hint icon and a Check button can both be
   * "roughly square" while wanting completely different hole shapes.
   */
  radius: number | 'round';
}

interface TourState {
  active: boolean;
  stepIndex: number;
  /**
   * Whether the "want a tour?" fork is showing. Lives here rather than as
   * MapScreen local state because the overlay that can re-open it (hardware
   * back on step 1 — see TourOverlay's onExitToOffer) is now hosted in
   * MainTabs, a sibling of the tab bar rather than a child of MapScreen.
   */
  offerVisible: boolean;
  /**
   * Screen-space boxes for the things the tour points at, published by whoever
   * renders them (the map's HUD pills, the real tab icons, the lesson header's
   * hearts, and so on) via useTourTarget.
   *
   * Always measured, never derived: every one of these comes from a
   * measureInWindow on the actual mounted element. Nothing here is computed
   * from a style constant, a screen fraction, or an assumed row split — those
   * all drift the moment a device changes font scale, display size, safe-area
   * insets or bar height, which is exactly the drift the tour's cutouts show.
   *
   * The coordinates are raw measureInWindow output with no correction term.
   * That is only sound because the overlay renders in the SAME native window
   * as these targets (see TourOverlay) — no Modal, so no second window whose
   * origin has to be reconciled with a hand-derived constant.
   */
  rects: Partial<Record<TourTargetKey, TourRect>>;
  start: () => void;
  next: () => void;
  prev: () => void;
  stop: () => void;
  setOfferVisible: (visible: boolean) => void;
  setRect: (key: TourTargetKey, rect: TourRect) => void;
}

/** Sub-pixel jitter between two measures of an element that never moved is
 * normal; republishing on it would loop layout -> store -> render -> layout. */
function sameRect(a: TourRect | undefined, b: TourRect): boolean {
  if (!a) return false;
  return Math.abs(a.x - b.x) < 0.5
    && Math.abs(a.y - b.y) < 0.5
    && Math.abs(a.width - b.width) < 0.5
    && Math.abs(a.height - b.height) < 0.5;
}

export const useTourStore = create<TourState>(set => ({
  active: false,
  stepIndex: 0,
  offerVisible: false,
  rects: {},

  start: () => set({ active: true, stepIndex: 0 }),
  next: () => set(s => ({ stepIndex: Math.min(TOUR_STEPS.length - 1, s.stepIndex + 1) })),
  prev: () => set(s => ({ stepIndex: Math.max(0, s.stepIndex - 1) })),
  // Rects are deliberately kept on stop: the same targets get re-measured on
  // the next run anyway, and clearing them mid-teardown makes the overlay
  // flash an un-spotlit frame on its way out.
  stop: () => set({ active: false, stepIndex: 0 }),

  setOfferVisible: visible => set({ offerVisible: visible }),

  setRect: (key, rect) => set(s => (
    sameRect(s.rects[key], rect) ? s : { rects: { ...s.rects, [key]: rect } }
  )),
}));

import { create } from 'zustand';
import { TOUR_STEPS } from '../components/tour/tourSteps';
import type { TourTargetKey } from '../components/tour/tourSteps';

export interface TourRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TourState {
  active: boolean;
  stepIndex: number;
  /**
   * Screen-space boxes for the things the tour points at, published by whoever
   * renders them (the map's HUD pills, the lesson header's hearts, and so on).
   * Measured rather than hardcoded because they move with safe-area insets,
   * font scale and device width.
   */
  rects: Partial<Record<TourTargetKey, TourRect>>;
  start: () => void;
  next: () => void;
  prev: () => void;
  stop: () => void;
  setRect: (key: TourTargetKey, rect: TourRect) => void;
}

export const useTourStore = create<TourState>(set => ({
  active: false,
  stepIndex: 0,
  rects: {},

  start: () => set({ active: true, stepIndex: 0 }),
  next: () => set(s => ({ stepIndex: Math.min(TOUR_STEPS.length - 1, s.stepIndex + 1) })),
  prev: () => set(s => ({ stepIndex: Math.max(0, s.stepIndex - 1) })),
  // Rects are deliberately kept on stop: the same targets get re-measured on
  // the next run anyway, and clearing them mid-teardown makes the overlay
  // flash an un-spotlit frame on its way out.
  stop: () => set({ active: false, stepIndex: 0 }),

  setRect: (key, rect) => set(s => ({ rects: { ...s.rects, [key]: rect } })),
}));

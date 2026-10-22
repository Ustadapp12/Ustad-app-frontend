import type { TourState } from '../tourStore';

// One exact value per selector; see selectors/auth.ts for why.
export const selectTourActive = (s: TourState) => s.active;
export const selectTourStepIndex = (s: TourState) => s.stepIndex;
export const selectTourRects = (s: TourState) => s.rects;
export const selectTourNext = (s: TourState) => s.next;
export const selectTourPrev = (s: TourState) => s.prev;
export const selectTourStop = (s: TourState) => s.stop;

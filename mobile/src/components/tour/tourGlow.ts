// Tour spotlight styles.
//
// These live here rather than in LessonSessionScreen (where they used to be
// defined and exported from) because MainTabs, MapScreen and MapScreenV2 all
// import TOUR_GLOW, and a single named-constant import was enough to pull the
// whole 179 KB lesson screen into the tab bundle at splash. Nothing here
// imports anything but the palette, so it is free to pull from anywhere.
//
// The glow is applied as a real border on the target element's own view (and
// so follows its real coordinates) instead of a ring drawn on top of it
// elsewhere — see TourOverlay's own comment for why: a drawn ring can
// disagree with the real shape, drift out of sync with a timing race, or
// simply be wrong. Every glow-capable prop at the call sites defaults to
// falsy and is only ever set by TourLessonScreen/TourOfferModal — a normal
// lesson never passes them, so this is invisible outside the tour.
//
// Three variants:
// - TOUR_GLOW has no radius of its own, so it inherits whatever the host
//   element already declares (Check's borderRadius:16, the mic's 54, the
//   feedback sheet's top-only 24) — same pattern EX.optionGlow already used
//   for the pre-picked option, just generalised.
// - TOUR_GLOW_ROUND is for the handful of targets whose ref sits on a bare
//   wrapper View with no shape of its own (the hint icon, the hearts row,
//   the progress slot) — borderRadius: 999 clamps to a perfect circle/pill
//   at whatever size that wrapper actually renders, on any device.
// - TOUR_GLOW_ROUND_THIN is the lighter halo. TOUR_GLOW_ROUND's
//   shadowRadius:10 is a soft blur bigger than the 10px-tall progress bar it
//   is meant to outline, so the gold blur reads as the bar's own color
//   instead of a highlight around a green bar. Every other
//   TOUR_GLOW_ROUND target (hearts row, hint icon) is tall enough that the
//   same blur stays a thin rim; only the progress bar needs this one.
import { colors } from '../../theme/colors';

export const TOUR_GLOW = {
  borderWidth: 2, borderColor: colors.gold,
  shadowColor: colors.gold, shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
  elevation: 8,
} as const;

export const TOUR_GLOW_ROUND = { ...TOUR_GLOW, borderRadius: 999 } as const;

export const TOUR_GLOW_ROUND_THIN = { ...TOUR_GLOW_ROUND, shadowRadius: 3, shadowOpacity: 0.7 } as const;

// Status lines for the "Creating your world" loading screen.

/** Splash: steps through once and holds on the last line (a list that loops
 * back to "Loading" reads as a stuck screen there). */
export const SPLASH_MESSAGES = [
  'Loading…',
  'Creating your world…',
  'Planting the trees…',
  'Preparing your journey…',
  'Almost there…',
] as const;
export const SPLASH_MESSAGE_MS = 3200;

/** Map: loops every 2s while the map is being created (user, 2026-10-22). */
export const MAP_MESSAGES = [
  'Creating your map…',
  'Materializing the world…',
  'Resuming your journey…',
] as const;
export const MAP_MESSAGE_MS = 2000;

/**
 * Small in-memory mirror of the last 2 screens visited, sent up with
 * endUsageSession() for support/debugging ("what were they looking at right
 * before this session ended"). Separate from logScreenView() in
 * analytics.ts — that's Firebase Analytics, this is our own backend's
 * usage_sessions row. Not persisted: a fresh app process starts with both
 * fields undefined, which is correct since there's no prior session to mirror.
 */
let current: string | undefined;
let previous: string | undefined;

export function recordScreenView(screenName: string): void {
  previous = current;
  current = screenName;
}

export function getLastScreens(): { last_screen?: string; previous_screen?: string } {
  return { last_screen: current, previous_screen: previous };
}

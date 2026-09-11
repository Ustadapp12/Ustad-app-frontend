// DRAFT — pending user review before shipping. Per the standing rule (see
// memory feedback_versions_md / feedback-versions-md), every entry here
// must be drafted, then explicitly reviewed and approved by the user,
// BEFORE it goes out in a real build — never auto-published unreviewed,
// even though versions.md (the internal dev log this is drafted from) is
// fine to append immediately after a verified build.
//
// Rewritten from ustadapp/mobile/versions.md into user-facing language and
// grouped by change type — that file is the internal source of truth for
// what actually shipped in each build; this is its public-facing summary,
// not a duplicate of its own dev-detail content.
//
// New entries: append a new ReleaseNoteEntry to the FRONT of the array
// (newest first) once a build is verified, then get it reviewed before the
// next actual release includes it.

export type ReleaseNoteCategory = 'New' | 'Improved' | 'Fixed';

export interface ReleaseNoteChange {
  category: ReleaseNoteCategory;
  text: string;
}

export interface ReleaseNoteEntry {
  version: string;
  date: string; // YYYY-MM-DD
  changes: ReleaseNoteChange[];
}

export const RELEASE_NOTES: ReleaseNoteEntry[] = [
  {
    version: '1.0.29',
    date: '2026-09-11',
    changes: [
      { category: 'Fixed', text: 'Arabic script (Usmani/Indo-Pak) now actually changes the font on iPhone — it could silently stay on the default font before.' },
      { category: 'Fixed', text: 'Reopening the app in the middle of a lesson no longer closes the level after your next answer.' },
      { category: 'Fixed', text: 'Removed a brief white flash between exercise questions on iPhone.' },
      { category: 'New', text: 'Added reminders: a nudge if you haven’t opened the app in a day, and a heads-up right before a streak is about to run out.' },
      { category: 'Improved', text: 'Refreshed the app’s color palette with a softer off-white in place of pure white.' },
    ],
  },
  {
    version: '1.0.28',
    date: '2026-09-01',
    changes: [
      { category: 'Fixed', text: 'The map no longer shows "Continue here" next to a level that still looks locked after reopening the app.' },
      { category: 'New', text: 'Added a feedback button on the map screen.' },
      { category: 'New', text: 'Your app version is now shown on your Profile screen.' },
      { category: 'Improved', text: 'Cleaner, smaller glow around map levels.' },
    ],
  },
  {
    version: '1.0.27',
    date: '2026-09-01',
    changes: [
      { category: 'New', text: 'Added a custom confirmation screen when leaving the app.' },
    ],
  },
  {
    version: '1.0.26',
    date: '2026-09-01',
    changes: [
      { category: 'Fixed', text: 'Removed extra empty space at the bottom of the tab bar.' },
    ],
  },
];

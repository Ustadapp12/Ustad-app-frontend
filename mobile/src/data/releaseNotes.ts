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
    version: '1.0.30',
    date: '2026-09-18',
    changes: [
      { category: 'New', text: 'The whole Quran is now on the map. All 114 surahs, not just the 21 you had before.' },
      { category: 'New', text: 'Search for any surah by name or number from the map, then jump straight to it.' },
      { category: 'New', text: 'Your streak page now has a practice calendar. An orange flame marks every day you practiced, and a blue flame marks a day your streak was frozen.' },
      { category: 'Improved', text: 'Every surah is open from the start. Seasons no longer need to be unlocked.' },
      { category: 'Improved', text: 'Refreshed the streak page with a bigger, warmer streak number and a new look.' },
      { category: 'Improved', text: 'Scrolling the map now closes an open level card instead of leaving it behind.' },
    ],
  },
  {
    version: '1.0.29',
    date: '2026-09-13',
    changes: [
      { category: 'Fixed', text: 'Arabic script (Usmani/Indo-Pak) now actually changes the font on iPhone. It could silently stay on the default font before.' },
      { category: 'Fixed', text: 'Reopening the app in the middle of a lesson no longer closes the level after your next answer.' },
      { category: 'Fixed', text: 'Removed a brief white flash between exercise questions on iPhone.' },
      { category: 'Fixed', text: 'The correct and incorrect answer sound now actually plays on iPhone.' },
      { category: 'Fixed', text: 'The map no longer jumps to the recommended level when you tap something else on it.' },
      { category: 'Fixed', text: 'Text in fill in the blank exercises no longer gets cut off near the edges on some phones.' },
      { category: 'Fixed', text: 'The correct recitation audio no longer keeps playing into your next attempt after Try Again or Next.' },
      { category: 'New', text: 'Added reminders: a nudge if you haven’t opened the app in a day, and a heads-up right before a streak is about to run out.' },
      { category: 'New', text: 'Hold down an answer option to hear it again.' },
      { category: 'New', text: 'Level cards now show an estimated time to finish.' },
      { category: 'Improved', text: 'Refreshed the app’s color palette with a softer off-white in place of pure white.' },
      { category: 'Improved', text: 'Try Again and Next are disabled while recitation audio is playing, and come back automatically once it finishes.' },
      { category: 'Improved', text: 'Slightly less empty space below the tab bar on iPhone.' },
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

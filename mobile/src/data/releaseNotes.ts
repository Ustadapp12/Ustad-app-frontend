// DRAFT — pending user review before shipping. Per the standing rule (see
// memory feedback_versions_md / feedback-versions-md), every entry here
// must be drafted, then explicitly reviewed and approved by the user,
// BEFORE it goes out in a real build — never auto-published unreviewed,
// even though versions.md (the internal dev log this is drafted from) is
// fine to append immediately after a verified build.
//
// Rewritten from ustadapp/mobile/docs/changelog/versions.md into user-facing language and
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
    // Reviewed and approved by the user 2026-10-10, before the build that
    // carries it.
    version: '1.0.36',
    date: '2026-10-10',
    changes: [
      { category: 'New', text: "Search screen redesigned: surahs you've started show your real progress, the rest have a Jump Here shortcut." },
      { category: 'New', text: 'Progress screen redesigned, with your whole Quran progress on top and your surahs split into In Progress and Completed.' },
      { category: 'New', text: 'Fresh lesson look: a reward chest marks the end of the progress bar, a new Hint button, and the exercise sits mid screen with Check always at the bottom.' },
      { category: 'New', text: 'Reward chests are coming soon. Tap one for a sneak peek.' },
      { category: 'Improved', text: 'New back buttons across the app.' },
      { category: 'Improved', text: "Clearer messages when you're offline or we can't be reached, plus a popup if the connection stays too slow." },
      { category: 'Fixed', text: 'The practice calendar arrows are easier to tap.' },
    ],
  },
  {
    // Reviewed and approved by the user 2026-10-07, before the build that
    // carries it — the standing rule, back in force after 1.0.34's one-off
    // exception below.
    version: '1.0.35',
    date: '2026-10-07',
    changes: [
      { category: 'Fixed', text: "The “you're offline” message no longer shows when you are actually online." },
      { category: 'New', text: 'Surah search now shows which surahs are open, done or closed, and asks before you open a new one.' },
      { category: 'Fixed', text: 'The app version shown in your profile is now correct.' },
    ],
  },
  {
    // Shipped WITHOUT the usual pre-release review: the user explicitly
    // chose "draft it and ship without review" for this build (2026-10-03),
    // overriding the standing rule above for this entry only. Treat the rule
    // as still in force for the next one.
    version: '1.0.34',
    date: '2026-10-03',
    changes: [
      { category: 'New', text: 'You can now sign in with your Apple ID.' },
      { category: 'Improved', text: 'The app is a lot lighter to download and opens faster.' },
      { category: 'Improved', text: 'Animations are smoother and no longer run in the background, so the app uses less battery.' },
      { category: 'New', text: 'Lumo now sits reading the Quran on the Daily Quests screen.' },
    ],
  },
  {
    // Approved by the user 2026-09-30.
    version: '1.0.33',
    date: '2026-09-30',
    changes: [
      { category: 'New', text: 'A Progress button on the map shows how far you are in every surah, with a bar for each one. Tap a surah to jump straight to your next level.' },
      { category: 'Improved', text: 'Stars now match your accuracy: 3 stars for a perfect lesson, 2 stars for 66% or more.' },
      { category: 'Fixed', text: 'Mistakes now always count toward your accuracy, including on review levels.' },
      { category: 'Improved', text: 'The Search button on the map is bigger and sits neatly under your streak.' },
      { category: 'Fixed', text: 'The mountains on the map show in full and sit cleanly on the grass.' },
      { category: 'Fixed', text: 'The streak counter on the map no longer stretches out of shape.' },
      { category: 'Improved', text: 'The leaderboard now shows illustrated characters instead of emoji.' },
      { category: 'Improved', text: 'If you lose connection, the app shows a clear offline message and keeps you signed in.' },
    ],
  },
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

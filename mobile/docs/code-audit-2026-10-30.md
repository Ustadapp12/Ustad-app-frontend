# Code cleanliness audit, 30 Oct 2026

Scope: `ustadapp/mobile` (`src/`, `App.tsx`, `index.js`, `__tests__/`, `assets/`, `package.json`). 304 TS/TSX files, 29,739 lines.
Read only. Nothing was changed.

> **31 Oct:** sections 1a-1f (except the parked items), 3 (speak exercises) and the inline-style and
> hook-dependency parts of 4 are done. See [`changelog/changes-2026-10-31.md`](changelog/changes-2026-10-31.md).

## How it was checked

| Check | Tool | Result |
|---|---|---|
| Types compile | `tsc --noEmit` | **0 errors** |
| Unused locals / params | `tsc` with `noUnusedLocals` + `noUnusedParameters` | 5 hits |
| Lint | `eslint src App.tsx index.js` | 341 problems (38 errors, 303 warnings) |
| Files nothing imports | custom import graph walked from `index.js` | 11 files |
| Exports nobody uses | same graph, then a whole-word search of `src/` | 37 names used nowhere at all |
| Unused style keys | custom scan of every `StyleSheet` against its consumers | 71 keys (45 old-map + 26 elsewhere) |
| Commented-out code | regex scan of `//` and `/* */` blocks | 2 blocks |
| Unused npm packages | `depcheck` + manual check of `ios/` and `android/` | 2 real |
| Unused images / Lottie | every file in `assets/` and every key in `src/assets/index.ts` | **0** |
| Function length | TypeScript AST, every function | 35 functions over 120 lines |
| Tests | `jest --ci` | **107 / 107 pass** (one open-handle warning) |

---

## 1. Dead code

### 1a. Whole files nothing in the app imports (11 files, 745 lines)

Not bundled into the app at all.

| File | Lines | What it is | History / recommendation |
|---|---|---|---|
| `src/screens/help/HelpScreen.tsx` | 163 | FAQ screen with Lumo | Not registered in any navigator. A full, built screen just not reachable. **Your call: wire it into Profile, or delete.** |
| `src/screens/comingSoon/BuildingTabScreen.tsx` | 13 | Old star-tab placeholder | Replaced by `PrayScreen` on 20 Oct. The changelog says "left in place". Delete. |
| `src/screens/home/map2/art/BackButtonArt.tsx` | 18 | SVG back arrow | Replaced on 20 Oct. Delete. |
| `src/screens/home/map2/art/IconBuildingBookArt.tsx` | 18 | SVG book icon | Replaced on 20 Oct. Delete. |
| `src/services/reciters.ts` | 32 | Reciter list loader | Part of an unfinished reciter picker. The whole chain is dead: `contentCache.getCachedReciters/setCachedReciters` and `storage.getReciterId/setReciterId`. |
| `src/utils/surahDisplay.ts` | 53 | Tashkeel surah titles for Juz 30 | Nothing calls it. Delete, or keep it if the titles are wanted later. |
| `src/utils/surahCatalog.ts` | 34 | MVP catalog merge | MVP-only scope is gone (all 114 surahs are live). Delete. |
| `src/constants/mvp.ts` | 21 | MVP surah list | Used only by `surahCatalog.ts` (dead) and `__tests__/mvp.test.ts`. |
| `src/data/placementQuestions.ts` | 172 | Placement quiz content | **Parked by you on 7 Jul** ("discuss roadmap fit first"). Only a test uses it. |
| `src/i18n/copy.ts` | 208 | Central copy strings (i18n) | **Parked by you on 7 Jul.** Never imported. |
| `src/utils/ayahId.ts` | 13 | Ayah id formatter | Only its own test uses it. |

### 1b. Old map leftovers inside `screens/home/map/` (biggest single item)

The old map screen was deleted on 22 Oct, but `Map2Screen` still imports its helpers. The helpers it actually needs (`useMapData`, `levelLaunch`, `trustedLevels`, `SURAH_TO_SEASON`, `LevelActionCard`, `LumaFloat`, `LoadingBar`) are fine. The dead part:

- **`buildMapModel()` in `mapModel.ts:547-1020` (474 lines)** builds the whole old road layout: road SVG path, birds, clouds, season gates, ayah pills, surah labels. `Map2Screen.tsx:65` calls it only to read **3 values**: `ACTION_CARD_W`, `ACTION_CARD_H` and `sc`. No other field of the result is read anywhere. Besides the dead code, this layout work runs every time the map mounts or the width changes.
- **`mapStyles.ts`: 45 of its 65 style keys are unused** (hud, progress button, feedback FAB, node, node tag, stars badge, ayah pill, end-Lumo, coming-soon banner, chapter sign, unlock button, labels…). Only the action card, speech bubble, Lumo float and unlock-dismiss styles are used.
- Dead exports in `mapModel.ts`: `SVG_BG_TILE_H`, `NEXT_STAGE_ASPECT`, `PREVIOUS_STAGE_ASPECT`, `MAP_LOAD_ESTIMATE_MS`, `pickEvenly`, `TagPlacement`.

Recommendation: move the 3 values and the ~20 used styles into `map2/`, then delete `buildMapModel` and the dead styles. That takes `mapModel.ts` from 1,020 lines to about 540.

### 1c. Functions / constants / types used nowhere (37)

Exported, but no file in `src/` uses them. "Tests only" means only a test file still calls it.

| File | Dead names |
|---|---|
| `api/index.ts` | `revisionApi` (**parked by you on 7 Jul**), `exerciseTypeForApi` |
| `config.ts` | `FULL_JUZ_AMMA` |
| `data/juz30Surahs.ts` | `JUZ30_SURAH_ORDER` (**parked on 7 Jul** with this file) |
| `lesson/exerciseHelpers.ts` | `resolveBlankDisplay`, `resolveFullAyahArabic` (tests only) |
| `navigation/types.ts` | `TabNavProp` |
| `services/analytics.ts` | `logUserStruggling`, `AnalyticsEventName` |
| `services/audioPlayer.ts` | `setPlaybackSpeed`, `getAudioDuration` |
| `services/audioRecorder.ts` | `playRecording`, `stopPlayback` |
| `services/bootCache.ts` | `getCachedStats`, `getCachedWeakSurahs`, `allLevelsCached` |
| `services/connectivity.ts` | `fetchIsDeviceOffline` (tests only) |
| `services/contentCache.ts` | `getCachedLevelsFromDisk` |
| `services/crashReporter.ts` | `clearCrashContext` |
| `services/lessonSession.ts` | `abandonActiveLessonSessionSilent` (tests only) |
| `types/api.ts` | `SurahStage` |
| `utils/arabicFont.ts` | `ArabicFontKey` |
| `utils/hijri.ts` | `__test__` (a test hook that no test uses) |
| `utils/storage.ts` | `unlockSeason`, `getReciterId`, `setReciterId`, `getScriptPreference`, `getScriptPreferenceSync` |
| `utils/streak.ts` | `STREAK_ACTIVE_EMOJI`, `STREAK_ACTIVE_ICON_LARGE`, `STREAK_FROZEN_ICON_LARGE` |
| `screens/home/map/mapModel.ts` | see 1b |

Lower priority: about 80 more names are exported but used only inside their own file, for example every `*_W`/`*_H` constant in `map2/art/*Art.tsx` and the style objects `AD`, `BI`, `FB`, `RAS` in the lesson components. They aren't dead, only exported for no reason. Dropping the `export` keyword is enough.

### 1d. Unused variables (fails lint as errors)

| Where | What |
|---|---|
| `screens/lesson/LessonSessionScreen.tsx:79` | `segments` state, never read |
| `screens/lesson/LessonSessionScreen.tsx:118` | `exercisesCompleted` state, set but never read |
| `screens/lesson/exercises/AudioFill.tsx:80` | `wordAudioUrls` computed, never used |
| `screens/profile/ProfileScreen.tsx:147` | `initials` computed, never used (the avatar replaced it) |
| `services/googleAuth.ts:29` | caught `e` unused |
| `theme/typography.ts:1` | `Platform` import unused |

### 1e. Unused styles (26 keys, besides the 45 in `mapStyles`)

| File | Unused keys |
|---|---|
| `LoginScreen`, `SignUpScreen`, `OnboardGoalScreen`, `OnboardPathScreen`, `ProfileScreen` `.styles.ts` | `statusBar`, `time`: a fake status bar left in 5 screens |
| `ProfileScreen.styles.ts` | also `initials`, `settingIcon` |
| `lesson/exercises/exerciseStyles.ts` | `ayahCard`, `ayahAr`, `ayahTrans`, `listenBtn`, `listenBtnText` |
| `lesson/components/AyahDisplay.tsx` | `badge`, `badgeIcon`, `badgeText` |
| `lesson/components/BismillahIntro.tsx` | `listenBtn`, `listenBtnText` |
| `lesson/exercises/ReadAndSpeak.tsx`, `ReadAyahAndSpeak.tsx` | `spinner`, `micBtnRecorded` (in both) |

### 1f. Commented-out code

**Yours, keep as is (built but switched off on your instruction):**

| Where | What | When |
|---|---|---|
| `ProfileScreen.tsx:335-339` | "Notifications" settings row | 16 Sep, your request for the first production build |
| `StreakScreen.tsx:30` | `SHOW_STREAK_MILESTONES = false` hides the built Milestones card | 16 Sep redesign |
| `screens/home/HelpScreen.tsx` | not commented out, but a built screen with no route (see 1a) | ? |

The "Tap to log your Salah" button that was commented out on 20 Oct is now live and opens `LogSalahScreen` (coming soon page).

**Leftover, safe to remove:**

| Where | What |
|---|---|
| `services/bootCache.ts:177-179` | `// learningApi.stats()` plus a `TODO` (the only TODO in `src/`). It's linked to the dead `getCachedStats` / `_stats` above. |

Everything else my scan flagged turned out to be normal explanatory comments, not code.

### 1g. Unused packages

| Package | Status |
|---|---|
| `@react-native-community/blur` | **Unused.** No JS or native reference. It still autolinks into both apps. |
| `@react-native-community/push-notification-ios` | **Unused.** Notifications use notifee, and there's no native reference. Autolinks into iOS. |
| `@testing-library/react-native` | Unused dev dep (installed for QA tooling, never wired) |
| `depcheck` | Unused dev dep (a tool, harmless) |
| `@react-native-firebase/app`, `@react-native-community/cli*`, `@react-navigation/elements` | Flagged by depcheck but **needed** (peer deps / build tooling). Leave. |
| `promise` | Imported in `crashReporter.ts:90` without being in `package.json`. It works because React Native installs it. Add it explicitly, or leave it with a comment. |

Remember the npm 10 lockfile rule if you remove any.

Also: `android/app/src/main/assets/index.android.bundle` (4.6 MB, dated 1 Jul) is a stale, untracked JS bundle in this OneDrive copy. Builds run from `C:\BuildProjects`, so it doesn't ship. It can be deleted locally.

### 1h. Assets: clean

Every file in `assets/` and every key in `src/assets/index.ts` is referenced.

---

## 2. File and function length

Common guidance for React Native / TypeScript: a component file around **200-300 lines**, about **400 as a hard ceiling**, and a single function or component around **50-100 lines**. Type-only files and pure data files are exempt.

The old 3,000-4,000 line monsters are gone. Nothing is over 1,100 now.

### Files over 400 lines (12)

| Lines | File | Note |
|---|---|---|
| 1020 | `screens/home/map/mapModel.ts` | ~474 are dead (1b). After cleanup about 540. |
| 724 | `screens/lesson/LessonSessionScreen.tsx` | `submitAnswer` (213 lines, line 311) is the planned next hook to extract |
| 649 | `store/authStore.ts` | one 576-line `create()`, with `hydrateInner` at 161 lines |
| 580 | `screens/profile/ProfileScreen.tsx` | `ProfileContent` is 519 lines in one component |
| 549 | `components/tour/TourOverlay.tsx` | 342-line component |
| 540 | `types/api.ts` | types only, fine |
| 538 | `screens/home/map2/Map2Screen.tsx` | 487-line component |
| 530 | `api/index.ts` | endpoint list, acceptable, could split per domain |
| 484 | `services/audioPlayer.ts` | |
| 445 | `screens/auth/SignUpScreen.tsx` | 406-line component |
| 422 | `services/localNotifications.ts` | |
| 414 | `screens/home/map/useMapData.ts` | a 366-line hook |

### Components / functions over 150 lines (worst first)

`LessonSessionScreen` 683 · `authStore create()` 576 · `ProfileContent` 519 · `Map2Screen` 487 · `buildMapModel` 474 (dead) · `SignUpScreen` 406 · `useMapData` 366 · `TourOverlay` 342 · `StreakScreen` 322 · `mapStyles.makeStyles` 311 · `ReadAndSpeak` 275 · `ReadAyahAndSpeak` 250 · `SearchSurahsScreen` 230 · `LoginScreen` 226 · `lessonStore create()` 218 · `submitAnswer` 213 · `createLevelLaunchHandlers` 207 · `VerifyEmailScreen` 192 · `SurahProgressScreen` 184 · `handleNodePress` 173 · `FeedbackScreen` 172 · `StreakCelebrationScreen` 168 · `OnboardAssessmentScreen` 168 · `EditProfileScreen` 164 · `LessonSummaryScreen` 163 · `RootNavigator` 162 · `hydrateInner` 161

---

## 3. Duplication (goes against the "componentize repeated UI" rule)

- **`ReadAndSpeak.tsx` and `ReadAyahAndSpeak.tsx`:** 112 of their ~175 distinct code lines are identical (about 65%), including the same mic/record/score flow and the same styles. This is the strongest candidate for one shared `useSpeakExercise` hook plus a shared mic component.
- **Fake status bar styles** (`statusBar`, `time`) copy-pasted into 5 screens, all unused.
- **Modal card style** (white card, same shadow) repeated in `ChestInfoModal`, `LumoInfoModal`, `GuestGate`, `TourOfferModal`, `HearAndSelect`.
- **Gradient background block** with an identical comment in `LessonSummaryScreen.tsx:137` and `StreakRepairProgressScreen.tsx:74`.

---

## 4. Lint findings worth acting on

ESLint reports 341 problems. By rule:

| Count | Rule | Meaning |
|---|---|---|
| 163 | `no-inline-styles` | Inline `style={{…}}`. Goes against the styles.ts rule, spread across files. |
| 108 | `no-void` | `void promise()`. A deliberate pattern in this codebase, so it's a config choice, not dirt. Either allow it in `.eslintrc` or ignore it. |
| 32 | `react-hooks/exhaustive-deps` | Missing hook dependencies (see below) |
| 15 | `dot-notation` | `obj['x']` instead of `obj.x`, cosmetic |
| 6 | `no-unused-vars` | Section 1d |
| 5 | `no-unused-disable` | Stale `eslint-disable` comments: `mapModel.ts:396, 424`, `analytics.ts:53, 78`, `googleAuth.ts:26` |
| 5 | `no-shadow` | Same name reused in an inner scope: `TourOverlay.tsx:136 prev`, `Map2Screen.tsx:109-111 s`, `PrayScreen.tsx:54 coords` |
| 2 | `no-labels` | Labelled `break` in `map2Model.ts:219` |
| 1 | `no-deep-imports` | `crashReporter.ts:87` deep RN import (deliberate, documented) |
| 1 | `no-unstable-nested-components` | `MainTabs.tsx:54` `tabBar` render prop: the standard react-navigation pattern, a false alarm |
| 1 | `no-control-regex` | `validators.ts:7`, deliberate |

**About the 32 hook-dependency errors:** about 18 are `Animated.Value` refs missing from deps. Those are harmless, but they clutter the report. The ones to actually review, because a stale value is possible:

- `LessonSessionScreen.tsx:234, 245, 294, 523, 565`
- `useMapData.ts:276` (`fetchPhase`, `mvp_surah_numbers`)
- `useStreakFrozenPopup.ts:18`
- `SplashScreen.tsx:64`
- `VerifyEmailScreen.tsx:50`
- `AudioFill.tsx:64`
- `FillBlankOrNextWord.tsx:43`
- `SequenceExercise.tsx:28`
- `TourLessonScreen.tsx:109`
- `ExerciseSlide.tsx:47`

Other hygiene:

- 35 `console.*` calls. Release builds strip them through `babel.config.js`, so they're fine.
- 50 uses of `any`.
- 0 `@ts-ignore`.
- 1 TODO (`bootCache.ts:177`).
- The jest run ends with a "worker failed to exit gracefully" warning: some test leaves a timer running.

---

## 5. Suggested cleanup order (all low risk, nothing user-visible)

1. Delete the confirmed leftovers: `BuildingTabScreen`, `BackButtonArt`, `IconBuildingBookArt`, `surahCatalog` + `constants/mvp` (+ its test), `surahDisplay`, the `bootCache` stats comment and its dead chain, the 6 unused variables, the 26 unused styles, the 5 stale `eslint-disable` comments.
2. Old map: move the 3 action-card values and the ~20 used styles into `map2/`, then delete `buildMapModel` and the 45 dead `mapStyles` keys. This also removes a layout pass on map mount.
3. Remove the 2 unused native packages (`blur`, `push-notification-ios`). This needs a native rebuild and the npm 10 lockfile step.
4. Merge `ReadAndSpeak` / `ReadAyahAndSpeak` into one hook plus a shared component.
5. Continue the planned splits: `submitAnswer` into a hook, `ProfileContent`, `authStore`, `Map2Screen`, `SignUpScreen`.
6. **Needs your decision first:** `HelpScreen` (wire it up or delete it), and the items you parked on 7 Jul: placement quiz, `revisionApi`, `i18n/copy.ts`, `JUZ30_SURAH_ORDER`, plus the reciter picker chain.

# Firebase Crashlytics — crashes and error tracking

The mobile app reports crashes and errors to **Firebase Crashlytics** via `@react-native-firebase/crashlytics` (`mobile/src/services/crashReporter.ts`). Migrated from Sentry so crashes live in the same Firebase console/login already used for Analytics, with no separate account needed.

## What is captured

| Source | Details |
|--------|---------|
| Unhandled JS errors | Automatic via `ErrorUtils.setGlobalHandler` in `initCrashReporting()` |
| Native crashes | Automatic — Crashlytics native SDK, no extra wiring needed |
| React render errors | `src/components/ErrorBoundary.tsx` → `captureError` |
| API failures | Breadcrumbs in `src/api/client.ts` |
| Audio playback failures | `src/services/audioPlayer.ts` |
| User context | `setCrashUser(id)` set on login/register; only the id is stored, no email (avoids PII in crash reports) |
| Lesson context | Screen, exercise type, ayah/surah, session, step — tagged via `crashReporter.ts`'s `setCrashContext` |

Collection is disabled in `__DEV__` builds (`setCrashlyticsCollectionEnabled(!__DEV__)`), same as Analytics.

## Where to look

Firebase console → your project → **Crashlytics** tab (same login as Analytics — Firebase console → Analytics). No separate account, no invite needed from a teammate.

## Requirements

- `android/app/google-services.json` and `ios/UstadApp/GoogleService-Info.plist` must exist (same files Analytics needs — see the iOS setup notes for how to get the iOS one)
- First crash can take a few minutes to appear after it happens; Crashlytics batches uploads rather than sending instantly like Sentry did

## Slack alerts

Sentry's Slack integration is gone along with Sentry. Firebase has its own Slack integration (Firebase console → Project settings → Integrations → Slack) that can notify on Crashlytics velocity alerts and other events — set this up if you want alerts back; it wasn't configured as part of this migration.

## Verify it's working

1. Install a release build (Play Internal Testing, TestFlight, or Firebase App Distribution)
2. Trigger a crash, or wait for a real one
3. Firebase console → Crashlytics — the event should appear (may take a few minutes)

## Firebase Analytics vs Crashlytics

| Tool | Purpose |
|------|---------|
| **Crashlytics** | Crashes, errors, breadcrumbs |
| **Firebase Analytics** | Usage events (`app_open`, screen views, lessons, signups) |
| **Firebase App Distribution** | Deliver Android builds to testers (iOS testing uses TestFlight instead) |

Both Crashlytics and Analytics live under the same Firebase console login.

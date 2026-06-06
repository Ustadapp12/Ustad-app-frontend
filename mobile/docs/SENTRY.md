# Sentry — crashes and release tracking

The mobile app reports crashes and errors to [Sentry](https://sentry.io) via `@sentry/react-native` (`mobile/index.js`).

Crash notifications go to **Slack** (already configured in your Sentry project). No email alert setup is needed in this repo.

## What is captured

| Source | Details |
|--------|---------|
| Crashes / unhandled errors | Automatic via `Sentry.wrap(App)` |
| API failures | Breadcrumbs in `src/api/client.ts` |
| Audio playback failures | `src/services/audioPlayer.ts` |
| User context | Set on login/register; cleared on logout |

Release builds use `environment: production`. Dev builds use `development`.

## Release tracking (CI)

Each production APK build writes `mobile/sentry.config.js` with:

- `release`: `com.ustadapp@0.0.1+<GitHub run number>`
- `dist`: Git commit SHA

In Sentry → **Issues**, filter by release to see which CI build introduced a crash.

Optional: add GitHub secret `SENTRY_AUTH_TOKEN` and repository variables `SENTRY_ORG` / `SENTRY_PROJECT` so CI registers each release in Sentry automatically.

## Slack alerts (existing)

Your Sentry → Slack integration already handles notifications. To focus on production APK crashes:

1. Sentry → **Alerts** → open your Slack alert rule(s)
2. Add filter: **The event's environment equals `production`**
3. Save

New issues from Firebase-distributed builds will then match that filter.

## Verify Sentry is working

1. Install a release APK from Firebase App Distribution
2. Reproduce an issue or wait for a real crash
3. Sentry → **Issues** — event should appear with `environment: production`
4. Slack should notify per your existing rules

## Firebase vs Sentry

| Tool | Purpose |
|------|---------|
| **Sentry** | Crashes, errors, breadcrumbs → Slack |
| **Firebase Analytics** | Usage events (`app_open`, screen views, lessons) |
| **Firebase App Distribution** | Deliver APKs to testers |

Firebase Crashlytics is **not** enabled; use Sentry for crash reporting.

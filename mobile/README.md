# UstadApp — React Native (bare)

Gamified Quran memorization (iOS + Android) with FastAPI backend integration.

## Prerequisites

- **Node.js 22+** (`engines` in `package.json`)
- **JDK 17** (Android builds)
- Xcode (iOS, macOS) / Android Studio (Android)
- **API:** [https://ustad-app-backend.vercel.app](https://ustad-app-backend.vercel.app) — override in `src/config.ts` for local dev

## Install

```bash
npm install
cd ios && bundle install && bundle exec pod install && cd ..
npm run link:fonts
```

Windows setup: [SETUP_WINDOWS.md](./SETUP_WINDOWS.md)

## Run locally

```bash
# Terminal 1 — Metro
npm start

# Terminal 2 — Android
npm run android
# Windows: .\scripts\run-android.ps1

# iOS (macOS only)
npm run ios
```

**Physical device:** set `PHYSICAL_DEVICE_HOST` in `src/config.ts` to your machine’s LAN IP (same Wi‑Fi as the phone).

## Build release APK

```bash
npm run build:apk
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

Runs font linking, icon generation, and `./gradlew assembleRelease`. Release builds use the debug keystore (fine for Firebase App Distribution; configure a release keystore in `android/app/build.gradle` before Play Store).

## CI/CD

Production builds run on GitHub Actions when code is pushed to the **`production`** branch.

Workflow: [`.github/workflows/firebase-distribution.yml`](../.github/workflows/firebase-distribution.yml)

1. Unit tests (`npm run test:ci`)
2. Release APK build
3. Firebase App Distribution → group **`testerustadteam`**

Required GitHub secrets: `FIREBASE_APP_ID`, `FIREBASE_CREDENTIALS`, `GOOGLE_SERVICES_JSON` (recommended).

## Tests

```bash
npm test          # local
npm run test:ci   # CI (same tests, non-interactive)
```

| Test file | Covers |
|-----------|--------|
| `__tests__/App.test.tsx` | App mounts (smoke) |
| `__tests__/mvp.test.ts` | MVP surahs 105–114, placement scoring |
| `__tests__/ayahId.test.ts` | API ayah id format (`114_001`) |

## Firebase

1. Add Android/iOS apps in [Firebase Console](https://console.firebase.google.com/) (package **`com.ustadapp`**).
2. Place config files (gitignored):
   - `android/app/google-services.json`
   - `ios/UstadApp/GoogleService-Info.plist`
3. Rebuild the app.

- **Analytics:** [docs/FIREBASE_ANALYTICS.md](./docs/FIREBASE_ANALYTICS.md)
- **App Distribution:** tester group alias `testerustadteam` (display name: TesterUstadTeam)

## Sentry (crashes)

Crashes and API errors report to Sentry; notifications go to **Slack** (configured in your Sentry project).

Release APKs send `release` + `dist` metadata so issues map to CI build numbers. Details: [docs/SENTRY.md](./docs/SENTRY.md).

## MVP content

- **Surahs 105–114** (`src/constants/mvp.ts`, API `mvp_only=true`)
- Memorization order in Journey: 114 → 105

## Project structure

```
src/
  api/           # REST client + token refresh
  components/    # UI, lesson shell, journey
  constants/     # MVP surah list
  i18n/copy.ts   # User-facing strings
  lesson/        # Exercise step builder
  navigation/    # Stack + tabs
  screens/       # Feature screens
  services/      # Analytics, audio, sessions, cache
  store/         # Zustand (auth, lesson)
  theme/         # Colors, spacing, typography
  utils/         # Surah catalog, ayah IDs, storage
```

## Implemented flows

- Splash → Welcome → Intro → Onboarding → Register/Login
- Path choice · Placement test · Streak goal
- **Tabs:** Home, Journey, Revision, Profile
- Surah levels → Lesson → Complete → Streak
- Session abandon on background; content caching; Firebase Analytics events

## Scripts

| Command | Purpose |
|---------|---------|
| `npm start` | Metro bundler |
| `npm run android` / `ios` | Run on device/emulator |
| `npm run build:apk` | Release APK |
| `npm run link:fonts` | Copy fonts to native projects |
| `npm run generate:icons` | Android launcher icons from mascot |
| `npm test` | Jest |
| `npm run lint` | ESLint |

## Fonts

Custom fonts (Nunito, Amiri, Noto) live in `assets/fonts/`. `npm run link:fonts` copies them into Android/iOS native projects (`build:apk` runs this automatically).

## Troubleshooting

**AsyncStorage Gradle error** (`storage-android:1.0.0` not found): ensure `android/build.gradle` includes the `local_repo` maven entry (already in this repo).

**Postinstall:** `scripts/patch-foojay.mjs` patches the React Native Gradle plugin for Gradle 9 compatibility (runs on `npm ci` / `npm install`).

## Next enhancements

- Push notification delivery (FCM backend; permission UI exists)
- OAuth when backend supports it
- Play Store release keystore (see `android/keystore.properties.example`)

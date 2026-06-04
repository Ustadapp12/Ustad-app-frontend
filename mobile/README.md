# UstadApp — React Native (bare)

Gamified Quran memorization app (iOS + Android) with FastAPI backend integration.

## Prerequisites

- Node.js 20+
- Xcode (iOS) / Android Studio (Android)
- Live API: [https://ustad-app-backend.vercel.app](https://ustad-app-backend.vercel.app) — see `docs/BACKEND_INTEGRATION.md`

## Install

```bash
cd mobile
npm install
cd ios && bundle install && bundle exec pod install && cd ..
```

## Run

**Windows (emulator + phone):** see [SETUP_WINDOWS.md](./SETUP_WINDOWS.md).

**Team APK:** `npm run build:apk` → `android/app/build/outputs/apk/release/app-release.apk` (Gradle bundles JS at build time — do not commit `index.android.bundle` or other `*.bundle` files).

```bash
# Terminal 1 — Metro
npm start

# Terminal 2 — Android (Windows: use script for JAVA_HOME + SDK)
.\scripts\run-android.ps1

# iOS (macOS only)
npm run ios
```

**Physical device:** set `PHYSICAL_DEVICE_HOST` in `src/config.ts` to your PC LAN IP (same Wi‑Fi as phone).

## Project structure

```
src/
  api/           # REST client + refresh token
  components/    # UI + lesson shell
  i18n/copy.ts   # All user-facing strings
  lesson/        # Exercise step builder
  navigation/    # Stack + tabs
  screens/       # Feature screens
  store/         # Zustand (auth, lesson)
  theme/         # Colors, spacing, typography
```

## Implemented flows

- Splash → Welcome → Intro → Onboarding (motivation, goal, notifications, account)
- Path choice → Streak goal → Register/Login
- Tabs: Home, Journey (MVP surahs), Revision, Profile
- Surah level map → Lesson (listen, fill-blank, reorder, MCQ, repeat) → Complete → Streak
- API: auth, content, lessons, learning sessions, revision

## Fonts

Custom fonts (Nunito, Amiri, Noto) live in `assets/fonts/`. Before building, run:

```bash
npm run link:fonts
```

This copies fonts into the Android APK and iOS bundle (`build:apk` runs it automatically).

## Next enhancements
- `react-native-track-player` or `react-native-sound` for `audio_url`
- `expo-notifications` or `@react-native-community/push-notification-ios` for real reminders
- OAuth when backend supports it

## Android: AsyncStorage build error

If Gradle reports `Could not find org.asyncstorage.shared_storage:storage-android:1.0.0`, the `android/build.gradle` `local_repo` maven entry is required (included in this repo).

## Lint

```bash
npm run lint
```

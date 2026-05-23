# UstadApp — React Native (bare)

Gamified Quran memorization app (iOS + Android) with FastAPI backend integration.

## Prerequisites

- Node.js 20+
- Xcode (iOS) / Android Studio (Android)
- Backend running at `http://127.0.0.1:8000` — see repo `docs/BACKEND_INTEGRATION.md`

## Install

```bash
cd mobile
npm install
cd ios && bundle install && bundle exec pod install && cd ..
```

## Run

```bash
# Terminal 1 — Metro
npm start

# Terminal 2 — iOS simulator
npm run ios

# Android emulator (API at 10.0.2.2:8000)
npm run android
```

**Physical device:** change `DEV_HOST` in `src/config.ts` to your machine LAN IP.

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

## Next enhancements

- Link **Nunito** fonts in `ios/` and `android/`
- `react-native-track-player` or `react-native-sound` for `audio_url`
- `expo-notifications` or `@react-native-community/push-notification-ios` for real reminders
- OAuth when backend supports it

## Android: AsyncStorage build error

If Gradle reports `Could not find org.asyncstorage.shared_storage:storage-android:1.0.0`, the `android/build.gradle` `local_repo` maven entry is required (included in this repo).

## Lint

```bash
npm run lint
```

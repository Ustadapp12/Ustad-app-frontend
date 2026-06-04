# Firebase Analytics (Ustad Hifz mobile)

## 1. Create a Firebase project

1. Open [Firebase Console](https://console.firebase.google.com/).
2. Create or select a project.
3. Add an **Android** app with package name `com.ustadapp`.
4. Add an **iOS** app with bundle ID from Xcode (`UstadApp` target → General → Bundle Identifier).

## 2. Download config files

| Platform | File | Copy to |
|----------|------|---------|
| Android | `google-services.json` | `mobile/android/app/google-services.json` |
| iOS | `GoogleService-Info.plist` | `mobile/ios/UstadApp/GoogleService-Info.plist` |

Template: `mobile/android/app/google-services.json.example`

These files are **gitignored** — each developer / CI secret store supplies their own.

## 3. Install native deps

```bash
cd mobile
npm install
cd ios && pod install && cd ..
```

## 4. Build

Android applies the Google Services plugin only when `google-services.json` exists.

```bash
npm run build:apk
```

## 5. What the app logs

| Event | When |
|-------|------|
| `app_open` | App launch |
| Screen views | Every navigation screen change |
| `login` | Email login |
| `sign_up` | Registration |
| `lesson_start` | Lesson session started |
| `lesson_complete` | Lesson finished (`passed`, `score_pct`) |
| `lesson_abandon` | Leave lesson / background abandon |

User id is set on login, register, and hydrate; cleared on logout.

## 6. Verify

- Firebase Console → **Analytics** → **DebugView**
- Android debug: `adb shell setprop debug.firebase.analytics.app com.ustadapp`

## Code

- Wrapper: `src/services/analytics.ts`
- Navigation: `src/navigation/RootNavigator.tsx`

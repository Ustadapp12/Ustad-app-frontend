# Run UstadApp on Windows (emulator + physical phone)

## 1. Emulator (recommended)

1. Open **Android Studio** → **Device Manager** → start your AVD (e.g. `Medium_Phone_API_36.0`).
2. **Stop** any stuck `npm run android` that shows `Use port 8082 instead?` — press **Ctrl+C** (that prompt blocks the install).
3. Terminal 1 — Metro:

```powershell
cd mobile
npm start
```

4. Terminal 2 — install & launch (sets SDK + Java, skips duplicate Metro):

```powershell
cd mobile
.\scripts\run-android.ps1
```

**If port 8081 is busy:** `netstat -ano | findstr :8081` then `Stop-Process -Id <PID> -Force`, then `npm start` again.

**First build failed with `IBM_SEMERU`?** Run `npm install` (applies foojay patch) or `.\scripts\patch-foojay.ps1`, then `.\scripts\run-android.ps1` again. First Gradle build can take ~10 minutes.

## 2. Physical phone (USB or Wi‑Fi)

1. Enable **Developer options** → **USB debugging** on the phone.
2. Connect USB; verify: `adb devices` shows your device.
3. Edit `mobile/src/config.ts`:

```typescript
export const PHYSICAL_DEVICE_HOST: string | null = '192.168.x.x'; // your PC LAN IP
```

4. Phone and PC must be on the **same Wi‑Fi** (for API calls to FastAPI on your PC).
5. Run `.\scripts\run-android.ps1` (or Android Studio **Run** with Metro running).

**API URL:** The app uses the live backend at [https://ustad-app-backend.vercel.app](https://ustad-app-backend.vercel.app) (see `mobile/src/config.ts`).

## 3. Backend

Production API is hosted on Vercel — no local server required for normal development.

To test against **local** FastAPI instead, set `USE_LOCAL_API = true` in `mobile/src/config.ts` and run your server on port `8000`.

**Demo login (after seed):**

- Email: `demo@ustadh.local`
- Password: `DemoPass123!`

**MVP surahs:** 105–114 only (`mvp_only=true`).

- Journey lists the **last 10 surahs (105–114)** in the app (offline catalog + API).
- **Lessons** need backend seed data (`lesson groups`, ayahs, audio) for surahs 105–114.

## 4. Full Juz 30 (78–114)

In `mobile/src/config.ts`, `FULL_JUZ_AMMA = true` requests `mvp_only=false` from the API.

Expand the backend seed for surahs 87–114 to unlock lessons for the rest of Juz Amma.

## 5. Team APK (shareable build)

The launcher icon and cold-start splash use the same **mascot** as the in-app splash (`assets/images/mascot.png`). Regenerate Android assets after changing that file:

```powershell
cd mobile
npm run generate:icons
```

Build a release APK (bundles JS; no Metro needed on the phone):

```powershell
cd mobile
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
npm run build:apk
```

Copy for sharing (or use the file Gradle writes):

- **Share this file:** `mobile/dist/Ustad-App.apk` (~69 MB)
- Gradle output: `mobile/android/app/build/outputs/apk/release/app-release.apk`

Install on a device: enable **Install unknown apps**, transfer the APK (USB, Drive, Slack, etc.), open it.

**Note:** Release builds are signed with the **debug keystore** (fine for internal team testing). For Play Store, configure a release keystore in `android/app/build.gradle`.

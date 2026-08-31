/**
 * Cross-platform release build (macOS/Linux: ./gradlew, Windows: gradlew.bat).
 *
 * Pass --aab to produce an Android App Bundle instead of an APK. Play requires
 * an .aab for uploads; the .apk is only useful for sideloading onto a test
 * device, so both tasks exist rather than one replacing the other.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const androidDir = path.join(__dirname, '..', 'android');
const isWin = process.platform === 'win32';
const gradlew = isWin
  ? path.join(androidDir, 'gradlew.bat')
  : path.join(androidDir, 'gradlew');

const wantsBundle = process.argv.includes('--aab');
const task = wantsBundle ? 'bundleRelease' : 'assembleRelease';

if (!fs.existsSync(gradlew)) {
  console.error('Gradle wrapper not found:', gradlew);
  process.exit(1);
}

// app/build.gradle falls back to the DEBUG signing config when no release
// keystore is configured, and it does so silently. Play rejects a debug-signed
// upload, so catching it here saves a full build plus a confusing rejection.
const keystoreProps = path.join(androidDir, 'keystore.properties');
const hasSigningEnv =
  process.env.ANDROID_KEYSTORE_PATH &&
  process.env.ANDROID_KEYSTORE_PASSWORD &&
  process.env.ANDROID_KEY_ALIAS &&
  process.env.ANDROID_KEY_PASSWORD;

if (!fs.existsSync(keystoreProps) && !hasSigningEnv) {
  const message = [
    '',
    'No release signing configured (android/keystore.properties is missing and',
    'the ANDROID_KEYSTORE_* env vars are unset), so this build would be signed',
    'with the DEBUG key.',
    '',
    'Run: npm run keystore:generate',
    '',
  ].join('\n');

  if (wantsBundle) {
    // Hard stop: a debug-signed bundle is guaranteed to be rejected by Play.
    console.error(message + 'Play will reject a debug-signed bundle, so stopping here.\n');
    process.exit(1);
  }
  console.warn(message + 'Continuing, since a debug-signed APK is still fine for sideloading.\n');
}

const result = isWin
  ? spawnSync(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `& '${gradlew}' ${task}`],
      { cwd: androidDir, stdio: 'inherit' },
    )
  : spawnSync(gradlew, [task], { cwd: androidDir, stdio: 'inherit' });

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const artifact = wantsBundle
  ? path.join(androidDir, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab')
  : path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');

if (fs.existsSync(artifact)) {
  console.log(`\nRelease ${wantsBundle ? 'AAB' : 'APK'}:`, artifact);
} else {
  console.warn(`\nBuild reported success but ${artifact} was not found.`);
  process.exit(1);
}

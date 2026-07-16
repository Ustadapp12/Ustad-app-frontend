/**
 * Cross-platform release APK build (macOS/Linux: ./gradlew, Windows: gradlew.bat).
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

if (!fs.existsSync(gradlew)) {
  console.error('Gradle wrapper not found:', gradlew);
  process.exit(1);
}

const result = isWin
  ? spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `& '${gradlew}' assembleRelease`], {
      cwd: androidDir,
      stdio: 'inherit',
    })
  : spawnSync(gradlew, ['assembleRelease'], {
      cwd: androidDir,
      stdio: 'inherit',
    });

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const apk = path.join(
  androidDir,
  'app',
  'build',
  'outputs',
  'apk',
  'release',
  'app-release.apk',
);
if (fs.existsSync(apk)) {
  console.log('\nRelease APK:', apk);
}

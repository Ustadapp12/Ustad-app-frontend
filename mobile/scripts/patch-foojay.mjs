/**
 * Re-apply after npm install — fixes Gradle 9 + IBM_SEMERU build error.
 * Cross-platform replacement for patch-foojay.ps1 (used in CI and local dev).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(
  __dirname,
  '..',
  'node_modules',
  '@react-native',
  'gradle-plugin',
  'settings.gradle.kts',
);

if (!fs.existsSync(file)) {
  console.error('gradle-plugin not found. Run npm install first.');
  process.exit(1);
}

const content = fs.readFileSync(file, 'utf8');
const updated = content.replace(
  'foojay-resolver-convention").version("0.5.0")',
  'foojay-resolver-convention").version("1.0.0")',
);

if (content === updated) {
  console.log('Foojay patch already applied (or version changed).');
} else {
  fs.writeFileSync(file, updated);
  console.log('Patched foojay-resolver-convention to 1.0.0');
}

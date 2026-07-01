/**
 * sync-shared.mjs
 * Copies shared source directories from ustadapp-expo → mobile.
 * Run after editing any file in the shared dirs:
 *   node sync-shared.mjs
 */

import { cpSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = dirname(fileURLToPath(import.meta.url));
const expo = join(root, 'ustadapp-expo', 'src');
const mobile = join(root, 'mobile', 'src');

const SHARED_DIRS = [
  'lesson',
  'theme',
  'constants',
  'data',
  'i18n',
];

const SHARED_FILES = [
  'types/api.ts',
  'utils/ayahId.ts',
  'utils/surahCatalog.ts',
  'utils/surahDisplay.ts',
  'utils/arabicFont.ts',
];

let ok = 0, skip = 0;

for (const dir of SHARED_DIRS) {
  const src = join(expo, dir);
  const dst = join(mobile, dir);
  if (!existsSync(src)) { console.warn(`⚠  skip ${dir} (not found in expo)`); skip++; continue; }
  cpSync(src, dst, { recursive: true, force: true });
  console.log(`✓  synced ${dir}/`);
  ok++;
}

for (const file of SHARED_FILES) {
  const src = join(expo, file);
  const dst = join(mobile, file);
  if (!existsSync(src)) { console.warn(`⚠  skip ${file} (not found in expo)`); skip++; continue; }
  cpSync(src, dst, { force: true });
  console.log(`✓  synced ${file}`);
  ok++;
}

console.log(`\nDone: ${ok} synced, ${skip} skipped.`);
console.log('Remember to also copy api/client.ts if you changed it (it has project-specific imports).');

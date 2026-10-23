#!/usr/bin/env node
/**
 * Pushes package.json's "version" into the places that cannot read it
 * themselves, so one bump is enough and nothing silently drifts.
 *
 *   app.json            expo.version        (read by EAS and Expo tooling)
 *   ios/*.pbxproj       MARKETING_VERSION   (becomes CFBundleShortVersionString)
 *
 * Android needs no entry here: android/app/build.gradle parses package.json
 * directly, and the JS bundle reads it through src/utils/appVersion.ts.
 *
 * Why this exists: the version was hardcoded in five places that disagreed.
 * app.json said 1.0.0, pbxproj said MARKETING_VERSION = 1.0.0, build.gradle
 * fell back to "1.0.0", utils/appVersion.ts fell back to '1.0.0', and
 * package.json said 1.0.0 — while Android had actually shipped through
 * 1.0.33. No iOS workflow exports VERSION_NAME, so every TestFlight build
 * went out stamped 1.0.0 (see the 20040 and 20042 entries in
 * docs/changelog/versions.md) and the Profile screen's label agreed with it.
 *
 * Usage:
 *   npm run sync-version          apply
 *   npm run sync-version -- --check   report drift and exit 1, for CI
 *
 * Does NOT touch build numbers (VERSION_CODE, CURRENT_PROJECT_VERSION,
 * ios.buildNumber). Those are per-build and CI owns them; conflating them
 * with the marketing version is what produced the 10039 collision that hung
 * an App Store submission for an hour.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');

const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`package.json version "${version}" is not x.y.z — refusing to sync.`);
  process.exit(1);
}

/** Each target reports what it found so --check can describe the drift. */
const targets = [
  {
    label: 'app.json (expo.version)',
    path: join(root, 'app.json'),
    read: s => s.match(/"version"\s*:\s*"([^"]+)"/)?.[1],
    write: s => s.replace(/("version"\s*:\s*")[^"]+(")/, `$1${version}$2`),
  },
  {
    label: 'ios pbxproj (MARKETING_VERSION)',
    path: findPbxproj(),
    read: s => s.match(/MARKETING_VERSION = ([^;]+);/)?.[1],
    // Every build configuration, not just the first — Debug and Release each
    // carry their own copy and a half-synced project is worse than none.
    write: s => s.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`),
  },
];

// readdirSync rather than fs.globSync: glob is still flagged experimental on
// the Node 22 the workflows pin, and this needs no pattern matching anyway.
function findPbxproj() {
  try {
    const proj = readdirSync(join(root, 'ios')).find(n => n.endsWith('.xcodeproj'));
    return proj ? join(root, 'ios', proj, 'project.pbxproj') : null;
  } catch {
    return null;
  }
}

let drifted = 0;
for (const t of targets) {
  if (!t.path) {
    console.log(`skip  ${t.label} — not found`);
    continue;
  }
  let before;
  try {
    before = readFileSync(t.path, 'utf8');
  } catch {
    console.log(`skip  ${t.label} — unreadable`);
    continue;
  }
  const found = t.read(before);
  if (found === version) {
    console.log(`ok    ${t.label} = ${version}`);
    continue;
  }
  drifted++;
  if (checkOnly) {
    console.log(`DRIFT ${t.label} = ${found ?? '(none)'}, expected ${version}`);
    continue;
  }
  const after = t.write(before);
  if (after === before) {
    console.log(`WARN  ${t.label} — pattern did not match, left untouched`);
    continue;
  }
  writeFileSync(t.path, after);
  console.log(`set   ${t.label} ${found ?? '(none)'} -> ${version}`);
}

if (checkOnly && drifted) {
  console.error(`\n${drifted} target(s) out of sync with package.json ${version}. Run: npm run sync-version`);
  process.exit(1);
}
console.log(`\nVersion ${version}${checkOnly ? ' verified' : ' synced'}.`);

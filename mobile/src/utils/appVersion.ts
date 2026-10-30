// The one place the app's version string comes from.
//
// package.json's "version" is the canonical source. It is bumped once per
// release with `npm version <x.y.z>` (or by hand), and `npm run sync-version`
// pushes that number into the two native projects that cannot read it
// themselves: app.json's expo.version and the iOS MARKETING_VERSION. Android
// reads package.json directly from build.gradle, so it needs no sync step.
//
// VERSION_NAME still wins when set. That is the shell env var CI exports
// (.github/workflows/firebase-distribution.yml uses `1.0.${{ github.run_number }}`
// for monotonic internal builds) and which android/app/build.gradle reads for
// the native versionName. babel-plugin-transform-inline-environment-variables
// inlines it here at Metro-bundle time, so the JS string and the native
// versionName come from the same value in the same build.
//
// Why the fallback changed: it used to be a hardcoded '1.0.0' literal, which
// was wrong on every build that did not export VERSION_NAME. No iOS workflow
// exports it, so every TestFlight build shipped showing "v1.0.0" while
// Android was on 1.0.33 — see the 20040 and 20042 entries in
// docs/changelog/versions.md, both stamped 1.0.0. Local `npm run build:apk`
// had the same problem. Falling back to package.json means the worst case is
// the real release number rather than a frozen literal someone has to
// remember to edit in a second file.
const pkg = require('../../package.json') as { version: string };

export const APP_VERSION: string = process.env.VERSION_NAME ?? pkg.version;

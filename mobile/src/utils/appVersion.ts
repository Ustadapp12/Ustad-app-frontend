// VERSION_NAME is the same shell env var set by hand before every real
// release build (see the mobile build guide) and read by android/app/build.gradle
// for the native versionName. babel-plugin-transform-inline-environment-variables
// inlines it here at Metro-bundle time, so this can never drift from what's
// actually installed the way package.json's own "version" field silently did.
export const APP_VERSION = process.env.VERSION_NAME ?? '1.0.0';

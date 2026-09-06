/** Live backend — all API calls use this host. Mobile release builds always
 * hit production; unlike the Expo dev app, there is no local-API toggle. */
export const PRODUCTION_API_BASE = 'https://ustad-app-backend-six.vercel.app';
// // for testing:
// export const PRODUCTION_API_BASE = 'https://ustad-app-backend-testing.vercel.app';

export const API_BASE = PRODUCTION_API_BASE;

/** MVP: 21 surahs 93–114 (excluding 96) from API (`mvp_only=true`). Set true for full Juz 30. */
export const FULL_JUZ_AMMA = false;

export const API_PREFIX = '/api/v1';

/** Legal documents. Hosted on the web rather than bundled in the app for two
 * reasons: Play Console requires a publicly reachable URL that reviewers and
 * prospective users can open without installing anything, and hosting means a
 * wording change does not need an app update and another review cycle. */
export const TERMS_URL = 'https://ustadapp.com/terms';
export const PRIVACY_URL = 'https://ustadapp.com/privacy';

/** Google Sign-In: the OAuth **Web** client (`client_type: 3` in
 * android/app/google-services.json), never the Android one (`client_type: 1`).
 * The Android client is matched implicitly by package name + SHA-1 fingerprint;
 * this value is what the ID token's `aud` claim is set to, and it's what the
 * backend verifies against. Passing the Android client ID here is the single
 * most common cause of the otherwise unexplained `DEVELOPER_ERROR`.
 *
 * Safe to commit: an OAuth client ID is a public identifier, not a secret. It
 * is useless without a matching signing fingerprint registered in Firebase. */
export const GOOGLE_WEB_CLIENT_ID =
  '537760681130-ovvm4uklrb2e331b7vvu40sj9n0jqfj7.apps.googleusercontent.com';



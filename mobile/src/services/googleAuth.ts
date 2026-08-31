/**
 * Google Sign-In — the native half only.
 *
 * RULES (same discipline as services/analytics.ts):
 *   - No direct @react-native-google-signin imports anywhere else in the app.
 *   - A cancelled sign-in is not an error. Returns null so callers never have
 *     to pattern-match on the library's status codes.
 *   - Everything else throws a plain Error with copy that is safe to show.
 *
 * This module only obtains an ID token. Deciding which account that token maps
 * to (new account / claim the guest row / restore a pre-existing account) is
 * the server's job — see POST /auth/google and authStore.loginWithGoogle().
 */
import { GOOGLE_WEB_CLIENT_ID } from '../config';
import { addBreadcrumb, captureError } from './crashReporter';

// Lazily required, like services/analytics.ts, so that a JS-only context
// without the native module (Jest, Expo Go) can still import this file.
type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');
let _mod: GoogleSigninModule | false | null = null;

function getModule(): GoogleSigninModule | null {
  if (_mod === false) return null;
  if (_mod) return _mod;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _mod = require('@react-native-google-signin/google-signin') as GoogleSigninModule;
    return _mod;
  } catch (e) {
    _mod = false;
    return null;
  }
}

let configured = false;

/** Idempotent. Cheap enough to call before every sign-in attempt. */
export function configureGoogleSignIn(): void {
  if (configured) return;
  const mod = getModule();
  if (!mod) return;
  try {
    mod.GoogleSignin.configure({
      // Must be the Web client ID — see the note in config.ts. The ID token's
      // `aud` is set to this, and the backend verifies against the same value.
      webClientId: GOOGLE_WEB_CLIENT_ID,
      // We only ever want identity, never Drive/Calendar/etc. Keeping the scope
      // list minimal also keeps the consent screen to one tap.
      scopes: ['email', 'profile'],
      // No server-side offline access: the backend verifies the ID token
      // directly and never acts on the user's behalf at Google.
      offlineAccess: false,
    });
    configured = true;
  } catch (e) {
    captureError(e, { where: 'configureGoogleSignIn' });
  }
}

/**
 * Runs the native Google flow.
 *
 * @returns the ID token, or null if the user backed out.
 * @throws  Error with user-safe copy when the flow genuinely failed.
 */
export async function signInWithGoogle(): Promise<string | null> {
  const mod = getModule();
  if (!mod) {
    throw new Error('Google sign in is not available on this device.');
  }
  configureGoogleSignIn();

  const { GoogleSignin, statusCodes } = mod;

  try {
    // Surfaces the "update Google Play services" dialog instead of failing with
    // an opaque error on devices with an outdated or missing Play Services.
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const response = await GoogleSignin.signIn();

    // v13+ returns a discriminated union rather than throwing on cancel.
    if (response.type === 'cancelled') {
      addBreadcrumb('google_sign_in_cancelled');
      return null;
    }

    const idToken = response.data?.idToken ?? null;
    if (!idToken) {
      // Almost always a config problem rather than anything the user did: a
      // missing webClientId, or a SHA-1 that was never registered in Firebase.
      throw new Error('Google did not return a sign in token. Please try again.');
    }
    return idToken;
  } catch (e) {
    const code = (e as { code?: string })?.code;

    if (code === statusCodes.SIGN_IN_CANCELLED) {
      addBreadcrumb('google_sign_in_cancelled');
      return null;
    }
    if (code === statusCodes.IN_PROGRESS) {
      // Double tap on the button. Not worth an alert.
      return null;
    }
    if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play services are not available on this device.');
    }

    // The native module's message is the ONLY carrier of Google's own reason.
    // Upstream used to throw it away for DEVELOPER_ERROR and substitute a bare
    // doc link, so every field report was the integer 10 and nothing else --
    // see patches/@react-native-google-signin+google-signin+16.1.4.patch,
    // which restores it. Record it as its own attribute rather than relying on
    // Crashlytics' error message, which gets truncated in the issue list.
    const detail = (e as { message?: string })?.message ?? 'none';
    captureError(e, {
      where: 'signInWithGoogle',
      code: code ?? 'unknown',
      google_detail: detail.slice(0, 380),
    });
    // DEVELOPER_ERROR lands here. Conventionally that means this build's
    // signing fingerprint is not registered in Firebase -- but that has been
    // audited repeatedly and is correct, so the widened `detail` above is what
    // should finally say which check Google actually failed.
    throw new Error('Google sign in failed. Please try again.');
  }
}

/** Clears the cached Google session so the account picker shows next time. */
export async function signOutFromGoogle(): Promise<void> {
  const mod = getModule();
  if (!mod) return;
  try {
    await mod.GoogleSignin.signOut();
  } catch {
    // Best effort. Our own session is already gone by this point, and failing
    // a logout because Google's cache would not clear helps nobody.
  }
}

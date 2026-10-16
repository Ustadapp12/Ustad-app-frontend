/**
 * Sign in with Apple — the native half only. iOS only.
 *
 * RULES (same discipline as services/googleAuth.ts):
 *   - No direct @invertase/react-native-apple-authentication imports anywhere
 *     else in the app.
 *   - A cancelled sign-in is not an error. Returns null.
 *   - Everything else throws a plain Error with copy that is safe to show.
 *
 * Exists because of App Store Guideline 4.8: an app offering Google Sign-In
 * on iOS must also offer Sign in with Apple. Deciding which account the token
 * maps to is the server's job — see POST /auth/apple and
 * authStore.loginWithApple().
 */
import { Platform } from 'react-native';
import { addBreadcrumb, captureError } from './crashReporter';

type AppleAuthModule = typeof import('@invertase/react-native-apple-authentication');
let _mod: AppleAuthModule | false | null = null;

function getModule(): AppleAuthModule | null {
  if (Platform.OS !== 'ios') return null;
  if (_mod === false) return null;
  if (_mod) return _mod;
  try {
    _mod = require('@invertase/react-native-apple-authentication') as AppleAuthModule;
    return _mod;
  } catch {
    _mod = false;
    return null;
  }
}

/** True only on iOS 13+ with the native module linked. Gates the button. */
export function isAppleSignInAvailable(): boolean {
  const mod = getModule();
  if (!mod) return false;
  try {
    return mod.appleAuth.isSupported;
  } catch {
    return false;
  }
}

export interface AppleCredential {
  identityToken: string;
  /** Raw nonce. The token carries its SHA-256, and the server checks the pair. */
  nonce: string | null;
  /** Single-use code the server exchanges so account deletion can revoke it. */
  authorizationCode: string | null;
  /** Apple only sends the name on the very first authorization, never again. */
  fullName: string | null;
}

/**
 * Runs the native Apple sheet.
 *
 * @returns the credential, or null if the user backed out.
 * @throws  Error with user-safe copy when the flow genuinely failed.
 */
export async function signInWithApple(): Promise<AppleCredential | null> {
  const mod = getModule();
  if (!mod || !mod.appleAuth.isSupported) {
    throw new Error('Sign in with Apple is not available on this device.');
  }
  const { appleAuth } = mod;

  try {
    // No explicit nonce: the library generates one, sends Apple its SHA-256,
    // and hands the raw value back on the response for the server to check.
    const response = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      // EMAIL is what accounts are created with (real or private relay), and
      // the server refuses to create one without it. FULL_NAME seeds the
      // display name.
      requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
    });

    if (!response.identityToken) {
      throw new Error('Apple did not return a sign in token. Please try again.');
    }

    const given = response.fullName?.givenName?.trim() ?? '';
    const family = response.fullName?.familyName?.trim() ?? '';
    const fullName = [given, family].filter(Boolean).join(' ') || null;

    return {
      identityToken: response.identityToken,
      nonce: response.nonce ?? null,
      authorizationCode: response.authorizationCode ?? null,
      fullName,
    };
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === appleAuth.Error.CANCELED) {
      addBreadcrumb('apple_sign_in_cancelled');
      return null;
    }
    if (e instanceof Error && e.message.startsWith('Apple did not return')) throw e;

    // UNKNOWN (1000) with no Apple ID signed in on the device, or with the
    // capability missing from the provisioning profile, lands here.
    captureError(e, { where: 'signInWithApple', code: code ?? 'unknown' });
    throw new Error('Apple sign in failed. Please try again.');
  }
}

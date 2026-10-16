import * as Keychain from 'react-native-keychain';
import type { Tokens } from '../types/api';

const SERVICE = 'com.ustadapp.tokens';

/**
 * Reads the token pair from the Keychain.
 *
 * Returns null ONLY when there is genuinely nothing stored (or the stored value
 * is unparseable). A Keychain that cannot be read — iOS refuses reads while the
 * device is locked under WHEN_UNLOCKED, the Android Keystore can be briefly
 * unavailable — THROWS instead. That used to be flattened into null as well,
 * and "nothing stored" and "couldn't look" are not the same answer: the first
 * means signed out, the second must never be allowed to look like it.
 */
export async function getSecureTokens(): Promise<Tokens | null> {
  const creds = await Keychain.getGenericPassword({ service: SERVICE });
  if (!creds) {
    return null;
  }
  try {
    return JSON.parse(creds.password) as Tokens;
  } catch {
    return null;
  }
}

/**
 * Writes (or, with null, clears) the token pair. Returns whether it stuck.
 *
 * Never throws: callers (login, refresh) must not fail because storage did.
 * But it used to swallow the failure silently too, which is how a rotated
 * refresh token could be accepted by the server yet never reach disk — the app
 * kept working from memory, then relaunched with the OLD (already revoked)
 * token and was logged out. The boolean lets setTokens() react to that.
 */
export async function setSecureTokens(tokens: Tokens | null): Promise<boolean> {
  try {
    if (!tokens) {
      await Keychain.resetGenericPassword({ service: SERVICE });
      return true;
    }
    await Keychain.setGenericPassword('tokens', JSON.stringify(tokens), {
      service: SERVICE,
      // THIS_DEVICE_ONLY matters on iOS: without it the keychain item is
      // included in encrypted device backups and restores onto a DIFFERENT
      // device, carrying a live access + refresh token pair with it. Auth
      // tokens should never survive a restore; the user can sign in again.
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return true;
  } catch {
    return false;
  }
}

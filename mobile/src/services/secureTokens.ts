import * as Keychain from 'react-native-keychain';
import type { Tokens } from '../types/api';

const SERVICE = 'com.ustadapp.tokens';

export async function getSecureTokens(): Promise<Tokens | null> {
  try {
    const creds = await Keychain.getGenericPassword({ service: SERVICE });
    if (!creds) {
      return null;
    }
    return JSON.parse(creds.password) as Tokens;
  } catch {
    return null;
  }
}

export async function setSecureTokens(tokens: Tokens | null): Promise<void> {
  try {
    if (!tokens) {
      await Keychain.resetGenericPassword({ service: SERVICE });
      return;
    }
    await Keychain.setGenericPassword('tokens', JSON.stringify(tokens), {
      service: SERVICE,
      // THIS_DEVICE_ONLY matters on iOS: without it the keychain item is
      // included in encrypted device backups and restores onto a DIFFERENT
      // device, carrying a live access + refresh token pair with it. Auth
      // tokens should never survive a restore; the user can sign in again.
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch { /* Keychain not available (e.g. Expo Go) */ }
}

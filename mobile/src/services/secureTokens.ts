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
  if (!tokens) {
    await Keychain.resetGenericPassword({ service: SERVICE });
    return;
  }
  await Keychain.setGenericPassword('tokens', JSON.stringify(tokens), {
    service: SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
  });
}

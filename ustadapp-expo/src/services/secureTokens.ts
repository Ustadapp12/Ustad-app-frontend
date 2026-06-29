import * as SecureStore from 'expo-secure-store';
import type { Tokens } from '../types/api';

const KEY = 'ustadapp_tokens';

export async function getSecureTokens(): Promise<Tokens | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

export async function setSecureTokens(tokens: Tokens | null): Promise<void> {
  try {
    if (!tokens) {
      await SecureStore.deleteItemAsync(KEY);
    } else {
      await SecureStore.setItemAsync(KEY, JSON.stringify(tokens));
    }
  } catch { /* SecureStore unavailable */ }
}


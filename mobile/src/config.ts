import { Platform } from 'react-native';

/** Live backend — all API calls use this host. */
export const PRODUCTION_API_BASE = 'https://ustad-app-backend.vercel.app';

/**
 * Set true only when testing against a local FastAPI server.
 * Android emulator: 10.0.2.2:8000 · iOS simulator: 127.0.0.1:8000
 */
export const USE_LOCAL_API = false;

/** Override when USE_LOCAL_API and testing on a physical device (same Wi‑Fi). */
export const PHYSICAL_DEVICE_HOST: string | null = null;

/** MVP: only surahs 78–87 from API (`mvp_only=true`). */
export const FULL_JUZ_AMMA = false;

function localApiBase(): string {
  if (PHYSICAL_DEVICE_HOST) {
    return `http://${PHYSICAL_DEVICE_HOST}:8000`;
  }
  const host = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
  return `http://${host}:8000`;
}

export const API_BASE = USE_LOCAL_API ? localApiBase() : PRODUCTION_API_BASE;

export const API_PREFIX = '/api/v1';

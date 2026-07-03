import { Platform } from 'react-native';

/** Live backend — all API calls use this host. */
export const PRODUCTION_API_BASE = 'https://ustad-app-backend-git-main-ustadapp.vercel.app';

export const USE_LOCAL_API = false;

export const PHYSICAL_DEVICE_HOST: string | null = '172.20.10.5';

/** MVP: last 10 surahs 105–114 from API (`mvp_only=true`). Set true for full Juz 30. */
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


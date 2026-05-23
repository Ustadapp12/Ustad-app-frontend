import { Platform } from 'react-native';

/** Override with react-native-config in production if needed. */
const DEV_HOST =
  Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';

export const API_BASE = __DEV__
  ? `http://${DEV_HOST}:8000`
  : 'https://api.ustadapp.com';

export const API_PREFIX = '/api/v1';

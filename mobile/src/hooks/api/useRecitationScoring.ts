import { useCallback } from 'react';
import { Platform } from 'react-native';
import { progressApi } from '../../api';

/**
 * Scores a recorded recitation against the expected Arabic. Shared by both
 * recitation exercises, which used to build the identical request each
 * (2026-10-22). The MIME type matches what each platform records: m4a on
 * iOS, mp4 on Android. Throws what the API throws.
 */
export function useRecitationScoring() {
  return useCallback((expectedArabic: string, audioUri: string) => progressApi.speakAttempt({
    expected_arabic: expectedArabic,
    audioUri,
    audioType: Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4',
  }), []);
}

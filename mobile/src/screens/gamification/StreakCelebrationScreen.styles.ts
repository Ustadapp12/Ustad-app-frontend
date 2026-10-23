import { StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { STREAK_FROZEN_COLOR } from '../../utils/streak';

export const styles = StyleSheet.create({
  container:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:        { alignItems: 'center', paddingHorizontal: 28, width: '100%' },
  animation:      { width: '100%', height: 340, marginBottom: -10 },
  streakNumber:   { fontFamily: 'Nunito-Bold', fontSize: 72, color: '#EA580C', lineHeight: 78 },
  streakLabel:    { fontFamily: 'Nunito-Bold', fontSize: 22, color: '#F5F7FA', marginBottom: 28 },
  iceStage:       { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  bloom:          { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: STREAK_FROZEN_COLOR },
  iceImg:         { width: 96, height: 96 },
  repairedRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.30)', borderRadius: 18, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 24, maxWidth: '100%' },
  repairedLuma:   { width: 56, height: 56 },
  repairedBubble: { flexShrink: 1 },
  repairedBubbleText: { fontFamily: 'Nunito-Bold', fontSize: 14, color: '#F5F7FA', lineHeight: 19 },
  continueBtn:    { width: '100%', backgroundColor: colors.primary, borderRadius: 18, paddingVertical: 17, alignItems: 'center', marginBottom: 12, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
  continueBtnText: { fontFamily: 'Nunito-Bold', fontSize: 17, color: '#F5F7FA' },
});

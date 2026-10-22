import { StyleSheet } from 'react-native';
import { colors } from '../../theme';

export const styles = StyleSheet.create({
  container:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:        { alignItems: 'center', paddingHorizontal: 28, width: '100%' },
  animation:      { width: '100%', height: 340, marginBottom: -10, alignItems: 'center', justifyContent: 'center' },
  snowflake:      { position: 'absolute' },
  iceImg:         { width: 128, height: 128 },
  streakNumber:   { fontFamily: 'Nunito-Bold', fontSize: 72, lineHeight: 78 },
  streakLabel:    { fontFamily: 'Nunito-Bold', fontSize: 22, color: '#F5F7FA', marginBottom: 14 },
  hint:           { fontFamily: 'Nunito-Regular', fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 20, marginBottom: 28, paddingHorizontal: 12 },
  continueBtn:    { width: '100%', backgroundColor: colors.primary, borderRadius: 18, paddingVertical: 17, alignItems: 'center', marginBottom: 12, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
  continueBtnText: { fontFamily: 'Nunito-Bold', fontSize: 17, color: '#F5F7FA' },
});

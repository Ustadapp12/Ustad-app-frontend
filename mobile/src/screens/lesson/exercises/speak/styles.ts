import { StyleSheet } from 'react-native';
import { colors } from '../../../../theme';

export const styles = StyleSheet.create({
  outer:          { flex: 1 },
  // Fixed bottom area — always visible above the result sheet
  micArea:        { alignItems: 'center', paddingTop: 12, paddingBottom: 16 },
  micInstruction: { fontFamily: 'Nunito-Bold', fontSize: 13, color: colors.mutedText, marginBottom: 20, textAlign: 'center' },
  // Press → slight scale-down.
  micBtn:         { width: 108, height: 108, borderRadius: 54, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 12 },
  micBtnActive:   { transform: [{ scale: 0.93 }], shadowOpacity: 0.25 },
  micImage:       { width: 52, height: 52, tintColor: '#F5F7FA' },
  listenAnim:     { width: 88, height: 88 },
  skipBtn:        { marginTop: 18, paddingVertical: 4, paddingHorizontal: 10 },
  skipBtnText:    { fontFamily: 'Nunito-Bold', fontSize: 13, color: colors.mutedText, textDecorationLine: 'underline' },
  errorBox:       { marginTop: 20, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, alignItems: 'center', width: '100%' },
  errorText:      { fontFamily: 'Nunito-Regular', fontSize: 13, color: '#991B1B', textAlign: 'center', marginBottom: 8 },
  retryLink:      { fontFamily: 'Nunito-Bold', fontSize: 13, color: colors.primary },
});

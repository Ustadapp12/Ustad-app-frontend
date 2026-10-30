import { StyleSheet } from 'react-native';
import { colors } from '../../theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightBg, position: 'relative' },
  backBtn: {
    position: 'absolute', left: 16, width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 28 },
  successContent: { justifyContent: 'center' },
  luma: { width: 110, height: 110, marginBottom: 8 },
  lumaSuccess: { width: 140, height: 140, marginBottom: 20 },
  successBubble: {
    backgroundColor: colors.primaryBg, borderWidth: 1.5, borderColor: colors.primary,
    borderRadius: 18, paddingHorizontal: 22, paddingVertical: 18, marginBottom: 32,
  },
  successBubbleText: {
    fontFamily: 'Nunito-Bold', fontSize: 16, color: colors.darkText,
    textAlign: 'center', lineHeight: 23,
  },
  heading: { fontFamily: 'Nunito-Bold', fontSize: 22, color: colors.darkText, textAlign: 'center', marginBottom: 8 },
  sub: { fontFamily: 'Nunito-Regular', fontSize: 14, color: colors.mutedText, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  fieldWrap: { width: '100%', marginBottom: 16 },
  fieldLabel: { fontFamily: 'Nunito-Bold', fontSize: 11, color: colors.midText, marginBottom: 5, letterSpacing: 0.4 },
  inputBox: {
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
  },
  checklistWrap: { marginTop: 8, marginBottom: 4 },
  checklistItem: { fontFamily: 'Nunito-Regular', fontSize: 12, marginBottom: 2 },
  checklistMet: { color: colors.success },
  checklistUnmet: { color: colors.red },
  strengthText: { fontFamily: 'Nunito-Bold', fontSize: 12, marginTop: 4 },
  strengthWeak: { color: colors.red },
  strengthMedium: { color: colors.warning },
  strengthStrong: { color: colors.success },
  error: { fontFamily: 'Nunito-Regular', fontSize: 13, color: colors.red, marginBottom: 12, textAlign: 'center' },
  btn: {
    width: '100%', backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center', marginTop: 8, marginBottom: 16,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: colors.white },
  mascotBox: { width: 140, height: 140, marginBottom: 20 },
  mascotImgFlush: { marginBottom: 0 },
  mascotBoxSmall: { width: 110, height: 110, marginBottom: 8 },
});

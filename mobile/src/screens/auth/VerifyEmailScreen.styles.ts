import { StyleSheet } from 'react-native';
import { colors } from '../../theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightBg, position: 'relative' },
  closeBtn: {
    position: 'absolute', right: 20, width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  closeIcon: { fontSize: 18, color: colors.mutedText, fontFamily: 'Nunito-Bold' },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 28 },
  luma: { width: 130, height: 130, marginBottom: 8 },
  heading: { fontFamily: 'Nunito-Bold', fontSize: 24, color: colors.darkText, textAlign: 'center', marginBottom: 6 },
  sub: { fontFamily: 'Nunito-Regular', fontSize: 14, color: colors.mutedText, textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  inputBox: {
    width: '100%', backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, paddingVertical: 16, marginBottom: 12,
  },
  codeInput: {
    fontFamily: 'Nunito-Bold', fontSize: 28, color: colors.darkText, letterSpacing: 12,
  },
  error: { fontFamily: 'Nunito-Regular', fontSize: 13, color: colors.red, textAlign: 'center', marginBottom: 12 },
  btn: {
    width: '100%', backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center', marginTop: 8, marginBottom: 20,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: colors.white },
  resendWrap: { marginBottom: 24 },
  resend: { fontFamily: 'Nunito-Bold', fontSize: 14, color: colors.primary },
  resendDisabled: { color: colors.mutedText },
  celebBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  celebCard: { backgroundColor: colors.white, borderRadius: 20, padding: 24, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 12 },
  celebLuma: { width: 84, height: 84, marginBottom: 12 },
  celebTitle: { fontFamily: 'Nunito-Bold', fontSize: 20, color: colors.darkText, textAlign: 'center', marginBottom: 6 },
  celebXp: { fontFamily: 'Nunito-Bold', fontSize: 22, color: colors.gold, marginBottom: 20 },
  celebBtn: { width: '100%', backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  celebBtnText: { fontFamily: 'Nunito-Bold', fontSize: 14, color: colors.white },
  mascotBox: { width: 130, height: 130, marginBottom: 8 },
  mascotImgFlush: { marginBottom: 0 },
  celebMascotBox: { width: 84, height: 84, marginBottom: 12 },
});

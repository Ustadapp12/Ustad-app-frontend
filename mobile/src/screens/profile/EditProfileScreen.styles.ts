import { StyleSheet } from 'react-native';
import { colors } from '../../theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightBg, position: 'relative' },
  backBtn: {
    position: 'absolute', left: 16, width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  content: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 28 },
  heading: { fontFamily: 'Nunito-Bold', fontSize: 24, color: colors.darkText, textAlign: 'center', marginBottom: 18 },
  fieldWrap: { width: '100%', marginBottom: 14 },
  fieldLabel: { fontFamily: 'Nunito-Bold', fontSize: 11, color: colors.midText, letterSpacing: 0.4, marginBottom: 5 },
  inputBox: {
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
  },
  inputBoxDisabled: { backgroundColor: colors.lightBg },
  input: { fontFamily: 'Nunito-Regular', fontSize: 15, color: colors.darkText },
  readOnlyValue: { fontFamily: 'Nunito-Regular', fontSize: 15, color: colors.mutedText },
  fieldError: { fontFamily: 'Nunito-Regular', fontSize: 12, color: colors.red, marginTop: 4 },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, paddingVertical: 12,
  },
  genderCardActive: { borderColor: colors.primary, backgroundColor: '#F0FAF5' },
  genderCutout: { width: 44, height: 44 },
  genderLabel: { fontFamily: 'Nunito-Bold', fontSize: 14, color: colors.darkText },
  error: { fontFamily: 'Nunito-Regular', fontSize: 13, color: colors.red, marginBottom: 12, textAlign: 'center' },
  btn: {
    width: '100%', backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center', marginTop: 8,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: colors.white },
  disabledHint: {
    fontFamily: 'Nunito-Regular', fontSize: 12, color: colors.mutedText,
    textAlign: 'center', marginTop: 8,
  },
  mascotBox: { width: 90, height: 90, marginBottom: 18 },
  mascotImg: { width: 90, height: 90 },
});

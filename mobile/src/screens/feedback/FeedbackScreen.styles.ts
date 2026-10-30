import { StyleSheet } from 'react-native';
import { colors } from '../../theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightBg, position: 'relative' },
  backBtn: {
    position: 'absolute', left: 16, width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  content: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 28 },
  heading: { fontFamily: 'Nunito-Bold', fontSize: 24, color: colors.darkText, textAlign: 'center', marginBottom: 6 },
  subheading: {
    fontFamily: 'Nunito-Regular', fontSize: 13, color: colors.mutedText,
    textAlign: 'center', lineHeight: 19, marginBottom: 16, paddingHorizontal: 8,
  },
  fieldWrap: { width: '100%', marginBottom: 13 },
  fieldLabel: { fontFamily: 'Nunito-Bold', fontSize: 11, color: colors.midText, letterSpacing: 0.4, marginBottom: 5 },
  fieldHint: { fontFamily: 'Nunito-Regular', fontSize: 11, color: colors.mutedText, marginTop: 4 },
  inputBox: {
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
  },
  messageBox: { paddingVertical: 9 },
  input: { fontFamily: 'Nunito-Regular', fontSize: 15, color: colors.darkText },
  messageInput: { minHeight: 110 },
  fieldError: { fontFamily: 'Nunito-Regular', fontSize: 12, color: colors.red, marginTop: 4 },
  error: { fontFamily: 'Nunito-Regular', fontSize: 13, color: colors.red, marginBottom: 12, textAlign: 'center' },
  ratingRow: { flexDirection: 'row', gap: 5 },
  ratingCell: {
    flex: 1, alignItems: 'center', gap: 3, paddingVertical: 7,
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
  },
  ratingCellActive: { borderColor: colors.primary, backgroundColor: '#F0FAF5' },
  ratingEmoji: { fontSize: 18 },
  ratingLabel: { fontFamily: 'Nunito-Bold', fontSize: 9, color: colors.mutedText },
  ratingLabelActive: { color: colors.primary },
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
  sentWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  sentBody: {
    fontFamily: 'Nunito-Regular', fontSize: 14, color: colors.mutedText,
    textAlign: 'center', lineHeight: 21, marginBottom: 26,
  },
  mascotBox: { width: 110, height: 110, marginBottom: 18 },
  mascotImg: { width: 110, height: 110 },
  thanksMascotBox: { width: 100, height: 100, marginBottom: 14 },
  thanksMascotImg: { width: 100, height: 100 },
});

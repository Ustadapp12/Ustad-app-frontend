import { StyleSheet } from 'react-native';
import { colors } from '../../theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightBg, position: 'relative' },
  backBtn: {
    position: 'absolute', left: 16, width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 28 },
  iconBadge: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  iconGlyph: { fontSize: 34 },
  heading: { fontFamily: 'Nunito-Bold', fontSize: 26, color: colors.darkText, textAlign: 'center', marginBottom: 8 },
  sub: { fontFamily: 'Nunito-Regular', fontSize: 14, color: colors.mutedText, lineHeight: 20, textAlign: 'center', marginBottom: 28 },
  emailBox: {
    width: '100%', backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center', marginBottom: 20,
  },
  emailLabel: { fontFamily: 'Nunito-Bold', fontSize: 11, color: colors.midText, letterSpacing: 0.4, marginBottom: 5 },
  emailValue: { fontFamily: 'Nunito-Regular', fontSize: 15, color: colors.darkText },
  error: { fontFamily: 'Nunito-Regular', fontSize: 13, color: colors.red, marginBottom: 12, textAlign: 'center' },
  btn: {
    width: '100%', backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center', marginBottom: 16,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: colors.white },
});

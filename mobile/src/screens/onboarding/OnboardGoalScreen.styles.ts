import { StyleSheet } from 'react-native';
import { colors } from '../../theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightBg },
  statusBar: { paddingHorizontal: 24, paddingVertical: 6 },
  time: { fontFamily: 'Nunito-Bold', fontSize: 15, color: colors.darkText },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 6, paddingTop: 4 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
  },
  dots: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  dot: { width: 24, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },
  scroll: { paddingHorizontal: 22, paddingBottom: 20 },
  luma: { width: 100, height: 100, alignSelf: 'center', marginBottom: 4 },
  badge: {
    fontFamily: 'Nunito-Bold', fontSize: 10, color: colors.primary,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8,
    textAlign: 'center',
  },
  heading: { fontFamily: 'Nunito-Bold', fontSize: 24, color: colors.darkText, lineHeight: 30, marginBottom: 6, textAlign: 'center' },
  sub: { fontFamily: 'Nunito-Regular', fontSize: 13, color: colors.mutedText, marginBottom: 16, textAlign: 'center' },
  xpBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.goldBg, borderWidth: 1.5, borderColor: colors.goldBorder,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 18,
  },
  xpEmoji: { fontSize: 18 },
  xpText: { fontFamily: 'Nunito-Bold', fontSize: 13, color: colors.warning },
  xpHighlight: { fontFamily: 'Nunito-Bold', color: colors.primary },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 9,
  },
  optionCardActive: { borderColor: colors.primary, backgroundColor: '#F0FAF5' },
  optionEmoji: { fontSize: 20 },
  optionText: { flex: 1 },
  optionTitle: { fontFamily: 'Nunito-Bold', fontSize: 14, color: colors.darkText },
  optionDesc: { fontFamily: 'Nunito-Regular', fontSize: 11, color: colors.mutedText, marginTop: 1 },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  footer: { paddingHorizontal: 22, paddingTop: 12, backgroundColor: colors.lightBg },
  btn: {
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: colors.white },
});

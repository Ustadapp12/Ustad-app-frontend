import { StyleSheet } from 'react-native';
import { colors } from '../../theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightBg },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 6, paddingTop: 4 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
  },
  dots: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  dot: { width: 24, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 22, paddingTop: 8 },
  luma: { width: 120, height: 120, marginBottom: 10 },
  badge: {
    fontFamily: 'Nunito-Bold', fontSize: 10, color: colors.primary,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, textAlign: 'center',
  },
  heading: { fontFamily: 'Nunito-Bold', fontSize: 24, color: colors.darkText, textAlign: 'center', marginBottom: 6 },
  sub: { fontFamily: 'Nunito-Regular', fontSize: 13, color: colors.mutedText, textAlign: 'center', marginBottom: 24 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14, width: '100%',
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16, marginBottom: 12,
  },
  cardActive: { borderColor: colors.primary, backgroundColor: '#F0FAF5' },
  cardCutout: { width: 44, height: 44 },
  cardTitle: { flex: 1, fontFamily: 'Nunito-Bold', fontSize: 16, color: colors.darkText },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },
  error: { fontFamily: 'Nunito-Regular', fontSize: 12, color: colors.red, marginTop: 4, textAlign: 'center' },
  footer: { paddingHorizontal: 22, paddingTop: 12, backgroundColor: colors.lightBg },
  btn: {
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: colors.white },
});

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
  scroll: { paddingHorizontal: 22, paddingBottom: 20 },
  luma: { width: 100, height: 100, alignSelf: 'center', marginBottom: 4 },
  badge: {
    fontFamily: 'Nunito-Bold', fontSize: 10, color: colors.mutedText,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, textAlign: 'center',
  },
  heading: { fontFamily: 'Nunito-Bold', fontSize: 24, color: colors.darkText, lineHeight: 30, marginBottom: 6, textAlign: 'center' },
  sub: { fontFamily: 'Nunito-Regular', fontSize: 13, color: colors.mutedText, marginBottom: 24, textAlign: 'center' },
  card: {
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 18, padding: 16, marginBottom: 14,
  },
  cardActive: { borderColor: colors.primary, backgroundColor: '#F5FBF8' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 10 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: 'Nunito-Bold', fontSize: 15, color: colors.darkText, marginBottom: 3 },
  cardDesc: { fontFamily: 'Nunito-Regular', fontSize: 12, color: colors.mutedText, lineHeight: 17 },
  badge2: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-start' },
  badge2Text: { fontFamily: 'Nunito-Bold', fontSize: 12 },
  footer: { paddingHorizontal: 22, paddingTop: 12, backgroundColor: colors.lightBg },
  btn: {
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: colors.white },
  mascotBox: { width: 100, height: 100, alignSelf: 'center', marginBottom: 4 },
  mascotImgFlush: { marginBottom: 0 },
  cardIconEmoji: { fontSize: 22 },
  fill: { flex: 1 },
  badgeEmoji: { fontSize: 12 },
});

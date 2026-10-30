import { StyleSheet } from 'react-native';
import { colors } from '../../theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.redBg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  closeBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontFamily: 'Nunito-Bold', fontSize: 14, color: colors.midText },
  headerTitle: { fontFamily: 'Nunito-Bold', fontSize: 17, color: colors.darkText },
  headerSpacer: { width: 38, height: 38 },
  scroll: { alignItems: 'center', paddingHorizontal: 22, paddingBottom: 16 },
  luma: { width: 110, height: 110, marginBottom: 0 },
  heartBadge: {
    alignItems: 'center', backgroundColor: colors.white, borderRadius: 20,
    paddingHorizontal: 28, paddingVertical: 14, marginBottom: 20,
    borderWidth: 2, borderColor: colors.redBorder,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  heartNumber: { fontFamily: 'Nunito-Bold', fontSize: 48, color: colors.red, lineHeight: 52 },
  heartLabel: { fontFamily: 'Nunito-Bold', fontSize: 13, color: colors.mutedText, letterSpacing: 0.3, marginTop: 2 },
  card: {
    width: '100%', backgroundColor: colors.white, borderRadius: 18, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontFamily: 'Nunito-Bold', fontSize: 15, color: colors.darkText, marginBottom: 8 },
  cardBody: { fontFamily: 'Nunito-Regular', fontSize: 13.5, color: colors.mutedText, lineHeight: 20 },
  vizRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4, marginBottom: 10 },
  vizHeart: { width: 40, height: 36 },
  vizArrow: { fontFamily: 'Nunito-Bold', fontSize: 18, color: colors.mutedText },
  vizCaption: { fontFamily: 'Nunito-Regular', fontSize: 12, color: colors.mutedText, textAlign: 'center' },
  mascotBox: { width: 110, height: 110, marginBottom: 4 },
});

import { StyleSheet } from 'react-native';
import { colors } from '../../theme';

export const S = StyleSheet.create({
  // Session chrome — mirrors LessonSessionScreen's header/screen so the
  // assessment looks like a real lesson session (minus hearts + hint).
  screen: { flex: 1, backgroundColor: colors.lightBg },
  center: { alignItems: 'center', justifyContent: 'center', padding: 28 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  backText: { fontSize: 14, color: colors.mutedText },
  exerciseArea: { flex: 1 },

  errorTitle: { fontFamily: 'Nunito-Bold', fontSize: 18, color: colors.darkText, marginBottom: 8, textAlign: 'center' },
  errorMsg: { fontFamily: 'Nunito-Regular', fontSize: 13, color: colors.mutedText, textAlign: 'center', marginBottom: 24 },
  retryBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 },
  retryBtnText: { fontFamily: 'Nunito-Bold', fontSize: 15, color: colors.white },
  skipBtn: { marginTop: 14, paddingVertical: 10, paddingHorizontal: 20 },
  skipBtnText: { fontFamily: 'Nunito-Bold', fontSize: 14, color: colors.mutedText },

  // Intro screen
  introHeaderRow: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 6 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 16, color: colors.darkText, fontWeight: '700' },
  introScroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 22 },
  introContent: { alignItems: 'center' },
  lumoIntro: { width: 140, height: 140, marginBottom: 24 },
  introText: { fontFamily: 'Nunito-Bold', fontSize: 20, color: colors.darkText, textAlign: 'center', lineHeight: 28 },
  footer: { paddingHorizontal: 22, paddingTop: 12 },
  beginBtn: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  beginBtnText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: colors.white },
  mascotBox: { width: 140, height: 140, marginBottom: 24 },
  mascotImgFlush: { marginBottom: 0 },
});

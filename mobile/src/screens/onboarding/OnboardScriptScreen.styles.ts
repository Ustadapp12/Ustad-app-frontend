import { StyleSheet } from 'react-native';
import { colors } from '../../theme';

// Sized against the same 393dp-baseline scale ProfileScreen/LeaderboardScreen
// use (useResponsiveScale). Borders, letterSpacing, and shadows are left
// unscaled, matching that same existing convention.
export function makeStyles(sc: (n: number) => number) {
  return StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.lightBg },
  headerRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: sc(20), paddingBottom: sc(6), paddingTop: sc(4) },
  backBtn:      { width: sc(36), height: sc(36), borderRadius: sc(18), borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  dots:         { flexDirection: 'row', gap: sc(6), marginLeft: 'auto' },
  dot:          { width: sc(24), height: sc(6), borderRadius: sc(3), backgroundColor: colors.border },
  dotActive:    { backgroundColor: colors.primary },
  scroll:       { paddingHorizontal: sc(22), paddingBottom: sc(20) },
  luma:         { width: sc(100), height: sc(100), alignSelf: 'center', marginBottom: sc(4) },
  badge:        { fontFamily: 'Nunito-Bold', fontSize: sc(10), color: colors.mutedText, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: sc(8), textAlign: 'center' },
  heading:      { fontFamily: 'Nunito-Bold', fontSize: sc(24), color: colors.darkText, lineHeight: sc(30), marginBottom: sc(6), textAlign: 'center' },
  sub:          { fontFamily: 'Nunito-Regular', fontSize: sc(13), color: colors.mutedText, marginBottom: sc(22), lineHeight: sc(19), textAlign: 'center' },
  card:         { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border, borderRadius: sc(20), padding: sc(16), marginBottom: sc(14) },
  cardHeader:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: sc(14) },
  cardTitleWrap:{ gap: sc(2) },
  cardTitle:    { fontFamily: 'Nunito-Bold', fontSize: sc(16), color: colors.darkText },
  cardSubtitle: { fontFamily: 'NotoNaskhArabic-Regular', fontSize: sc(14) },
  cardDesc:     { fontFamily: 'Nunito-Regular', fontSize: sc(11), color: colors.mutedText, marginTop: sc(4), lineHeight: sc(16) },
  previewBox:   { borderRadius: sc(14), borderWidth: 1, paddingVertical: sc(16), paddingHorizontal: sc(14), alignItems: 'center' },
  previewArabic:{ textAlign: 'center' },
  radio:        { width: sc(22), height: sc(22), borderRadius: sc(11), borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: sc(2) },
  radioDot:     { width: sc(11), height: sc(11), borderRadius: sc(6) },
  footer:       { paddingHorizontal: sc(22), paddingTop: sc(10), gap: sc(10) },
  btn:          { backgroundColor: colors.primary, borderRadius: sc(16), paddingVertical: sc(17), alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  btnText:      { fontFamily: 'Nunito-Bold', fontSize: sc(16), color: colors.white },
  skipBtn:      { paddingVertical: sc(6), alignItems: 'center' },
  skipText:     { fontFamily: 'Nunito-Bold', fontSize: sc(14), color: colors.placeholderText },
  });
}

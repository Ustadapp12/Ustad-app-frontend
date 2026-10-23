import { StyleSheet } from 'react-native';
import { colors } from '../../../theme';

export const EX = StyleSheet.create({
  instruction: { fontFamily: 'Nunito-Bold', fontSize: 16, color: colors.darkText, textAlign: 'center', marginBottom: 12 },
  // Question card
  questionCard: { backgroundColor: '#FFFBF0', borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1.5, borderColor: 'rgba(196,168,76,0.4)', alignItems: 'center' },
  ayahCard: { backgroundColor: '#F5F7FA', borderRadius: 18, padding: 22, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  ayahAr: { fontFamily: 'NotoNaskhArabic-Regular', fontSize: 28, color: colors.darkText, textAlign: 'right', lineHeight: 52, marginBottom: 10 },
  ayahTrans: { fontFamily: 'Nunito-Regular', fontSize: 13, color: colors.mutedText, textAlign: 'center', lineHeight: 20 },
  // lineHeight is required: Naskh harakat sit outside the font's own
  // ascent/descent box, so with no reserved clearance the diacritics get
  // clipped by the row above or below. Ratio matches ayahAr/ayahText's
  // ~1.55-1.6x convention.
  contextText: { fontFamily: 'NotoNaskhArabic-Regular', fontSize: 22, color: colors.darkText, textAlign: 'center', marginBottom: 4, lineHeight: 36 },
  // Options
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  optionBtn: { backgroundColor: '#F5F7FA', borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', flexBasis: '45%', flexGrow: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  optionBtnFull: { backgroundColor: '#F5F7FA', borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 20, marginBottom: 10, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  optionGlow: {
    borderColor: colors.gold, borderWidth: 2,
    shadowColor: colors.gold, shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  optionText: { fontFamily: 'NotoNaskhArabic-Regular', fontSize: 20, color: colors.darkText },
  optionTextArabic: { fontFamily: 'NotoNaskhArabic-Regular', fontSize: 18, color: colors.darkText, textAlign: 'center' },
  optionTextSelected: { color: colors.primary },
  optionsColumn: { gap: 10 },
  answerZone: { minHeight: 60, backgroundColor: '#F5F7FA', borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed', flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, padding: 10, marginBottom: 16, alignItems: 'center', justifyContent: 'center' },
  answerPlaceholder: { fontFamily: 'Nunito-Regular', fontSize: 13, color: colors.mutedText },
  tileBank: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  bankTile: { backgroundColor: '#F5F7FA', borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  placedTile: { backgroundColor: colors.primaryBg, borderWidth: 1.5, borderColor: colors.primary, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  tileText: { fontFamily: 'NotoNaskhArabic-Regular', fontSize: 20, color: colors.darkText },
  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', backgroundColor: colors.primaryBg, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20, marginBottom: 16 },
  listenBtnText: { fontFamily: 'Nunito-Bold', fontSize: 14, color: colors.primary },
  // Sequence (ayah ordering) exercise styles
  seqAnswerZone: { flexDirection: 'column' as const, gap: 12, marginVertical: 20, paddingHorizontal: 16 },
  seqBank:       { flexDirection: 'column' as const, gap: 12, paddingHorizontal: 16 },
  seqBox:        { minHeight: 64, borderRadius: 16,
                   alignItems: 'center' as const, justifyContent: 'center' as const,
                   paddingHorizontal: 16, paddingVertical: 14,
                   backgroundColor: '#F5F7FA', borderWidth: 2, borderColor: colors.primary },
  seqBoxFilled:  { backgroundColor: 'rgba(55,161,104,0.1)' },
  seqBoxEmpty:   { borderStyle: 'dashed' as const, borderColor: 'rgba(55,161,104,0.4)', backgroundColor: 'rgba(55,161,104,0.03)' },
  seqSlotNum:    { fontFamily: 'Nunito-Bold', fontSize: 18, color: 'rgba(55,161,104,0.25)' },
  seqTileText:   { fontFamily: 'NotoNaskhArabic-Regular', fontSize: 20, color: '#1A3A2A', textAlign: 'right' as const, lineHeight: 32 },
});

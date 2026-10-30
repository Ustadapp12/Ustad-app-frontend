import { StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { STREAK_FROZEN_COLOR } from '../../utils/streak';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.streakBg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  closeBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontFamily: 'Nunito-Bold', fontSize: 14, color: colors.midText },
  headerTitle: { fontFamily: 'Nunito-Bold', fontSize: 17, color: colors.darkText },
  helpBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  helpBtnText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: colors.midText },
  helpBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  helpCard: {
    width: '100%', maxWidth: 420, backgroundColor: colors.white, borderRadius: 22,
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
  },
  helpCardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
  },
  helpCardTitle: { fontFamily: 'Nunito-Bold', fontSize: 19, color: colors.darkText },
  helpCloseBtn: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: colors.lightBg,
    alignItems: 'center', justifyContent: 'center',
  },
  helpCloseBtnText: { fontFamily: 'Nunito-Bold', fontSize: 12, color: colors.midText },
  helpSection: { marginBottom: 20 },
  helpSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  helpSectionIcon: { width: 30, height: 30 },
  helpSectionTitle: { fontFamily: 'Nunito-Bold', fontSize: 16, color: colors.darkText },
  helpSectionSubtitle: {
    fontFamily: 'Nunito-Bold', fontSize: 12, color: colors.primary,
    letterSpacing: 0.3, marginTop: 10, marginBottom: 4,
  },
  helpSectionBody: { fontFamily: 'Nunito-Regular', fontSize: 13.5, color: colors.mutedText, lineHeight: 20 },
  helpGotItBtn: {
    backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginTop: 8,
  },
  helpGotItBtnText: { fontFamily: 'Nunito-Bold', fontSize: 15, color: colors.white },
  scroll: { alignItems: 'center', paddingHorizontal: 22, paddingBottom: 16 },
  celebrationLuma: { width: 105, height: 105, marginBottom: 4 },
  // Hero card — gradient panel (Duolingo reference) behind the streak number
  // and fire animation; heroRow is the row layout inside it.
  heroCard: { width: '100%', borderRadius: 22, padding: 18, marginBottom: 12 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLeft: { alignItems: 'flex-start', position: 'relative' },
  // A soft halo behind just the number — see the inline comment above the
  // JSX for why this (not a gradient fill) is the number's "glamour."
  streakAnim: { width: 160, height: 160 },
  streakNum: {
    fontFamily: 'Nunito-Bold', fontSize: 62, color: '#EA580C', lineHeight: 66,
    letterSpacing: -1, textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 10,
  },
  streakLabel: { fontFamily: 'Nunito-Bold', fontSize: 20, color: colors.darkText, letterSpacing: 0.2 },
  streakSub: { fontFamily: 'Nunito-Regular', fontSize: 13, color: colors.mutedText, textAlign: 'center', lineHeight: 19, marginBottom: 14, paddingHorizontal: 16 },
  freezeCard: {
    width: '100%', backgroundColor: colors.blueBg, borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16,
    borderWidth: 1, borderColor: STREAK_FROZEN_COLOR + '33', alignItems: 'center',
  },
  freezeCardTitle: { fontFamily: 'Nunito-Bold', fontSize: 14, color: STREAK_FROZEN_COLOR, marginBottom: 2, textAlign: 'center' },
  freezeCardBody: { fontFamily: 'Nunito-Bold', fontSize: 12, color: colors.midText, textAlign: 'center' },
  milestonesCard: {
    width: '100%', backgroundColor: colors.white, borderRadius: 18, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  milestonesTitle: { fontFamily: 'Nunito-Bold', fontSize: 14, color: colors.darkText, marginBottom: 10 },
  milestoneRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border,
  },
  milestoneRowDone: { opacity: 0.9 },
  milestoneLabel: { flex: 1, fontFamily: 'Nunito-Bold', fontSize: 13, color: colors.midText },
  milestoneReward: { fontFamily: 'Nunito-Bold', fontSize: 12, color: colors.primary },
  milestoneDone: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  guestCard: {
    width: '100%', backgroundColor: colors.white, borderRadius: 18, padding: 16, marginTop: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  guestCardLuma: { width: 52, height: 52 },
  guestCardText: { flex: 1 },
  guestCardTitle: { fontFamily: 'Nunito-Bold', fontSize: 13, color: colors.darkText, marginBottom: 2 },
  guestCardBody: { fontFamily: 'Nunito-Regular', fontSize: 11, color: colors.mutedText, lineHeight: 15 },
  guestCardBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  guestCardBtnText: { fontFamily: 'Nunito-Bold', fontSize: 12, color: colors.white },
  mascotBox: { width: 105, height: 105, marginBottom: 4 },
  mascotImgFlush: { marginBottom: 0 },
  flameWrap: { marginTop: -36, marginBottom: 16 },
  milestoneEmoji: { fontSize: 18 },
  milestoneCheck: { fontSize: 10, color: '#F5F7FA' },
  modalCardTall: { maxHeight: '80%' },
  helpSectionLast: { marginBottom: 0 },
});

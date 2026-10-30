import { StyleSheet } from 'react-native';
import { colors } from '../../theme';

export function makeStyles(sc: (n: number) => number) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.lightBg },
    avatarCard: {
      alignItems: 'center', paddingVertical: sc(14), paddingHorizontal: sc(22),
      backgroundColor: colors.white, marginHorizontal: sc(16), borderRadius: sc(20), marginBottom: sc(10),
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
    },
    avatarWrap: { position: 'relative', marginBottom: sc(6) },
    // The avatar art sits as-is: no circle, no clip, no colored disc behind it.
    avatar: { width: sc(86), height: sc(86), alignItems: 'center', justifyContent: 'center' },
    editBadge: {
      position: 'absolute', right: -4, bottom: -4,
      width: sc(26), height: sc(26), alignItems: 'center', justifyContent: 'center',
    },
    displayName: { fontFamily: 'Nunito-Bold', fontSize: sc(20), color: colors.darkText, marginBottom: 4 },
    levelTag: { fontFamily: 'Nunito-Bold', fontSize: sc(12), color: colors.mutedText },
    // Vertical hero layout — same size/shape Lumo gets everywhere else
    // (Auth/Onboarding/Feedback), not the old cramped horizontal row.
    guestCard: {
      backgroundColor: colors.white, borderRadius: sc(18), padding: sc(16),
      marginHorizontal: sc(16), marginBottom: sc(10),
      alignItems: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
    },
    guestCardLuma: { width: sc(100), height: sc(100), marginBottom: sc(8) },
    guestCardTitle: { fontFamily: 'Nunito-Bold', fontSize: sc(17), color: colors.darkText, marginBottom: 4, textAlign: 'center' },
    guestCardBody: { fontFamily: 'Nunito-Regular', fontSize: sc(13), color: colors.mutedText, lineHeight: sc(19), textAlign: 'center', marginBottom: sc(14) },
    guestCardBtn: { alignSelf: 'stretch', backgroundColor: colors.primary, borderRadius: sc(14), paddingVertical: sc(13), alignItems: 'center' },
    guestCardBtnText: { fontFamily: 'Nunito-Bold', fontSize: sc(14), color: colors.white },
    statsGrid: {
      flexDirection: 'row', backgroundColor: colors.white,
      marginHorizontal: sc(16), borderRadius: sc(18), marginBottom: sc(10), overflow: 'hidden',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    statCell: { flex: 1, alignItems: 'center', paddingVertical: sc(10), gap: 3 },
    statCellBorder: { borderLeftWidth: 1, borderLeftColor: colors.border },
    statEmoji: { fontSize: sc(18) },
    // Bigger than the plain emoji it replaces (statEmoji, sc(18)) — an
    // animation this small barely reads as moving at all.
    statStreakAnim: { width: sc(28), height: sc(28) },
    statValue: { fontFamily: 'Nunito-Bold', fontSize: sc(18), color: colors.darkText },
    statLabel: { fontFamily: 'Nunito-Regular', fontSize: sc(9), color: colors.mutedText, letterSpacing: 0.3 },
    section: {
      marginHorizontal: sc(16), marginBottom: sc(8),
      backgroundColor: colors.white, borderRadius: sc(18), overflow: 'hidden',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    sectionTitle: {
      fontFamily: 'Nunito-Bold', fontSize: sc(10), color: colors.mutedText,
      letterSpacing: 1.5, paddingHorizontal: sc(18), paddingTop: sc(10), paddingBottom: sc(4),
    },
    settingRow: {
      flexDirection: 'row', alignItems: 'center', gap: sc(14),
      paddingHorizontal: sc(18), paddingVertical: sc(10),
      borderTopWidth: 1, borderTopColor: colors.border,
    },
    // Standalone card, not nested inside another rounded/clipped section —
    // a full, uncut green border on all sides with its own shadow so it
    // actually pops off the page instead of blending into the row list.
    // For guests and signed-in users alike, since Feedback is open to both.
    feedbackCard: {
      flexDirection: 'row', alignItems: 'center', gap: sc(14),
      marginHorizontal: sc(16), marginBottom: sc(10),
      paddingHorizontal: sc(18), paddingVertical: sc(14),
      borderRadius: sc(16), borderWidth: 2, borderColor: '#05966A', backgroundColor: '#EAF7F1',
      shadowColor: '#05966A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 6, elevation: 3,
    },
    settingEmoji: { fontSize: sc(16) },
    settingContent: { flex: 1 },
    settingLabel: { fontFamily: 'Nunito-Bold', fontSize: sc(14), color: colors.darkText },
    settingValue: { fontFamily: 'Nunito-Regular', fontSize: sc(11), color: colors.mutedText, marginTop: 1 },
    settingArrow: { fontSize: sc(18), color: colors.border, fontWeight: '600' },
    logoutBtn: {
      marginHorizontal: sc(16), marginBottom: sc(6), borderRadius: sc(16), paddingVertical: sc(13),
      alignItems: 'center', backgroundColor: colors.redBg, borderWidth: 1.5, borderColor: '#FCA5A5',
    },
    logoutText: { fontFamily: 'Nunito-Bold', fontSize: sc(15), color: colors.red },
    deleteBtn: {
      marginHorizontal: sc(16), marginBottom: sc(6), borderRadius: sc(16), paddingVertical: sc(11),
      alignItems: 'center',
    },
    deleteText: { fontFamily: 'Nunito-Bold', fontSize: sc(13), color: colors.mutedText },
    versionText: { fontFamily: 'Nunito-Regular', fontSize: sc(11), color: colors.mutedText, textAlign: 'center', marginTop: sc(20) },
    versionTextLink: { textDecorationLine: 'underline' },
    // Delete modal
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: sc(24) },
    modalCard: { backgroundColor: colors.white, borderRadius: sc(20), padding: sc(24), width: '100%', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 12 },
    deleteLumo: { width: sc(72), height: sc(72), alignSelf: 'center', marginBottom: sc(4) },
    modalTitle: { fontFamily: 'Nunito-Bold', fontSize: sc(18), color: colors.darkText, marginBottom: sc(8), textAlign: 'center' },
    modalBody: { fontFamily: 'Nunito-Regular', fontSize: sc(13), color: colors.mutedText, lineHeight: 20, marginBottom: sc(16) },
    modalInputBox: {
      borderWidth: 1.5, borderColor: colors.border, borderRadius: sc(12),
      paddingHorizontal: sc(14), paddingVertical: sc(12),
      marginBottom: sc(20),
    },
    modalBtns: { flexDirection: 'row', gap: sc(10) },
    modalCancel: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: sc(14), paddingVertical: sc(14), alignItems: 'center' },
    modalCancelText: { fontFamily: 'Nunito-Bold', fontSize: sc(14), color: colors.darkText },
    modalConfirm: { flex: 1, backgroundColor: colors.red, borderRadius: sc(14), paddingVertical: sc(14), alignItems: 'center' },
    modalConfirmText: { fontFamily: 'Nunito-Bold', fontSize: sc(14), color: '#F5F7FA' },
    // Font picker
    fontModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    fontOption: { backgroundColor: colors.lightBg, borderRadius: sc(16), borderWidth: 1.5, borderColor: colors.border, padding: sc(14), marginBottom: sc(10), flexDirection: 'row', alignItems: 'center', gap: sc(12) },
    fontOptionLabel: { fontFamily: 'Nunito-Bold', fontSize: sc(14), color: colors.darkText, marginBottom: sc(6) },
    fontOptionPreview: { textAlign: 'right' },
    radio: { width: sc(22), height: sc(22), borderRadius: sc(11), borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    radioDot: { width: sc(11), height: sc(11), borderRadius: sc(6) },
    modalCardTight: { gap: 0 },
    modalTitleFlush: { marginBottom: 0 },
    modalBodySpaced: { marginBottom: 16 },
    fontOptionSelected: { borderWidth: 2 },
    fill: { flex: 1 },
    modalCancelFull: { flex: 0, alignSelf: 'stretch', marginTop: 8 },
    mascotBox: { width: sc(72), height: sc(72), alignSelf: 'center', marginBottom: sc(4) },
    mascotImgFlush: { marginBottom: 0 },
    modalConfirmDisabled: { opacity: 0.5 },
  });
}

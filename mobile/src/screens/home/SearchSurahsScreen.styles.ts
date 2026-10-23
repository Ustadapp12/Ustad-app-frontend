import { StyleSheet, Platform } from 'react-native';
import { colors } from '../../theme';

export function makeStyles(sc: (n: number) => number, insets: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: sc(12), paddingBottom: sc(8),
    },
    backBtn: {
      width: sc(36), height: sc(36), borderRadius: sc(18),
      alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontFamily: 'Nunito-Bold', fontSize: sc(18), color: colors.darkText },
    toolsRow: {
      flexDirection: 'row', alignItems: 'center', gap: sc(8),
      marginHorizontal: sc(16), marginBottom: sc(14),
    },
    statusErrorRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sc(8),
      paddingHorizontal: sc(16), paddingVertical: sc(8), marginHorizontal: sc(16),
      marginBottom: sc(8), borderRadius: sc(10), backgroundColor: colors.lightBg,
      borderWidth: 1, borderColor: colors.border,
    },
    statusErrorText: { fontFamily: 'Nunito-Regular', fontSize: sc(12), color: colors.mutedText },
    statusErrorAction: { fontFamily: 'Nunito-Bold', fontSize: sc(12), color: colors.primary },
    searchWrap: {
      flex: 1, flexDirection: 'row', alignItems: 'center', gap: sc(8),
      backgroundColor: colors.white, borderRadius: sc(14),
      borderWidth: 1.5, borderColor: colors.border,
      paddingHorizontal: sc(14), paddingVertical: Platform.OS === 'ios' ? sc(12) : sc(6),
    },
    searchIcon: { fontSize: sc(14) },
    searchInput: { flex: 1, fontFamily: 'Nunito-Regular', fontSize: sc(14), color: colors.darkText, padding: 0 },
    clearIcon: { fontSize: sc(14), color: colors.mutedText, paddingHorizontal: sc(2) },
    // Sized off the Figma export's own aspect ratio (74x87) -- the card
    // background, icon and "Map" label are all baked into that asset, so
    // this button no longer draws its own bg/border/text around it.
    mapBtn: {
      width: sc(52), aspectRatio: 74 / 87,
      alignItems: 'center', justifyContent: 'center',
    },
    mapBtnImage: { width: '100%', height: '100%' },
    listContent: { paddingHorizontal: sc(16), paddingBottom: sc(24) + insets.bottom },
    emptyWrap: { alignItems: 'center', paddingTop: sc(48) },
    emptyText: { fontFamily: 'Nunito-Regular', fontSize: sc(13), color: colors.mutedText },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: sc(10),
      borderRadius: sc(14),
      paddingHorizontal: sc(12), paddingVertical: sc(10), marginBottom: sc(10),
      borderWidth: 1.5,
    },
    rowDefault: { backgroundColor: colors.white, borderColor: colors.border },
    rowActive: { backgroundColor: colors.successBg, borderColor: colors.success },
    numBadge: {
      width: sc(26), height: sc(26), borderRadius: sc(13),
      backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center',
    },
    numBadgeActive: { backgroundColor: colors.primaryDark },
    numBadgeText: { fontFamily: 'Nunito-Bold', fontSize: sc(12), color: colors.primary },
    numBadgeTextActive: { color: colors.white },
    rowMid: { flex: 1 },
    rowTopLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: sc(8) },
    rowNameEn: { flexShrink: 1, fontFamily: 'Nunito-Bold', fontSize: sc(14), color: colors.darkText },
    rowNameAr: { fontFamily: 'Nunito-Bold', fontSize: sc(15), color: colors.darkText },
    rowMeta: { fontFamily: 'Nunito-Regular', fontSize: sc(10), color: colors.mutedText, marginTop: 2 },
    // Was the 124x29 jump_search.png, whose visible text filled only x 17-89
    // (35px of transparent space on the right), so it never lined up under
    // the Arabic name. Now real text in the art's own green (#047A56): 2x
    // the old on-screen size, right edge flush with the Arabic name's, and
    // sharp at any size (2026-10-22, on request).
    jumpHereBtn: { alignSelf: 'flex-end', marginTop: sc(8) },
    jumpHere: { fontFamily: 'Nunito-Black', fontSize: sc(13), letterSpacing: 0.3, color: '#047A56' },
    // No negative letter spacing: at -2 the two arrows drew on top of each other.
    // ▸ is a "small" triangle that draws at about half the em, so it needs a
    // bigger font than the label for the arrows to reach its cap height
    // (2026-10-23, on request; was sc(11)).
    jumpArrows: { fontSize: sc(18), letterSpacing: 0 },
    progressBlock: { marginTop: sc(8) },
    progressPct: { fontFamily: 'Nunito-Bold', fontSize: sc(10), color: colors.success, textAlign: 'right', marginBottom: sc(4) },
    progressBarRow: { flexDirection: 'row', alignItems: 'center', gap: sc(8) },
    progressTrack: {
      flex: 1, height: sc(8), borderRadius: sc(4),
      backgroundColor: colors.border, overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: sc(4), backgroundColor: colors.success },
    rewardBtn: {
      width: sc(32), height: sc(28), borderRadius: sc(8),
      backgroundColor: colors.goldBg, borderWidth: 1.5, borderColor: colors.gold,
      alignItems: 'center', justifyContent: 'center',
    },
    rewardChest: { width: sc(22), height: sc(18) },
  });
}

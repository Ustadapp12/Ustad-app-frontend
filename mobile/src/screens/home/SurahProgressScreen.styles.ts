import { StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { type Scale } from '../../utils/responsive';

// Local to this screen only: the new mock (Figma "Landing Page" file, node
// 1147:9713's sibling Progress frame) uses a neutral gray/green/purple
// palette sampled pixel-for-pixel from the designer's export, distinct from
// the app's usual navy-tinted darkText/mutedText. Scoped here rather than
// folded into theme/colors.ts because nothing else in the app uses it yet —
// promote it later if more screens pick up the same look.
const P = {
  headerText: '#5A5D68',
  backArrow: '#AFAFAF',
  cardBg: '#D9EFE1',
  cardBorder: colors.levelStartAccent, // #00855D -- exact match, no new token needed
  track: '#D9D1C2',
  fill: '#24B874',
  nameText: '#404040',
  metaText: '#6E7571',
  pctText: '#877777',
  rewardPurple: '#905EAF',
  badgeBg: '#FEFCF8',
};

// Every number is Figma pt from progress_final (440pt frame, 2x export),
// measured, not eyeballed: 100pt cards, 7pt corners, 1pt border, 9.5pt gaps.
export function makeStyles(d: Scale) {
  const CHEST = d(43);
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: d(22), paddingBottom: d(6),
    },
    backBtn: { width: d(36), height: d(36), alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontFamily: 'Nunito-Bold', fontSize: d(19), color: P.headerText },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: d(10), paddingHorizontal: d(24) },
    centerText: { fontFamily: 'Nunito-Regular', fontSize: d(14), color: colors.mutedText, textAlign: 'center' },
    retryBtn: { backgroundColor: colors.primary, borderRadius: d(12), paddingHorizontal: d(20), paddingVertical: d(10) },
    retryText: { fontFamily: 'Nunito-Bold', fontSize: d(14), color: colors.white },
    listContent: { paddingHorizontal: d(26) },

    summaryWrap: { marginTop: d(8) },
    summaryTitle: { fontFamily: 'Nunito-Bold', fontSize: d(19), color: P.nameText, marginBottom: d(4) },
    summaryCard: {
      backgroundColor: colors.white, borderRadius: d(7), borderWidth: 1, borderColor: P.cardBorder,
      paddingLeft: d(34), paddingRight: d(22), paddingVertical: d(1),
    },
    sectionTitle: {
      fontFamily: 'Nunito-Bold', fontSize: d(19), color: P.nameText,
      marginTop: d(18), marginBottom: d(6),
    },

    row: {
      backgroundColor: P.cardBg, borderRadius: d(7), borderWidth: 1, borderColor: P.cardBorder,
      paddingLeft: d(25), paddingRight: d(31), paddingTop: d(9), paddingBottom: d(6),
      marginBottom: d(9.5),
    },
    rowDone: { paddingBottom: d(7) },
    rowTop: { flexDirection: 'row', alignItems: 'center', paddingRight: d(19) },
    numText: { width: d(31), fontFamily: 'Nunito-Bold', fontSize: d(9), color: P.headerText },
    rowNameEn: { flex: 1, fontFamily: 'Nunito-Bold', fontSize: d(12.5), color: P.nameText },
    rowNameAr: { fontFamily: 'Nunito-Bold', fontSize: d(15), color: P.nameText },
    rowMeta: {
      fontFamily: 'Nunito-Bold', fontSize: d(9), letterSpacing: d(1), color: P.metaText,
      marginTop: d(2), marginLeft: d(31),
    },
    unavailableText: { fontFamily: 'Nunito-Regular', fontSize: d(11), color: colors.mutedText, marginTop: d(8), marginLeft: d(31) },

    // Bar row: 43pt tall (the chest circle), the 19pt glowing bar centred in
    // it, and the percentage sitting just above the bar's right end.
    barRow: { flexDirection: 'row', alignItems: 'center', height: CHEST, marginTop: d(8) },
    barFlex: { flex: 1 },
    pctText: {
      position: 'absolute', bottom: d(31),
      fontFamily: 'Nunito-Regular', fontSize: d(9), color: P.pctText,
    },
    // Negative marginLeft tucks the bar's rounded right end under the
    // circle instead of stopping flush beside it -- the rim's own inset
    // (GlowProgressBar's trackRim padding) otherwise reads as a gap between
    // the bar and the chest (reported 2026-10-20).
    chestCircle: {
      width: CHEST, height: CHEST, borderRadius: CHEST / 2, marginLeft: -d(8),
      backgroundColor: P.badgeBg, alignItems: 'center', justifyContent: 'center',
    },
    chestIcon: { width: d(25), height: d(19) },
    claimBtn: { alignSelf: 'flex-end', marginTop: d(1) },
    claimText: {
      fontFamily: 'Nunito-Bold', fontSize: d(9.5), color: P.rewardPurple, letterSpacing: d(1.2),
    },
  });
}

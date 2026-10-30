import { StyleSheet } from 'react-native';
import { colors } from '../../../theme';
import type { MapScale } from './mapModel';

// ── Styles for the map's popups (level start/repeat card, Lumo's speech
// bubble), scaled off `sc()` — rebuilt via useMemo whenever the screen width
// changes. ──
export function makeStyles(M: MapScale) {
  const { sc, ACTION_CARD_W, ACTION_CARD_H } = M;
  // Fractions of ACTION_CARD_W, not independent sc() constants — every piece
  // of the action card scales off the same one number, so it can never drift
  // out of proportion with the fixed card box the way separately-tuned sc()
  // values could. RN doesn't accept percentage strings for fontSize/
  // borderRadius/shadowRadius, so those are computed here as plain numbers;
  // layout box positions below (top/left/width/height) use real percentage
  // strings since RN resolves those against the card's own fixed dimensions.
  const acw = (fraction: number) => Math.round(ACTION_CARD_W * fraction);
  // Same idea as acw() but off the card's height — needed wherever a piece
  // (the button's lip thickness, the mascot's height) is measured in the
  // source design as a fraction of height rather than width. Since
  // ACTION_CARD_H is always ACTION_CARD_W * ACTION_CARD_ASPECT, acw and ach
  // fractions stay in the same proportion the source design used no matter
  // how ACTION_CARD_W itself scales.
  const ach = (fraction: number) => Math.round(ACTION_CARD_H * fraction);
  const S = StyleSheet.create({
    // Bigger than before (72→96 glow, 66→84 image) while keeping the image
    // inset inside the glow circle rather than filling it edge to edge —
    // 6px of padding on all sides between the image and the circle's rim.
    lumaGlow: {
      width: sc(96), height: sc(96), borderRadius: sc(48),
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#F5F7FA', shadowOpacity: 0.6, shadowRadius: 8, elevation: 5,
    },
    lumaImg: { width: sc(84), height: sc(84) },
    unlockDismiss: {
      marginTop: sc(6), backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: sc(14),
      paddingHorizontal: sc(16), paddingVertical: sc(8),
    },
    unlockDismissText: { fontFamily: 'Nunito-Bold', fontSize: sc(13), color: colors.midText },
    // Figma's playcard (node 1090:4964, "Landing-Page" file) — one solid
    // green card for both the "start a new level" and "repeat the lesson"
    // taps (the old off-white/yellow variant split is gone). No close
    // button in the source design — dismissed by tapping the map background
    // instead, see Map2Band's onBackgroundPress.
    actionCard: {
      width: ACTION_CARD_W, height: ACTION_CARD_H,
      borderRadius: acw(0.087), backgroundColor: colors.levelStartAccent,
      shadowColor: '#000', shadowOffset: { width: 0, height: acw(0.013) }, shadowOpacity: 0.25, shadowRadius: acw(0.006), elevation: 4,
    },
    // Title/subtitle sit in absolutely-positioned percentage boxes
    // (percentages resolved against the fixed actionCard width/height above)
    // instead of normal flex flow, so their position stays locked to the
    // card's proportions no matter how long the surah name or ayah range is.
    // Both are capped to 58% width to stay clear of the mascot art, which
    // occupies the card's top-right quadrant.
    actionCardTitleBox: { position: 'absolute', left: '5%', top: '13%', width: '58%' },
    actionCardTitle: { fontFamily: 'Nunito-Bold', fontSize: acw(0.078), color: colors.levelCardOffWhite },
    actionCardSubtitleBox: {
      position: 'absolute', left: '5%', top: '37%', width: '58%',
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    actionCardSubtitle: {
      fontFamily: 'Nunito-Bold', fontSize: acw(0.039), opacity: 0.7,
      color: colors.levelCardOffWhite, textTransform: 'uppercase', letterSpacing: 0.6,
    },
    // Estimated time to clear the level — parallel to the ayah range on the
    // opposite side of the same row (4-5 min normal / 6-8 min special,
    // review levels covering more ground). marginLeft is a safety gap on
    // top of space-between, in case both strings run long on a narrow card.
    actionCardTimeEstimate: { marginLeft: acw(0.02) },
    // Mascot art in the top-right quadrant, sized/positioned off the source
    // design's 82×79 rect on its 309-wide card.
    actionCardMascot: { position: 'absolute', left: '64%', top: '12%', width: acw(0.265), height: ach(0.439) },
    // Bottom-shadow "lip" button (the pressed/3D look): the outer rect IS
    // the shadow color and doubles as the full tap target; the white face
    // sits on top, inset from the bottom by the lip's thickness so the
    // shadow color peeks out as a solid flat strip instead of a blurred
    // shadow — RN shadow props can't produce a flat offset shadow directly.
    actionCardBtn: {
      position: 'absolute', left: '6%', top: '51%', width: '88%', height: ach(0.311),
      borderRadius: acw(0.039), backgroundColor: colors.levelStartAccentShadow,
    },
    actionCardBtnFace: {
      position: 'absolute', left: 0, right: 0, top: 0, height: ach(0.311) - ach(0.044),
      borderRadius: acw(0.039), backgroundColor: colors.levelCardOffWhite,
      alignItems: 'center', justifyContent: 'center',
    },
    actionCardBtnText: { fontFamily: 'Nunito-Bold', fontSize: acw(0.052), letterSpacing: 0.3, color: colors.levelStartAccentText },
  });
  const SB = StyleSheet.create({
    wrapper: { alignItems: 'center', marginBottom: sc(2) },
    bubble: {
      backgroundColor: '#F5F7FA', borderRadius: sc(12),
      paddingHorizontal: sc(12), paddingVertical: sc(8), maxWidth: sc(160),
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 4,
    },
    text: { fontFamily: 'Nunito-Bold', fontSize: sc(10), color: '#374151', textAlign: 'center', lineHeight: sc(14) },
    tail: {
      width: 0, height: 0,
      borderLeftWidth: sc(7), borderRightWidth: sc(7), borderTopWidth: sc(8),
      borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#F5F7FA',
    },
  });
  return { S, SB };
}
export type Styles = ReturnType<typeof makeStyles>;

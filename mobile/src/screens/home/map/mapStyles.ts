import { StyleSheet } from 'react-native';
import { colors } from '../../../theme/colors';
import type { MapModel } from './mapModel';

// ── Styles that depend on the model's `sc()` — rebuilt via useMemo whenever
// the model changes (i.e. whenever screen width changes). ──
export function makeStyles(M: MapModel) {
  const { sc, NODE_SIZE, ACTION_CARD_W, ACTION_CARD_H, NODE_TAG_W } = M;
  // Fractions of ACTION_CARD_W, not independent sc() constants — every piece
  // of the action card scales off the same one number, so it can never drift
  // out of proportion with the fixed card box the way separately-tuned sc()
  // values could. RN doesn't accept percentage strings for fontSize/
  // borderRadius/shadowRadius, so those are computed here as plain numbers;
  // layout box positions below (top/left/width/height) use real percentage
  // strings since RN resolves those against the card's own fixed dimensions.
  const acw = (fraction: number) => Math.round(ACTION_CARD_W * fraction);
  // Total diameter of the feedback button's outer ring — also used, as the
  // same sc(54) literal, at the JSX call site below to compute its
  // horizontal position (that call site has its own `sc` from the same
  // model, so the two always agree without sharing a variable across
  // scopes).
  const FEEDBACK_FAB_SIZE = sc(54);
  const S = StyleSheet.create({
    // Ground green, not sky blue — this is the fallback fill for whatever
    // isn't covered by the sky backdrop or the map's own content (e.g.
    // bottom overscroll bounce). It should never read as "the sky leaking
    // through at the bottom."
    container: { flex: 1, backgroundColor: colors.mapBg },
    // Absolute + zIndex so this sits on top of the ScrollView instead of
    // pushing it down, letting the map scroll freely underneath it.
    hud: {
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 15,
      overflow: 'hidden',
      paddingHorizontal: sc(16), paddingVertical: sc(6),
    },
    hudRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    hudPill: {
      flexDirection: 'row', alignItems: 'center', gap: sc(4),
      backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: sc(20),
      paddingHorizontal: sc(10), paddingVertical: sc(5),
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 4, elevation: 3,
    },
    hudVal: { fontFamily: 'Nunito-Bold', fontSize: sc(12), color: '#DC2626' },
    hudStreakIcon: { width: sc(16), height: sc(16) },
    progressBtn: {
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.goldBg, borderWidth: 2, borderColor: colors.goldDark,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3,
    },
    progressBtnText: { fontFamily: 'Nunito-Bold', color: colors.darkText, marginTop: 1 },
    // Above the Profile tab (the rightmost of the 4 tabs), close over the
    // 64px tab bar — `right` itself is computed at the JSX call site (needs
    // live screen width, not available inside this style factory), this
    // just carries size/color/shadow. zIndex above the loading overlay (20)
    // so it's tappable immediately, even before the map itself has resolved.
    // Vertical gap: sc(2) above the tab bar (was sc(20), then sc(10), lowered
    // again per request). This is about as low as it goes — the 64 is the tab
    // bar's own height, so anything less starts tucking the ring behind it.
    feedbackFab: {
      position: 'absolute', bottom: 64 + sc(2), zIndex: 25,
      width: FEEDBACK_FAB_SIZE, height: FEEDBACK_FAB_SIZE, borderRadius: FEEDBACK_FAB_SIZE / 2,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 6,
    },
    // Concentric rings, dark-to-light green (app palette, incl. #05966A —
    // the reference image's own black/gray/white structure restyled into
    // green) — each ring is 100% of its parent, so nesting three Views of
    // shrinking fixed size with center alignment draws them as bands
    // automatically, no manual radius math per ring.
    feedbackRingOuter: {
      width: FEEDBACK_FAB_SIZE, height: FEEDBACK_FAB_SIZE, borderRadius: FEEDBACK_FAB_SIZE / 2,
      backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center',
    },
    feedbackRingMid: {
      width: FEEDBACK_FAB_SIZE - sc(10), height: FEEDBACK_FAB_SIZE - sc(10), borderRadius: (FEEDBACK_FAB_SIZE - sc(10)) / 2,
      backgroundColor: '#05966A', alignItems: 'center', justifyContent: 'center',
    },
    feedbackRingInner: {
      width: FEEDBACK_FAB_SIZE - sc(20), height: FEEDBACK_FAB_SIZE - sc(20), borderRadius: (FEEDBACK_FAB_SIZE - sc(20)) / 2,
      backgroundColor: '#F5F7FA', alignItems: 'center', justifyContent: 'center',
    },
    loadingOverlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(42,140,90,0.72)', zIndex: 20,
    },
    // Opaque variant for the initial load — see the comment at its use site.
    loadingOverlaySolid: { backgroundColor: '#FFFFFF' },
    node: { width: NODE_SIZE, height: NODE_SIZE, alignItems: 'center', justifyContent: 'center' },
    nodeImg: { position: 'absolute', width: NODE_SIZE, height: NODE_SIZE },
    // No top/left set, so `node`'s own alignItems/justifyContent:'center'
    // still centers this larger box — no manual offset math needed.
    nodeImgRecommendedSpecial: { width: NODE_SIZE * 1.3, height: NODE_SIZE * 1.3 },
    // Halo behind every currently-open (unlocked, not yet completed) node,
    // color-matched to what the node itself is — gray for a normal level,
    // green for a special/review one — so "you can play this right now"
    // reads at a glance across the whole map, not just on the one
    // backend-recommended node (that one keeps its separate "Begin/Continue
    // here" tag on top). Sized bigger for special nodes since their own
    // image (recommendedSpecial) already renders at 1.3x NODE_SIZE.
    // Tightened 2026-09-01 (user: original was "too ugly and too big") — a
    // close highlight ring hugging the node's own edge, not a diffuse halo.
    nodeShadow: {
      position: 'absolute', bottom: -sc(4), width: NODE_SIZE * 0.8, height: sc(10), borderRadius: sc(6),
      backgroundColor: 'rgba(0,0,0,0.25)', left: NODE_SIZE * 0.1,
    },
    nodeNumber: { fontFamily: 'Nunito-Bold', fontSize: sc(20), color: '#F5F7FA', textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
    lockIcon: { fontSize: sc(18) },
    nodeWrapper: { alignItems: 'center' },
    // The tag is absolutely positioned BESIDE the node, never in normal flow.
    //
    // It used to be an in-flow child rendered before the node, which meant the
    // one node carrying a tag was pushed down by the tag's height and sat off
    // the road while every other node stayed at its own `node.y`. Taking it out
    // of flow is what makes node position independent of whether a tag exists.
    //
    // An explicit NODE_TAG_W-wide box, NOT a shrink-wrapping one. The wrapper
    // this sits in is only NODE_SIZE wide (it hugs the node), so an absolute
    // child offset past NODE_SIZE used to be handed a NEGATIVE available
    // width and collapsed to near-nothing — that, not the maxWidth, is what
    // truncated the label to "Conti…". A declared width overflows the narrow
    // parent instead of being squeezed by it (nothing up the tree clips).
    // `left` and `alignItems` come per-instance from nodeTagPlacement().
    nodeTagWrap: { position: 'absolute', width: NODE_TAG_W },
    // Always above the node now (see nodeTagPlacement) — was previously the
    // fallback used only when a surah-name scroll blocked both sides.
    // Anchored by `bottom` so the tag's own height doesn't need to be
    // known: sc(14) of clear air between the tag's underside and the
    // node's top edge, which also clears the scroll art's top (it starts
    // sc(8) above the node).
    nodeTagWrapAbove: { bottom: NODE_SIZE + sc(14) },
    // White with black text always (never tints with Begin/Continue state) so
    // it reads as a clickable label/tooltip rather than a status pill, drawing
    // the eye the way a real callout would. maxWidth matches NODE_TAG_W so the
    // placement test upstream can never disagree with the rendered width.
    // Faint gold border (2026-09-03) so it reads as a deliberate callout
    // rather than a plain white chip — subtle enough not to compete with the
    // gold "completed" node glow elsewhere on the map.
    nodeTag: {
      maxWidth: NODE_TAG_W, backgroundColor: '#F5F7FA', borderRadius: sc(10),
      paddingHorizontal: sc(9), paddingVertical: sc(4),
      borderWidth: 1, borderColor: 'rgba(224,188,78,0.55)',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3, elevation: 4,
    },
    nodeTagText: { fontFamily: 'Nunito-Bold', fontSize: sc(10), color: '#1A1A1A', letterSpacing: 0.2 },
    // Downward-pointing callout arrow, aimed at the node below — two
    // stacked CSS-triangles (RN has no native triangle primitive): a
    // slightly larger gold one behind, a slightly smaller white one
    // centered on top, so a thin gold sliver reads as the arrow's own
    // border, matching nodeTag's borderColor above.
    nodeTagArrowGold: {
      position: 'absolute', bottom: -sc(7), alignSelf: 'center',
      width: 0, height: 0,
      borderLeftWidth: sc(7), borderRightWidth: sc(7), borderTopWidth: sc(7),
      borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: 'rgba(224,188,78,0.55)',
    },
    nodeTagArrowFill: {
      position: 'absolute', bottom: -sc(5.5), alignSelf: 'center',
      width: 0, height: 0,
      borderLeftWidth: sc(5.5), borderRightWidth: sc(5.5), borderTopWidth: sc(5.5),
      borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#F5F7FA',
    },
    starsBadge: { position: 'absolute', bottom: -sc(6), backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: sc(8), paddingHorizontal: sc(4), paddingVertical: sc(1) },
    starsText: { fontSize: sc(8), color: '#FFD700' },
    // alignItems:'stretch' (not 'center') so the Text has a real width to
    // measure against — same fix as SL.labelBox below: without it,
    // adjustsFontSizeToFit never triggers and wider ranges (e.g. "Ayahs
    // 111–112") overflow the pill art instead of shrinking to fit.
    ayahPill: { alignItems: 'stretch', justifyContent: 'center', paddingHorizontal: sc(4) },
    ayahPillText: {
      fontFamily: 'Nunito-Bold', fontSize: sc(10), color: '#3B2A12', textAlign: 'center',
      textShadowColor: 'rgba(255,255,255,0.85)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
    },
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
    // End-of-map Lumo, in the sc(90) of FOOTER_PAD reserved for him. Bubble
    // sits above the art so the pair reads as him speaking upward into the
    // empty space rather than down off the edge of the map.
    endLumoWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
    endLumoBubble: {
      backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: sc(14),
      paddingHorizontal: sc(14), paddingVertical: sc(7), marginBottom: sc(5),
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 4, elevation: 3,
    },
    endLumoText: { fontFamily: 'Nunito-Bold', fontSize: sc(13), color: colors.darkText, textAlign: 'center' },
    endLumoImg: { width: sc(64), height: sc(64) },
    endText: { fontFamily: 'Nunito-Bold', fontSize: sc(11), color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: sc(4) },
    // The big "Coming soon!" banner filling a short final chapter's unused
    // reserved space (see comingSoonY) — deliberately much larger than
    // endText above, which is a small footer note, not a banner.
    comingSoonBanner: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
    comingSoonText: {
      fontFamily: 'Nunito-Bold', fontSize: sc(28), color: 'rgba(255,255,255,0.85)',
      textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4,
    },
    // ── Chapter paging — both signs side by side at the bottom, wooden
    // signpost art, same material as the season gate signs, text baked into
    // the image. Row is centered + gap-based so it re-centers responsively
    // instead of relying on fixed left/right offsets. ──
    chapterSignRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: sc(16), marginTop: sc(6) },
    chapterSignCol: { alignItems: 'center' },
    chapterSignCaption: {
      fontFamily: 'Nunito-Bold', fontSize: sc(12), color: colors.darkText,
      marginTop: sc(2), textShadowColor: 'rgba(255,255,255,0.8)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 0 },
    },
    // Floats over the NEXT sign's top-right corner (not stacked above it) so
    // its image stays level with the PREVIOUS sign, which has no badge.
    chapterNewBadgeFloat: {
      position: 'absolute', top: sc(-10), right: sc(-6), zIndex: 2,
      backgroundColor: '#FFD34D', borderRadius: sc(8),
      paddingHorizontal: sc(8), paddingVertical: sc(2),
    },
    chapterNewBadgeText: { fontFamily: 'Nunito-Bold', fontSize: sc(10), color: '#3B2A12', letterSpacing: 0.6 },
    unlockBtn: {
      marginTop: sc(6), backgroundColor: colors.primary, borderRadius: sc(14),
      paddingHorizontal: sc(16), paddingVertical: sc(8),
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 5,
    },
    unlockBtnText: { fontFamily: 'Nunito-Bold', fontSize: sc(13), color: '#F5F7FA' },
    unlockDismiss: {
      marginTop: sc(6), backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: sc(14),
      paddingHorizontal: sc(16), paddingVertical: sc(8),
    },
    unlockDismissText: { fontFamily: 'Nunito-Bold', fontSize: sc(13), color: colors.midText },
    actionCard: {
      width: ACTION_CARD_W, height: ACTION_CARD_H,
      borderRadius: acw(0.087), borderWidth: 1.5,
      shadowColor: '#000', shadowOffset: { width: 0, height: acw(0.043) }, shadowOpacity: 0.25, shadowRadius: acw(0.061), elevation: 10,
    },
    actionCardStart: { backgroundColor: colors.levelStartAccent, borderColor: colors.levelStartAccent },
    actionCardRepeat: { backgroundColor: colors.levelRepeatBg, borderColor: colors.levelRepeatBorder },
    actionCardClose: {
      position: 'absolute', top: '5%', right: '5%', width: acw(0.09), height: acw(0.09),
      alignItems: 'center', justifyContent: 'center', zIndex: 1,
    },
    actionCardCloseText: { fontSize: acw(0.05), fontFamily: 'Nunito-Bold' },
    // Title/subtitle/button all sit in absolutely-positioned percentage boxes
    // (percentages resolved against the fixed actionCard width/height above)
    // instead of normal flex flow, so their position stays locked to the
    // card's proportions no matter how long the surah name or ayah range is.
    // Title is narrower than subtitle/button (78% vs 92%) so a long surah
    // name shrinks-to-fit within its own lane instead of running under the
    // close button sitting in the top-right corner.
    actionCardTitleBox: { position: 'absolute', left: '4%', top: '14%', width: '78%' },
    actionCardTitle: { fontFamily: 'Nunito-Bold', fontSize: acw(0.07) },
    actionCardSubtitleBox: {
      position: 'absolute', left: '4%', top: '34%', width: '92%',
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    actionCardSubtitle: { fontFamily: 'Nunito-Bold', fontSize: acw(0.052), opacity: 0.7 },
    // Estimated time to clear the level — parallel to the ayah range on the
    // opposite side of the same row (4-5 min normal / 6-8 min special,
    // review levels covering more ground). marginLeft is a safety gap on
    // top of space-between, in case both strings run long on a narrow card.
    actionCardTimeEstimate: { marginLeft: acw(0.02) },
    actionCardBtn: {
      // top nudged down from 51% (height trimmed to match, 31%→28%, so the
      // bottom edge — and the card's own bottom margin — stays put) to open
      // up more breathing room under the ayah-range subtitle, which sat
      // right on top of the button before.
      position: 'absolute', left: '4%', top: '54%', width: '92%', height: '28%',
      borderRadius: acw(0.052), alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: acw(0.017) }, shadowOpacity: 0.2, shadowRadius: acw(0.026), elevation: 4,
    },
    actionCardBtnText: { fontFamily: 'Nunito-Bold', fontSize: acw(0.057), letterSpacing: 0.3 },
  });
  const SL = StyleSheet.create({
    // width:'100%' + alignItems:'stretch' (not 'center') is required, not
    // decorative — the Text needs a real width to measure against, or
    // `adjustsFontSizeToFit` never triggers and longer names (Al-Ikhlas,
    // Al-Kafirun) overflow the scroll art instead of shrinking to fit.
    labelBox: { width: '100%', alignItems: 'stretch', justifyContent: 'center', paddingHorizontal: sc(10) },
    english: {
      fontFamily: 'Nunito-Bold', fontSize: sc(17), color: '#F5F7FA', letterSpacing: 0.4,
      textAlign: 'center',
      textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
    },
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
  return { S, SL, SB };
}
export type Styles = ReturnType<typeof makeStyles>;

import React, { useEffect, useRef } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity, Modal, Animated, useWindowDimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { useTourStore } from '../../store/tourStore';
import { TOUR_STEPS } from './tourSteps';

// Dark enough that whatever's showing through the cutout below reads as a
// genuine spotlight by contrast, not just a slightly-brighter patch on an
// otherwise-normal-brightness screen.
const DIM = 'rgba(4, 12, 9, 0.86)';
const PAD = 8; // how far the cutout extends past the target's own edge

// Card geometry — small and anchored right next to whatever it's describing,
// not a big fixed banner. See the sizing/positioning block inside the
// component for how these turn into an actual left/top/bottom.
const CARD_MAX_W = 260;
const CARD_MARGIN = 16; // minimum gap kept between the card and the screen edge
const TARGET_GAP = 12; // gap between the target's own edge and the card
const TAIL_SIZE = 8; // half-width of the tail triangle's base
const TAIL_INSET = 22; // how close the tail may sit to a rounded card corner

interface Props {
  /** Which half of the tour this host renders. Steps for the other half are ignored. */
  screen: 'map' | 'lesson';
  /** Runs when the tour finishes or is skipped. */
  onFinish: () => void;
  /** Runs when the last map step is done and the lesson half should open. */
  onEnterLesson?: () => void;
  /** Runs when stepping backward crosses from a lesson step into a map step. */
  onBack?: () => void;
  /**
   * Runs when hardware back is pressed on step 1 — there's no earlier tour
   * step to return to, so this steps back out to the "want a tour?" offer
   * instead of just abandoning the tour outright. Map screen only; step 1 is
   * always a map step, so the lesson host never needs this.
   */
  onExitToOffer?: () => void;
}

/**
 * A hole punched in the dim at whatever real element the current step is
 * describing, so that element shows through at its own true colours and its
 * own real glow (see TOUR_GLOW in LessonSessionScreen.tsx, and the
 * `glowKey`/`glowTarget`/`glowCheck`/`glowMic`/`glow` props threaded through
 * every host screen) — instead of a ring drawn here at measured coordinates.
 * A drawn ring is never quite the real thing: it can only approximate the
 * target's shape (round/pill/rect guesswork), it can be a frame or two out
 * of sync with an animation, and everything under a *uniform* dim reads as
 * tinted rather than lit — a feedback banner under gold-tinted dim doesn't
 * look green anymore, it looks olive. Cutting a real hole is the difference
 * between "an outline points at it" and "it is genuinely brighter than
 * everything else."
 *
 * The hole is one `<Path fillRule="evenodd">`: one subpath for the full
 * screen, one rounded-rect subpath for the target — evenodd punches the
 * overlap out with no `Mask`/`ClipPath`/`url(#id)` involved. That matters
 * here specifically: this app has a confirmed react-native-svg bug where
 * `url(#id)` references silently mis-resolve on remount (see MapScreen.tsx's
 * own mapInstanceId comment) — patterns "silently stop painting, falling
 * back to a flat fill" — and this Modal remounts on every step. A `Path`
 * needs no id lookup at all, so that failure mode can't happen here.
 *
 * The narration card sits right next to the target — anchored to its own
 * edge, nudged horizontally toward its centre, with a small triangular tail
 * connecting the two — instead of parked at a fixed screen edge regardless
 * of where the target actually is.
 *
 * Note the whole thing is still a Modal: the screen underneath is a display,
 * not something to poke at. Every step's copy says "shows", and letting taps
 * through would start real audio and real recording behind the card. That
 * blocking comes from the Modal's own native window, not from the dim —
 * punching a visual hole doesn't let a single tap through.
 */
export default function TourOverlay({ screen, onFinish, onEnterLesson, onBack, onExitToOffer }: Props) {
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
  const { active, stepIndex, rects, next, prev, stop } = useTourStore();

  const step = TOUR_STEPS[stepIndex];
  const isMine = active && step != null && step.screen === screen;

  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isMine) return;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [isMine, stepIndex, fade]);

  if (!isMine || !step) return null;

  const rect = step.target ? rects[step.target] : undefined;
  const isLast = stepIndex === TOUR_STEPS.length - 1;
  const isFirst = stepIndex === 0;

  function handleNext() {
    if (isLast) {
      stop();
      onFinish();
      return;
    }
    const upcoming = TOUR_STEPS[stepIndex + 1];
    next();
    // Hand off to the lesson half at the boundary.
    if (upcoming.screen === 'lesson' && step.screen === 'map') onEnterLesson?.();
    // Hand back to the map half when the lesson half finishes forward into
    // a map step — the tour's own trailing steps (currently just "Good
    // luck!") land back on the map, same "return to plain map" action onBack
    // already does for the backward crossing below.
    if (upcoming.screen === 'map' && step.screen === 'lesson') onBack?.();
  }

  function handleBack() {
    if (isFirst) {
      // Nothing earlier than step 1 — step back out to the "want a tour?"
      // fork instead of just dropping the user on the plain map, so
      // hardware back reads as "undo" all the way, not "undo, then abandon."
      stop();
      if (onExitToOffer) onExitToOffer(); else onFinish();
      return;
    }
    const previous = TOUR_STEPS[stepIndex - 1];
    prev();
    // Hand back to the map half at the boundary — mirror of handleNext above.
    if (previous.screen === 'map' && step.screen === 'lesson') onBack?.();
    // Mirror of the new forward case above: stepping backward out of the
    // tour's trailing map steps re-opens the lesson half.
    if (previous.screen === 'lesson' && step.screen === 'map') onEnterLesson?.();
  }

  function handleSkip() {
    stop();
    onFinish();
  }

  // Put the card on whichever side of the target has more room, so it never
  // covers the thing it's describing — unless the step forces a side (the
  // "Check your answer" step pins to the top so it can never sit over the
  // Check button, which lives at the bottom of the exercise's own scroll
  // content).
  const spotlightBottom = rect ? rect.y + rect.height + PAD : 0;
  const cardBelow = step.cardPosition
    ? step.cardPosition === 'bottom'
    : (!rect || spotlightBottom < SCREEN_H * 0.55);

  // Card width is fixed (not "however wide the screen is minus a margin")
  // so its left edge can be computed without knowing its height first —
  // anchoring by `top`/`bottom` (never both) lets the card grow away from
  // the target regardless of how many lines the body text wraps to.
  const cardW = Math.min(CARD_MAX_W, SCREEN_W - CARD_MARGIN * 2);

  let cardLeft: number;
  let tailCenter: number | null = null; // x offset of the tail's tip, within the card
  if (rect) {
    const targetCenterX = rect.x + rect.width / 2;
    cardLeft = Math.max(
      CARD_MARGIN,
      Math.min(targetCenterX - cardW / 2, SCREEN_W - CARD_MARGIN - cardW),
    );
    tailCenter = Math.max(TAIL_INSET, Math.min(targetCenterX - cardLeft, cardW - TAIL_INSET));
  } else {
    // No target to hug — centre the card like before.
    cardLeft = (SCREEN_W - cardW) / 2;
  }

  // Anchoring by the target's own edge (not a fixed screen position) breaks
  // down for a target that's nearly the whole screen tall — "lessonExercise"
  // spans the entire flex:1 area below the header, so targetBottom + GAP
  // landed hundreds of px past the bottom of the screen and the card
  // rendered completely off-screen, unreachable (confirmed empirically: no
  // "Next"/"Skip" text anywhere in the view hierarchy for that step). The
  // Math.min/.max clamps below cap how far the anchor can push the card,
  // using a generous card-height estimate (actual height is intrinsic/auto —
  // this bound only exists to keep the anchor sane, never to size the card).
  const CARD_H_ESTIMATE = 300;
  const targetTop = rect ? rect.y : 0;
  const targetBottom = rect ? rect.y + rect.height : 0;
  const verticalStyle = rect
    ? (cardBelow
        ? { top: Math.min(targetBottom + TARGET_GAP, SCREEN_H - CARD_MARGIN - CARD_H_ESTIMATE) }
        : { bottom: Math.min(SCREEN_H - targetTop + TARGET_GAP, SCREEN_H - CARD_MARGIN - CARD_H_ESTIMATE) })
    : (cardBelow ? { bottom: 56 } : { top: 90 });

  // ── The cutout itself ────────────────────────────────────────────
  // One rect for the whole screen, one rounded-rect for the hole; evenodd
  // punches the second out of the first. Shape choice per target mirrors
  // what used to decide the drawn ring's shape, since it's the same "what
  // does this actually look like" judgement — just now sizing a hole
  // instead of an outline:
  // - round icon buttons (hint, mic) read as a circle, not a rounded square.
  // - wide bars (hearts, progress, HUD pills, Check, the feedback sheet's
  //   general case) are stadium pills, radius = half their own height.
  // - the four tab slots are a special case: at typical phone widths a
  //   quarter of the tab bar is closer to square than to a wide bar, so the
  //   round/pill rule above would carve a near-circle out of a rectangular
  //   slot — forced to a small, honest rounded-rect instead. They also get
  //   zero padding (not the usual 8px): the slots sit flush against each
  //   other with no gap, so any padding here would undim a strip of the
  //   neighbouring tab too.
  // - the feedback sheet and Check button both sit flush against the bottom
  //   of their own scroll content/screen — squaring off the hole's bottom
  //   corners there reads as "this sheet's own edge", not a floating rounded
  //   hole with a corner that doesn't correspond to anything real.
  // - lessonExercise spans almost the entire screen below the header — a
  //   hole there would leave the dim as a meaningless thin frame, so it
  //   keeps the plain uniform dim instead (skipHole below).
  const isTabTarget = !!step.target && step.target.startsWith('tab');
  const skipHole = step.target === 'lessonExercise';

  let holeD = '';
  if (rect && !skipHole) {
    const holePad = isTabTarget ? 0 : PAD;
    const holeX = rect.x - holePad;
    const holeY = rect.y - holePad;
    const holeW = rect.width + holePad * 2;
    const holeH = rect.height + holePad * 2;

    const isRoundButton = Math.abs(rect.width - rect.height) < rect.width * 0.25;
    const isPill = !isRoundButton && rect.width / rect.height > 2.2;
    const isFlushBottom = !isRoundButton && !isPill && rect.y + rect.height > SCREEN_H - PAD - 6;

    const radius = isTabTarget
      ? 16
      : isRoundButton || isPill
      ? Math.min(holeW, holeH) / 2
      : 20;
    const rTop = radius;
    const rBottom = isFlushBottom ? 0 : radius;

    holeD = roundedRectPath(holeX, holeY, holeW, holeH, rTop, rTop, rBottom, rBottom);
  }
  const dimD = `M 0 0 H ${SCREEN_W} V ${SCREEN_H} H 0 Z` + (holeD ? ` ${holeD}` : '');

  return (
    // No statusBarTranslucent: every target rect here comes from
    // measureInWindow on the real screen behind this Modal, whose own window
    // starts below the status bar (this app doesn't render edge-to-edge —
    // see the insets.top padding used throughout). A statusBarTranslucent
    // Modal spans the full physical screen including the status bar, so its
    // (0,0) sits higher than the measured window's (0,0) — confirmed this
    // desyncs the hole from the real element the same way it used to desync
    // the old drawn ring.
    <Modal visible transparent animationType="none" onRequestClose={handleBack}>
      <View style={StyleSheet.absoluteFill}>
        <Svg pointerEvents="none" width={SCREEN_W} height={SCREEN_H} style={StyleSheet.absoluteFill}>
          <Path d={dimD} fill={DIM} fillRule="evenodd" />
        </Svg>

        <Animated.View
          style={[
            styles.cardWrap,
            { left: cardLeft, width: cardW },
            verticalStyle,
            { opacity: fade },
          ]}
        >
          {/* Tail — only when there's a real target to point at. Points up
              when the card sits below its target, down when the card sits
              above it, positioned at the target's own x (clamped so it never
              sits under the card's rounded corners). Two stacked triangles
              (a slightly larger gold one behind a white one) fake a bordered
              look with the same 2px the card's own border uses. */}
          {rect && tailCenter != null && (
            <View pointerEvents="none" style={[styles.tailWrap, cardBelow ? { top: 0 } : { bottom: 0 }]}>
              <View style={[cardBelow ? styles.tailBorderUp : styles.tailBorderDown, { left: tailCenter - TAIL_SIZE - 2 }]} />
              <View style={[cardBelow ? styles.tailFillUp : styles.tailFillDown, { left: tailCenter - TAIL_SIZE }]} />
            </View>
          )}

          <View style={styles.card} accessibilityLabel={step.title}>
            {!isFirst && (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={handleBack}
                hitSlop={hitSlop}
                activeOpacity={0.7}
                accessibilityLabel="Previous step"
              >
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M19 12H5M12 19l-7-7 7-7"
                    stroke={colors.primary}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>
            )}
            <Text style={styles.counter}>{stepIndex + 1} of {TOUR_STEPS.length}</Text>

            <View style={styles.frame}>
              <Image
                source={require('../../../assets/images/lumo_kufi.png')}
                style={styles.lumo}
                resizeMode="contain"
              />
              <Text style={styles.body}>{step.body}</Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} hitSlop={hitSlop}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
                <Text style={styles.nextText}>{isLast ? "Let's go" : 'Next'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** A rounded-rect SVG path, per-corner radii (0 degenerates to a sharp
 * corner — an SVG arc with radius 0 is just a straight line to the point,
 * so one formula covers both the flush-bottom case and the plain case). */
function roundedRectPath(x: number, y: number, w: number, h: number, rTL: number, rTR: number, rBR: number, rBL: number): string {
  return `M ${x + rTL} ${y} `
    + `H ${x + w - rTR} A ${rTR} ${rTR} 0 0 1 ${x + w} ${y + rTR} `
    + `V ${y + h - rBR} A ${rBR} ${rBR} 0 0 1 ${x + w - rBR} ${y + h} `
    + `H ${x + rBL} A ${rBL} ${rBL} 0 0 1 ${x} ${y + h - rBL} `
    + `V ${y + rTL} A ${rTL} ${rTL} 0 0 1 ${x + rTL} ${y} Z`;
}

const hitSlop = { top: 10, bottom: 10, left: 10, right: 10 };

const styles = StyleSheet.create({
  cardWrap: { position: 'absolute' },
  // The tail lives in its own absolutely-positioned strip right above/below
  // the card (not inside it) so it can sit flush against the card's border
  // without fighting the card's own borderRadius/overflow clipping.
  tailWrap: { position: 'absolute', left: 0, right: 0, height: 0 },
  tailBorderUp: {
    position: 'absolute', bottom: -2, width: 0, height: 0,
    borderLeftWidth: TAIL_SIZE + 2, borderRightWidth: TAIL_SIZE + 2, borderBottomWidth: 10,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: colors.gold,
  },
  // Same bottom-anchor as tailBorderUp (so both triangles' wide bases align
  // at the same y, right at the card edge) but narrower and 2px shorter —
  // that 2px/4px difference is what reads as a gold rim around the tip and
  // sides rather than the fill just overpainting the border outright.
  tailFillUp: {
    position: 'absolute', bottom: -2, width: 0, height: 0,
    borderLeftWidth: TAIL_SIZE, borderRightWidth: TAIL_SIZE, borderBottomWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: colors.white,
  },
  tailBorderDown: {
    position: 'absolute', top: -2, width: 0, height: 0,
    borderLeftWidth: TAIL_SIZE + 2, borderRightWidth: TAIL_SIZE + 2, borderTopWidth: 10,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: colors.gold,
  },
  // Mirror of tailFillUp: same top-anchor as tailBorderDown so both triangles'
  // wide bases align at the card edge, narrower/2px shorter to leave the rim.
  tailFillDown: {
    position: 'absolute', top: -2, width: 0, height: 0,
    borderLeftWidth: TAIL_SIZE, borderRightWidth: TAIL_SIZE, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: colors.white,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.gold,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  backBtn: {
    position: 'absolute',
    top: 10, left: 10,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    zIndex: 2,
  },
  counter: {
    position: 'absolute',
    top: 15, right: 12,
    fontFamily: 'Nunito_400Regular', fontSize: 11, color: colors.mutedText,
  },
  frame: {
    // 40, not 26: the back button occupies y 10..38 inside the card's own
    // 12px padding, and 26 landed the frame flush against it with zero
    // clearance. 40 leaves a couple of px of real breathing room.
    marginTop: 40,
    backgroundColor: 'rgba(42,125,79,0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(42,125,79,0.35)',
    borderRadius: 13,
    padding: 10,
  },
  lumo: { width: 32, height: 34, marginBottom: 6 },
  body: { fontFamily: 'Nunito_400Regular', fontSize: 12.5, color: colors.midText, lineHeight: 18 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  skipBtn: { paddingVertical: 8, paddingRight: 12 },
  skipText: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: colors.mutedText },
  nextBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  nextText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.white },
});

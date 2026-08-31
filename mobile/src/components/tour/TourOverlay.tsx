import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity, Animated, BackHandler,
  useWindowDimensions, type LayoutChangeEvent,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { useTourStore } from '../../store/tourStore';
import { TOUR_STEPS } from './tourSteps';
import { safeBottomInset } from '../../utils/responsive';

// Enough contrast that whatever shows through the cutout below reads as a
// spotlight, while the rest of the screen stays legible — the point is to
// draw the eye, not to black the screen out.
const DIM = 'rgba(4, 12, 9, 0.35)';
const PAD = 8; // how far the cutout extends past the target's own edge

// Card geometry — small and anchored right next to whatever it's describing,
// not a big fixed banner. See the sizing/positioning block inside the
// component for how these turn into an actual left/top.
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
 * back to a flat fill" — and this overlay remounts on every step. A `Path`
 * needs no id lookup at all, so that failure mode can't happen here.
 *
 * ── Why this is NOT a Modal ──────────────────────────────────────────
 * It used to be, and that was the root cause of every cutout sitting a
 * couple of dozen dp off its target. A Modal is a separate native window
 * with its own origin, while every target rect comes from a measureInWindow
 * against the host screen's window. Reconciling two windows needs a delta
 * that React Native gives no way to read at runtime, so the previous version
 * hardcoded `+ insets.top` — a value read off one device. On any device
 * whose measureInWindow origin differed (which varies with Android version
 * and edge-to-edge behaviour, and RN 0.81+ forces edge-to-edge on Android)
 * that constant was pure error, applied to every target at once.
 *
 * Rendering in the same window as the things being measured makes the
 * correction term unnecessary rather than merely better tuned: a measured
 * rect and this overlay's coordinate space are the same space by
 * construction. The dim's own size comes from this container's onLayout for
 * the same reason — no `Dimensions.get('screen')` vs window guesswork about
 * where the real bottom edge is.
 *
 * The map half is therefore hosted in MainTabs (a sibling rendered after
 * Tab.Navigator, so it paints over the tab bar) rather than inside
 * MapScreen, which cannot reach above the navigator's own tab bar.
 *
 * Touch blocking came from the Modal's native window before; it now comes
 * from this root View, which takes touches by default. That still matters:
 * every step's copy says "shows", and letting taps through would start real
 * audio and real recording behind the card.
 *
 * The narration card sits right next to the target — anchored to its own
 * edge, nudged horizontally toward its centre, with a small triangular tail
 * connecting the two — instead of parked at a fixed screen edge regardless
 * of where the target actually is.
 */
export default function TourOverlay({ screen, onFinish, onEnterLesson, onBack, onExitToOffer }: Props) {
  const window = useWindowDimensions();
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  const { active, stepIndex, rects, next, prev, stop } = useTourStore();

  // Where this overlay's own top-left sits in window coordinates.
  //
  // Target rects are measureInWindow output, i.e. window-absolute. This
  // overlay's absolute-positioned children are placed relative to ITS box,
  // and there is no guarantee those two origins coincide: the lesson host
  // renders this inside a container carrying `paddingTop: insets.top`, and
  // whether Yoga offsets an absolutely-positioned child by its parent's
  // padding has changed between Yoga versions. Rather than depend on that
  // (or on no host ever adding padding above this), the overlay measures its
  // own origin and subtracts it, which is correct for any nesting.
  //
  // This is the honest version of what the old `+ insets.top` constant was
  // groping at. The difference is that this value is read from the running
  // layout on the actual device instead of being a number someone observed
  // once and typed in.
  const rootRef = useRef<any>(null);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const measureOrigin = useCallback(() => {
    rootRef.current?.measureInWindow((x: number, y: number) => {
      setOrigin(prev => (
        Math.abs(prev.x - x) < 0.5 && Math.abs(prev.y - y) < 0.5 ? prev : { x, y }
      ));
    });
  }, []);

  // Real size of this overlay, which is exactly the window it renders into.
  // Measured rather than taken from useWindowDimensions so the dim always
  // covers precisely what it is laid over, including the strip behind the
  // system navigation bar that the reported window height can exclude.
  const [size, setSize] = useState({ w: window.width, h: window.height });
  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    measureOrigin();
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setSize(prevSize => (
        Math.abs(prevSize.w - width) < 0.5 && Math.abs(prevSize.h - height) < 0.5
          ? prevSize
          : { w: width, h: height }
      ));
    }
  }, [measureOrigin]);

  // The card's own height, measured. Its content is variable-length text, so
  // its height changes per step and with the user's font scale. The previous
  // version substituted a flat 300px estimate into the clamp that decides how
  // far above a target the card may sit, which is how the mic step ended up
  // with the card sitting on top of the mic it was describing. Kept across
  // steps rather than reset to 0, so a step change re-uses the last known
  // height for one frame instead of flashing the card at the wrong place.
  const [cardH, setCardH] = useState(0);
  const onCardLayout = useCallback((e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    if (height > 0) setCardH(prevH => (Math.abs(prevH - height) < 0.5 ? prevH : height));
  }, []);

  const SCREEN_W = size.w;
  const SCREEN_H = size.h;

  const step = TOUR_STEPS[stepIndex];
  const isMine = active && step != null && step.screen === screen;
  const isLast = stepIndex === TOUR_STEPS.length - 1;
  const isFirst = stepIndex === 0;

  const handleNext = useCallback(() => {
    const current = TOUR_STEPS[stepIndex];
    if (!current) return;
    if (stepIndex === TOUR_STEPS.length - 1) {
      stop();
      onFinish();
      return;
    }
    const upcoming = TOUR_STEPS[stepIndex + 1];
    next();
    // Hand off to the lesson half at the boundary.
    if (upcoming.screen === 'lesson' && current.screen === 'map') onEnterLesson?.();
    // Hand back to the map half when the lesson half finishes forward into
    // a map step — the tour's own trailing steps (currently just "Good
    // luck!") land back on the map, same "return to plain map" action onBack
    // already does for the backward crossing below.
    if (upcoming.screen === 'map' && current.screen === 'lesson') onBack?.();
  }, [stepIndex, next, stop, onFinish, onEnterLesson, onBack]);

  const handleBack = useCallback(() => {
    const current = TOUR_STEPS[stepIndex];
    if (!current) return;
    if (stepIndex === 0) {
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
    if (previous.screen === 'map' && current.screen === 'lesson') onBack?.();
    // Mirror of the new forward case above: stepping backward out of the
    // tour's trailing map steps re-opens the lesson half.
    if (previous.screen === 'lesson' && current.screen === 'map') onEnterLesson?.();
  }, [stepIndex, prev, stop, onFinish, onExitToOffer, onBack, onEnterLesson]);

  const handleSkip = useCallback(() => {
    stop();
    onFinish();
  }, [stop, onFinish]);

  // Hardware back used to be the Modal's onRequestClose. Without a Modal it
  // needs an explicit handler, registered only while this host owns the
  // current step so the two hosts can never both claim the same press.
  useEffect(() => {
    if (!isMine) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [isMine, handleBack]);

  // useNativeDriver is deliberately FALSE here, unlike everywhere else in this
  // app. It dates from when this was a Modal, where under Fabric the native
  // driver's hand-off to the native view never happened and the card animated
  // in JS while the real view stayed pinned at opacity 0 — an invisible
  // narration card is a dead end for the user: no Next, no Skip, nothing to
  // read. The Modal is gone, but driving one opacity from JS is cheap and
  // always paints, so there is nothing to gain by switching it back.
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isMine) return;
    measureOrigin();
    fade.setValue(0);
    const anim = Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: false });
    anim.start();
    // Belt and braces: if the animation is ever interrupted (remount
    // mid-flight), leave the card visible rather than stranded at whatever
    // partial opacity it had reached.
    return () => { anim.stop(); fade.setValue(1); };
  }, [isMine, stepIndex, fade, measureOrigin]);

  if (!isMine || !step) return null;

  // Rects are published in window coordinates; shift them into this overlay's
  // own space. origin is {0,0} whenever the overlay already starts at the
  // window origin (the map host), so this costs nothing there and corrects
  // the lesson host, whose container carries a paddingTop.
  const rawRect = step.target ? rects[step.target] : undefined;
  const rect = rawRect
    ? { ...rawRect, x: rawRect.x - origin.x, y: rawRect.y - origin.y }
    : undefined;

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
  // so its left edge can be computed without knowing its height first.
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

  // Vertical placement, using the card's REAL height. Both cases anchor by
  // `top`, which is only possible because cardH is known — the previous
  // version had to anchor the above-target case by `bottom` and clamp with a
  // guessed height, and that guess is what let the card overlap its own
  // target. Clamped into the screen so a target at either extreme (the mic at
  // the very bottom, the progress bar at the very top) still leaves the whole
  // card, and therefore Next/Skip, reachable.
  //
  // "The screen" here means the part of it the user can actually touch. This
  // overlay deliberately spans the FULL window — see the size comment above,
  // the dim has to cover the strip behind the system navigation bar too — so
  // SCREEN_H includes that strip, and clamping the card against it parked
  // Skip/Next underneath the Android back/home/recents buttons on any device
  // with a bottom inset. The dim still runs edge to edge; only the card is
  // held inside the usable box.
  const usableTop = insets.top;
  const usableBottom = SCREEN_H - insets.bottom;
  const maxTop = Math.max(usableTop + CARD_MARGIN, usableBottom - CARD_MARGIN - cardH);
  let cardTop: number;
  if (rect) {
    cardTop = cardBelow
      ? rect.y + rect.height + PAD + TARGET_GAP
      : rect.y - PAD - TARGET_GAP - cardH;
  } else {
    // No target to hug -- centre vertically in the usable area, matching
    // the horizontal centring cardLeft already does for this same case.
    // This used to always fall to the cardBelow branch (spotlightBottom
    // defaults to 0 with no rect, which is always < the 0.55 threshold, so
    // cardBelow was unconditionally true here), pinning every no-target
    // step near the bottom regardless of intent. The tour's first step
    // ("Assalamu alaikum!") is the one that actually hits this branch today
    // (2026-08-28, user: "I want this to be shown middle of screen not
    // bottom") -- but the fix is general, not special-cased to step 0, so
    // any future no-target step centres the same way.
    cardTop = (usableTop + usableBottom - cardH) / 2;
  }
  cardTop = Math.max(usableTop + CARD_MARGIN, Math.min(cardTop, maxTop));

  // ── The cutout itself ────────────────────────────────────────────
  // One rect for the whole screen, one rounded-rect for the hole; evenodd
  // punches the second out of the first. The hole's shape comes from the
  // target's own rect.radius — published by useTourTarget from that
  // element's real style (see its own call site for the value and why) —
  // never guessed here from the measured box's aspect ratio. A hint icon and
  // a Check button can both be "roughly square" while wanting completely
  // different hole shapes, which is exactly the class of bug an aspect-ratio
  // guess can't avoid.
  // - lessonExercise spans almost the entire screen below the header — a
  //   hole there would leave the dim as a meaningless thin frame, so it
  //   keeps the plain uniform dim instead (skipHole below).
  // - the feedback sheet sits flush against the bottom of the screen —
  //   squaring off the hole's bottom corners there reads as "this sheet's
  //   own edge", not a floating rounded hole with a corner that doesn't
  //   correspond to anything real. Never applied to a 'round' target: a
  //   circle/pill has no corner to square off.
  const skipHole = step.target === 'lessonExercise';

  let holeD = '';
  if (rect && !skipHole) {
    const holeX = rect.x - PAD;
    const holeY = rect.y - PAD;
    const holeW = rect.width + PAD * 2;
    const holeH = rect.height + PAD * 2;

    const isRound = rect.radius === 'round';
    const isFlushBottom = !isRound && rect.y + rect.height > SCREEN_H - PAD - 6;

    const radius = isRound ? Math.min(holeW, holeH) / 2 : (typeof rect.radius === 'number' ? rect.radius : 0);
    const rTop = radius;
    const rBottom = isFlushBottom ? 0 : radius;

    holeD = roundedRectPath(holeX, holeY, holeW, holeH, rTop, rTop, rBottom, rBottom);
  }
  // A small overshoot past the measured bounds only guards against fractional
  // dp rounding at the very edges; the container clips to its real bounds
  // regardless, so overshooting is free.
  const OVERSHOOT = 4;
  const dimD = `M ${-OVERSHOOT} ${-OVERSHOOT} H ${SCREEN_W + OVERSHOOT} V ${SCREEN_H + OVERSHOOT} H ${-OVERSHOOT} Z` + (holeD ? ` ${holeD}` : '');

  return (
    <View ref={rootRef} style={styles.root} onLayout={onContainerLayout}>
      <Svg pointerEvents="none" width={SCREEN_W} height={SCREEN_H} style={StyleSheet.absoluteFill}>
        <Path d={dimD} fill={DIM} fillRule="evenodd" />
      </Svg>

      <Animated.View
        onLayout={onCardLayout}
        style={[
          styles.cardWrap,
          { left: cardLeft, width: cardW, top: cardTop },
          // Hidden until its real height is known, so it can never paint one
          // frame at a position computed from a height of 0.
          { opacity: cardH > 0 ? fade : 0 },
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
  // Fills its host and paints above everything in it. zIndex/elevation are
  // belt and braces on top of paint order: this is rendered last by both
  // hosts, but elevation is what actually decides stacking against an
  // elevated sibling on Android, and the tab bar carries its own elevation.
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, elevation: 9999 },
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

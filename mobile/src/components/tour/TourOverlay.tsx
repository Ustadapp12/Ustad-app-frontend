import React, { useEffect, useRef } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity, Modal, Dimensions, Animated,
} from 'react-native';
import { colors } from '../../theme/colors';
import { useTourStore } from '../../store/tourStore';
import { TOUR_STEPS } from './tourSteps';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SCRIM = 'rgba(6, 20, 14, 0.82)';
const PAD = 8; // breathing room around a spotlit element

interface Props {
  /** Which half of the tour this host renders. Steps for the other half are ignored. */
  screen: 'map' | 'lesson';
  /** Runs when the tour finishes or is skipped. */
  onFinish: () => void;
  /** Runs when the last map step is done and the lesson half should open. */
  onEnterLesson?: () => void;
}

/**
 * Dim-and-spotlight overlay that walks through TOUR_STEPS.
 *
 * The cutout is four opaque rectangles arranged around the target rather than a
 * real masked hole — no masking library, no new dependency, and it composites
 * identically at this opacity.
 *
 * Note the whole thing is a Modal: the screen underneath is a display, not
 * something to poke at. Every step's copy says "shows", and letting taps
 * through would start real audio and real recording behind the card.
 */
export default function TourOverlay({ screen, onFinish, onEnterLesson }: Props) {
  const { active, stepIndex, rects, next, stop } = useTourStore();

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
  }

  function handleSkip() {
    stop();
    onFinish();
  }

  // Put the card on whichever side of the target has more room, so it never
  // covers the thing it's describing.
  const spotlightBottom = rect ? rect.y + rect.height + PAD : 0;
  const cardBelow = !rect || spotlightBottom < SCREEN_H * 0.55;

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleSkip} statusBarTranslucent>
      <View style={StyleSheet.absoluteFill}>
        {rect ? (
          <>
            <View style={[styles.scrim, { top: 0, left: 0, right: 0, height: Math.max(rect.y - PAD, 0) }]} />
            <View style={[styles.scrim, { top: rect.y + rect.height + PAD, left: 0, right: 0, bottom: 0 }]} />
            <View style={[styles.scrim, {
              top: rect.y - PAD, left: 0,
              width: Math.max(rect.x - PAD, 0), height: rect.height + PAD * 2,
            }]} />
            <View style={[styles.scrim, {
              top: rect.y - PAD, left: rect.x + rect.width + PAD,
              right: 0, height: rect.height + PAD * 2,
            }]} />
            <View
              pointerEvents="none"
              style={[styles.ring, {
                top: rect.y - PAD, left: rect.x - PAD,
                width: rect.width + PAD * 2, height: rect.height + PAD * 2,
              }]}
            />
          </>
        ) : (
          <View style={[styles.scrim, StyleSheet.absoluteFill]} />
        )}

        <Animated.View
          style={[
            styles.cardWrap,
            cardBelow ? { bottom: 56 } : { top: 90 },
            { opacity: fade },
          ]}
        >
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Image
                source={require('../../../assets/images/lumo_transparent.png')}
                style={styles.lumo}
                resizeMode="contain"
              />
              <View style={styles.headerText}>
                <Text style={styles.title}>{step.title}</Text>
                <Text style={styles.counter}>{stepIndex + 1} of {TOUR_STEPS.length}</Text>
              </View>
            </View>

            <Text style={styles.body}>{step.body}</Text>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} hitSlop={hitSlop}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
                <Text style={styles.nextText}>{isLast ? "Let's go" : 'Next'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dots}>
              {TOUR_STEPS.map((_, i) => (
                <View key={i} style={[styles.dot, i === stepIndex && styles.dotActive]} />
              ))}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const hitSlop = { top: 10, bottom: 10, left: 10, right: 10 };

const styles = StyleSheet.create({
  scrim: { position: 'absolute', backgroundColor: SCRIM },
  ring: {
    position: 'absolute',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.gold,
  },
  cardWrap: { position: 'absolute', left: 18, right: 18, maxWidth: SCREEN_W - 36 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  lumo: { width: 46, height: 46 },
  headerText: { flex: 1 },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 17, color: colors.darkText },
  counter: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: colors.placeholderText, marginTop: 2 },
  body: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: colors.midText, lineHeight: 21 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  skipBtn: { paddingVertical: 10, paddingRight: 16 },
  skipText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.mutedText },
  nextBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 32,
  },
  nextText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.white },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 14 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 16 },
});

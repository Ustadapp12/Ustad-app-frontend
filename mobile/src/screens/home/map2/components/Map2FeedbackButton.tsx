import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import FeedbackBackArt from '../art/FeedbackBackArt';
import FeedbackFrontArt from '../art/FeedbackFrontArt';
import { FIGMA_W } from '../map2Theme';
import { FEEDBACK_RIGHT, FEEDBACK_W } from '../map2Model';
import type { Map2Styles } from '../styles';

// The corner column's Review button (Map2Header's REVIEW: left 364, top 132),
// and one Journey-to-Review step (72pt) below it, in Figma points.
const COLUMN_RIGHT = FIGMA_W - 364 - FEEDBACK_W;
const COLUMN_TOP = 132 + 72;

// Floating, bottom-right above the bar (Figma: 23pt from the right edge,
// 21pt above the bar). Same look as the corner feature buttons. `inColumn`
// (short screens, see feedbackCoversRestingBoard) moves it up into the corner
// column under Review, off the surah sign the map rests on.
function Map2FeedbackButton({ S, s, bottom, topInset, inColumn, onPress }: {
  S: Map2Styles; s: number; bottom: number; topInset: number; inColumn: boolean; onPress: () => void;
}) {
  const place = inColumn
    ? { right: COLUMN_RIGHT * s, top: topInset + COLUMN_TOP * s }
    : { right: FEEDBACK_RIGHT * s, bottom };
  return (
    <TouchableOpacity style={[S.feedback, place]} activeOpacity={0.7} onPress={onPress} accessibilityLabel="Feedback">
      <View style={[S.featureBg, { left: -1 * s, top: 21 * s, width: 60.2 * s, height: 48 * s }]} />
      <Text style={[S.featureLabel, { left: 2 * s, top: 48 * s }]} numberOfLines={1}>Feedback</Text>
      <FeedbackBackArt width={46 * s} style={[styles.back, { left: 6 * s, top: 5 * s }]} />
      <FeedbackFrontArt width={44.78 * s} style={[styles.front, { left: 6 * s, top: 6.46 * s }]} />
    </TouchableOpacity>
  );
}

export default React.memo(Map2FeedbackButton);

const styles = StyleSheet.create({
  back: { position: 'absolute' },
  front: { position: 'absolute' },
});

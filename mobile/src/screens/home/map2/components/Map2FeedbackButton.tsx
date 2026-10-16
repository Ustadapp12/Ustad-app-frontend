import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import FeedbackBackArt from '../art/FeedbackBackArt';
import FeedbackFrontArt from '../art/FeedbackFrontArt';
import type { Map2Styles } from '../styles';

// Floating, bottom-right above the bar (Figma: 23pt from the right edge,
// 21pt above the bar). Same look as the corner feature buttons.
function Map2FeedbackButton({ S, s, bottom, onPress }: { S: Map2Styles; s: number; bottom: number; onPress: () => void }) {
  return (
    <TouchableOpacity style={[S.feedback, { right: 23 * s, bottom }]} activeOpacity={0.7} onPress={onPress} accessibilityLabel="Feedback">
      <View style={[S.featureBg, { left: -1 * s, top: 21 * s, width: 60.2 * s, height: 48 * s }]} />
      <Text style={[S.featureLabel, { left: 2 * s, top: 48 * s }]} numberOfLines={1}>Feedback</Text>
      <FeedbackBackArt width={46 * s} style={{ position: 'absolute', left: 6 * s, top: 5 * s }} />
      <FeedbackFrontArt width={44.78 * s} style={{ position: 'absolute', left: 6 * s, top: 6.46 * s }} />
    </TouchableOpacity>
  );
}

export default React.memo(Map2FeedbackButton);

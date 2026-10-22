import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import LottieView from 'lottie-react-native';
import { colors } from '../../../theme';
import LumoInfoModal from '../../../components/LumoInfoModal';
import LoadingStatusText from '../../../components/LoadingStatusText';
import BackButton from '../../../components/BackButton';
import { S, LL } from '../styles';
import { ANIMATIONS } from '../../../assets';

// The three full-screen states the lesson can be in before an exercise shows.
// Moved out of LessonSessionScreen (2026-10-22 split); markup unchanged.

/** The lesson failed to load. */
export function LessonLoadError({ insetTop, error, onRetry, onBack }: {
  insetTop: number;
  error: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  // Only this screen uses it, so it lives here rather than in the lesson screen.
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  return (
    <View style={[S.center, { paddingTop: insetTop }]}>
      <LottieView
        source={ANIMATIONS.n404}
        autoPlay loop
        style={{ width: 200, height: 200 }}
      />
      <Text style={S.errorTitle}>Couldn't load the lesson</Text>
      <Text style={S.errorMsg}>{error}</Text>
      <TouchableOpacity style={S.retryBtn} onPress={onRetry}>
        <Text style={S.retryBtnText}>Try again</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onBack} style={{ marginTop: 12 }}>
        <Text style={{ color: colors.mutedText, fontFamily: 'Nunito-Regular' }}>Go back</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setFeedbackVisible(true)} style={{ marginTop: 16 }}>
        <Text style={{ color: colors.primary, fontFamily: 'Nunito-Bold', fontSize: 13 }}>Give feedback</Text>
      </TouchableOpacity>
      <LumoInfoModal
        visible={feedbackVisible}
        onClose={() => setFeedbackVisible(false)}
        title="Still stuck?"
        message="Email us and we'll sort it out."
        contactEmail="helo.ustadapp@gmail.com"
      />
    </View>
  );
}

/** Session loaded but the backend has no exercises for it yet. */
export function LessonNotReady({ insetTop, onRetry, onBackToMap }: {
  insetTop: number;
  onRetry: () => void;
  onBackToMap: () => void;
}) {
  return (
    <View style={[S.center, { paddingTop: insetTop }]}>
      <LottieView
        source={ANIMATIONS.loading}
        autoPlay loop
        style={{ width: 140, height: 140 }}
      />
      <Text style={S.errorTitle}>Creating your custom environment</Text>
      <LoadingStatusText
        style={S.errorMsg}
        messages={['Your exercises are being prepared…', 'This usually takes a moment…', 'Almost ready…']}
      />
      <TouchableOpacity style={S.retryBtn} onPress={onRetry}>
        <Text style={S.retryBtnText}>Try Again</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onBackToMap} style={{ marginTop: 12 }}>
        <Text style={{ color: colors.mutedText, fontFamily: 'Nunito-Regular' }}>Back to Map</Text>
      </TouchableOpacity>
    </View>
  );
}

/** Still loading. Same Lottie and copy as LessonNotReady, so the learner never
 * sees two different-sounding loading messages back to back for what's
 * effectively the same wait. No retry here: it resolves on its own; the back
 * button is a safety net in case a load ever hangs. */
export function LessonLoading({ insetTop, onBackToMap }: { insetTop: number; onBackToMap: () => void }) {
  return (
    <View style={S.center}>
      <BackButton
        style={[LL.backBtn, { top: insetTop + 10 }]}
        onPress={onBackToMap}
        accessibilityLabel="Back to map"
      />
      <LottieView
        source={ANIMATIONS.loading}
        autoPlay loop
        style={{ width: 140, height: 140 }}
      />
      <Text style={S.errorTitle}>Creating your custom environment</Text>
      <LoadingStatusText style={S.errorMsg} />
    </View>
  );
}

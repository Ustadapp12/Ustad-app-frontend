import React from 'react';
import { View, Text, TouchableOpacity, Image, Pressable } from 'react-native';
import LottieView from 'lottie-react-native';
import { TOUR_GLOW } from '../../../../components/tour/tourGlow';
import ExerciseLayout from '../../../../components/lesson/ExerciseLayout';
import UstadSays from '../../../../components/lesson/UstadSays';
import { RecitationScoringFeedback } from '../../components/RecitationScoringFeedback';
import { SpeakResultBanner } from '../../components/SpeakResultBanner';
import { RETRY_BUBBLE_TEXT, type Character } from '../../lessonShared';
import { ANIMATIONS, LESSON_IMAGES } from '../../../../assets';
import type { SpeakAttempt } from './useSpeakAttempt';
import { styles } from './styles';

/**
 * Everything a recitation exercise shares around its own content: Ustad's
 * bubble, the mic area pinned below (mic, Skip, error), and the retry-choice
 * sheet. `children` is what the user recites from (word chips, ayah card).
 */
export function SpeakExerciseShell({
  speak, character, surahName, ayahNo, bubbleText, scoringText, onSkip, micButtonRef, glowMic, children,
}: {
  speak: SpeakAttempt;
  character: Character;
  surahName: string;
  ayahNo: number | string | undefined;
  bubbleText: string;
  /** Shown above the scoring animation; omit to show none. */
  scoringText?: string;
  onSkip: () => void;
  /** Tour-only: lets TourLessonScreen measure the real mic button, for the cutout hole. */
  micButtonRef?: React.Ref<View>;
  /** Tour-only: glow the real mic button itself. */
  glowMic?: boolean;
  children: React.ReactNode;
}) {
  const { speakState, error, pendingResult, handleMicTap, handleRetry, handleDeclineRetry, dismissError } = speak;

  const instruction = speakState === 'recording'
    ? 'Recording… tap to stop'
    : speakState === 'scoring'
    ? scoringText
    : 'Tap the mic to start, tap again to stop and check';

  // Pinned below the content so the mic is always reachable on every screen size.
  const micArea = speakState !== 'done' && speakState !== 'retry_choice' ? (
    <View style={styles.micArea}>
      {!!instruction && <Text style={styles.micInstruction}>{instruction}</Text>}

      {speakState === 'scoring' ? (
        <RecitationScoringFeedback />
      ) : (
        <View ref={micButtonRef} collapsable={false}>
          <Pressable
            onPress={handleMicTap}
            style={({ pressed }) => [styles.micBtn, pressed && styles.micBtnActive, glowMic && TOUR_GLOW]}
          >
            {speakState === 'recording' ? (
              <LottieView source={ANIMATIONS.listen} autoPlay loop style={styles.listenAnim} />
            ) : (
              <Image source={LESSON_IMAGES.mic} style={styles.micImage} resizeMode="contain" />
            )}
          </Pressable>
        </View>
      )}

      {/* Every recitation question is skippable — for people who don't
          want to attempt speaking at all. Only offered before a
          recording is made; once there's an attempt in flight/scored,
          the retry-choice's own Next button covers "move on" instead. */}
      {speakState === 'idle' && (
        <TouchableOpacity style={styles.skipBtn} onPress={onSkip}>
          <Text style={styles.skipBtnText}>Skip</Text>
        </TouchableOpacity>
      )}

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={dismissError}>
            <Text style={styles.retryLink}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  ) : null;

  return (
    <View style={styles.outer}>
      <ExerciseLayout footer={micArea}>
        <UstadSays
          character={character}
          text={speakState === 'retry_choice' ? RETRY_BUBBLE_TEXT : bubbleText}
          label={`Surah ${surahName} · Verse ${ayahNo}`}
        />
        {children}
      </ExerciseLayout>

      {/* Retry-choice bottom sheet — same visual treatment as the final
          result banner, just with Try Again / Next instead of Continue. */}
      {speakState === 'retry_choice' && pendingResult && (
        <SpeakResultBanner result={pendingResult} onAdvance={handleDeclineRetry} onRetry={handleRetry} />
      )}
    </View>
  );
}

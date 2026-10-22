import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { saveOnboarding, setOnboardingDone } from '../../utils/storage';
import { stopAudio } from '../../services/audioPlayer';
import { JUZ30_SURAHS } from '../../data/juz30Surahs';
import LoadingSpinner from '../../components/LoadingSpinner';
import MascotShadow from '../../components/MascotShadow';
import LumoInfoModal from '../../components/LumoInfoModal';
import { CHARACTERS, characterForIndex, shuffleIndices, type Character } from '../lesson/lessonShared';
import { ExerciseSlide } from '../lesson/components/ExerciseSlide';
import { FillBlankOrNextWord } from '../lesson/exercises/FillBlankOrNextWord';
import { ReorderOrSequence } from '../lesson/exercises/ReorderOrSequence';
import { SequenceExercise } from '../lesson/exercises/SequenceExercise';
import { SegmentRecall } from '../lesson/exercises/SegmentRecall';
import { AudioFill } from '../lesson/exercises/AudioFill';
import { HearAndSelect } from '../lesson/exercises/HearAndSelect';
import { AyatThenOrder } from '../lesson/exercises/AyatThenOrder';
import LessonProgressBar from '../../components/lesson/LessonProgressBar';
import { safeBottomInset } from '../../utils/responsive';
import type { ExerciseDict } from '../../types/api';
import type { RootNavProp } from '../../navigation/types';
import { S } from './OnboardAssessmentScreen.styles';
import { MASCOT } from '../../assets';
import { useHifzAssessment, useProfileActions } from '../../hooks/api';

interface Props { navigation: RootNavProp }

// The 7 placement questions and their grading now live entirely on the backend
// (GET /onboarding/hifz-assessment returns the exercises; POST /.../submit grades
// the whole batch by question_id). This screen fetches them, walks the user
// through each using the exact same exercise UI as a real lesson — but with no
// hearts, no hint, and no per-question feedback (there's no answer key on the
// client to grade against) — then submits all answers at once for scoring.
type AssessmentPhase = 'intro' | 'loading' | 'exercise' | 'error';

interface Answer {
  question_id: string;
  user_answer: string | string[];
  time_seconds: number;
}

// Bare surah name for the exercise speech bubble, which prefixes "Surah " itself.
// Falls back to an empty string (never "Surah 0") when the number is unknown or
// the question spans multiple surahs (e.g. an ayah-sequence question).
function surahNameFor(surahNo: number): string {
  return JUZ30_SURAHS.find(s => s.surah_number === surahNo)?.name_en ?? '';
}

export default function OnboardAssessmentScreen({ navigation }: Props) {
  const { saveProfile } = useProfileActions();
  const assessment = useHifzAssessment();
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };

  const [phase, setPhase] = useState<AssessmentPhase>('intro');
  const [exercises, setExercises] = useState<ExerciseDict[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);

  const charOrderRef = useRef<number[]>(shuffleIndices(CHARACTERS.length));
  const answersRef = useRef<Answer[]>([]);
  const questionStartRef = useRef(0);
  const sessionStartRef = useRef(0);
  // Synchronous re-entry guard: the last question stays mounted during the
  // async submit, so a double-tap on Check could otherwise fire twice.
  const finishingRef = useRef(false);

  useFocusEffect(useCallback(() => () => { stopAudio(); }, []));

  const beginAssessment = async () => {
    setPhase('loading');
    await saveOnboarding({ currentStep: 'assessment' });
    try {
      const res = await assessment.start();
      if (!res.exercises?.length) { setPhase('error'); return; }
      answersRef.current = [];
      finishingRef.current = false;
      setExercises(res.exercises);
      setCurrentIdx(0);
      const now = Date.now();
      questionStartRef.current = now;
      sessionStartRef.current = now;
      setPhase('exercise');
    } catch (e) {
      console.warn('[assessment] start failed:', e);
      setPhase('error');
    }
  };

  // Record the answer and advance. There's no per-question correct/incorrect
  // feedback: grading is batched server-side, so we just move on until the last
  // question, then submit everything at once.
  const handleSubmit = (userAnswer: string | string[]) => {
    if (submitting || finishingRef.current || currentIdx >= exercises.length) return;
    const ex = exercises[currentIdx];
    const timeSeconds = Math.round((Date.now() - questionStartRef.current) / 1000);
    answersRef.current = [
      ...answersRef.current,
      { question_id: ex.ex_id, user_answer: userAnswer, time_seconds: timeSeconds },
    ];
    stopAudio();

    if (answersRef.current.length >= exercises.length) {
      void finishAssessment();
    } else {
      setCurrentIdx(i => i + 1);
      questionStartRef.current = Date.now();
    }
  };

  const finishAssessment = async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setSubmitting(true);
    const totalTimeSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);
    let correctCount = 0;
    let scorePct = 0;
    try {
      const res = await assessment.submit({
        answers: answersRef.current,
        total_time_seconds: totalTimeSeconds,
      });
      correctCount = res.results.filter(r => r.correct).length;
      scorePct = Math.round(res.accuracy_pct);
    } catch (e) {
      // Never trap the user in onboarding — if grading fails, still complete it.
      console.warn('[assessment] submit failed:', e);
    }
    await saveOnboarding({ hifzAssessmentScore: correctCount });
    await setOnboardingDone(true);
    // Persist account-level completion too — see the matching comment in
    // OnboardPathScreen's beginner branch. Best effort: never trap the user
    // in onboarding over a network failure here.
    try {
      await saveProfile({ onboarding_completed: true });
    } catch {
      // ignored — see comment above
    }
    navigation.replace('LessonComplete', { xp: correctCount * 2, scorePct, stars: 3 });
  };

  const handleClose = () => {
    stopAudio();
    navigation.navigate('OnboardPath');
  };

  if (phase === 'intro') {
    return (
      <IntroScreen
        onBegin={beginAssessment}
        onClose={handleClose}
        insetTop={insets.top}
        insetBottom={insets.bottom}
      />
    );
  }

  if (phase === 'loading' || submitting) {
    return (
      <View style={[S.screen, S.center, { paddingTop: insets.top }]}>
        <LoadingSpinner size={44} label="Loading…" />
      </View>
    );
  }

  if (phase === 'error') {
    return (
      <View style={[S.screen, S.center, { paddingTop: insets.top }]}>
        <Text style={S.errorTitle}>Couldn't load the assessment</Text>
        <Text style={S.errorMsg}>Please check your connection and try again.</Text>
        <TouchableOpacity style={S.retryBtn} onPress={beginAssessment}>
          <Text style={S.retryBtnText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.skipBtn} onPress={handleClose}>
          <Text style={S.skipBtnText}>Go back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.skipBtn} onPress={() => setFeedbackVisible(true)}>
          <Text style={S.skipBtnText}>Give feedback</Text>
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

  // phase === 'exercise'
  const ex = exercises[currentIdx];
  if (!ex) return null;
  const character = characterForIndex(charOrderRef.current, currentIdx);
  const surahName = surahNameFor(ex.surah_no);
  const progress = (currentIdx + 1) / exercises.length;

  return (
    <View style={[S.screen, { paddingTop: insets.top }]}>
      {/* Top bar: X + progress bar only — no hearts, no hint */}
      <View style={S.header}>
        <TouchableOpacity style={S.backBtn} onPress={handleClose}>
          <Text style={S.backText}>✕</Text>
        </TouchableOpacity>
        <LessonProgressBar fraction={progress} />
      </View>

      <View style={S.exerciseArea}>
        <ExerciseSlide key={ex.ex_id}>
          <ExerciseContent ex={ex} surahName={surahName} character={character} onSubmit={handleSubmit} />
        </ExerciseSlide>
      </View>
    </View>
  );
}

// Picks the matching lesson exercise renderer for the question type. Uses the
// exact same components as LessonSessionScreen, passed locked={false} since
// there's no post-answer feedback state in the assessment.
function ExerciseContent({
  ex, surahName, character, onSubmit,
}: {
  ex: ExerciseDict;
  surahName: string;
  character: Character;
  onSubmit: (ans: string | string[]) => void;
}) {
  const common = { ex, surahName, character, locked: false as const };
  switch (ex.type) {
    case 'fill_blank':
    case 'next_word':
      return <FillBlankOrNextWord {...common} onSubmit={onSubmit} />;
    case 'audio_fill':
      return <AudioFill {...common} onSubmit={onSubmit} />;
    case 'reorder':
      return <ReorderOrSequence {...common} onSubmit={onSubmit} />;
    case 'sequence':
      return <SequenceExercise {...common} onSubmit={onSubmit} />;
    case 'segment_recall':
      return <SegmentRecall {...common} onSubmit={onSubmit} />;
    case 'hear_and_select':
      return <HearAndSelect {...common} onSubmit={onSubmit} />;
    case 'ayat_then_order':
      return <AyatThenOrder {...common} onSubmit={onSubmit} />;
    default:
      return null;
  }
}

function IntroScreen({
  onBegin,
  onClose,
  insetTop,
  insetBottom,
}: {
  onBegin: () => void;
  onClose: () => void;
  insetTop: number;
  insetBottom: number;
}) {
  return (
    <View style={[S.screen, { paddingTop: insetTop }]}>
      <View style={S.introHeaderRow}>
        <TouchableOpacity
          style={S.closeBtn}
          onPress={onClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={S.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={S.introScroll} showsVerticalScrollIndicator={false}>
        <View style={S.introContent}>
          <View style={{ width: 140, height: 140, marginBottom: 24 }}>
            <Image
              source={MASCOT.lumoTransparent}
              style={[S.lumoIntro, { marginBottom: 0 }]}
              resizeMode="contain"
            />
            <MascotShadow width={140} />
          </View>
          <Text style={S.introText}>Let's see how much you know?</Text>
        </View>
      </ScrollView>

      <View style={[S.footer, { paddingBottom: insetBottom + 12 }]}>
        <TouchableOpacity style={S.beginBtn} onPress={onBegin}>
          <Text style={S.beginBtnText}>LETS GO!</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

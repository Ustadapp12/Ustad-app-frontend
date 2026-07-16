import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { learningApi } from '../../api';
import { saveOnboarding, setOnboardingDone } from '../../utils/storage';
import { colors } from '../../theme/colors';
import { stopAudio } from '../../services/audioPlayer';
import { JUZ30_SURAHS } from '../../data/juz30Surahs';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  CHARACTERS,
  characterForIndex,
  shuffleIndices,
  ProgressBar,
  ExerciseSlide,
  FillBlankOrNextWord,
  ReorderOrSequence,
  SequenceExercise,
  SegmentRecall,
  AudioFill,
  HearAndSelect,
  AyatThenOrder,
  type Character,
} from '../lesson/LessonSessionScreen';
import type { ExerciseDict } from '../../types/api';
import type { RootNavProp } from '../../navigation/types';

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
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<AssessmentPhase>('intro');
  const [exercises, setExercises] = useState<ExerciseDict[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);

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
      const res = await learningApi.hifzAssessmentStart();
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
      const res = await learningApi.hifzAssessmentSubmit({
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
        <ProgressBar fraction={progress} />
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
          <Image
            source={require('../../../assets/images/lumo_transparent.png')}
            style={S.lumoIntro}
            resizeMode="contain"
          />
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

const S = StyleSheet.create({
  // Session chrome — mirrors LessonSessionScreen's header/screen so the
  // assessment looks like a real lesson session (minus hearts + hint).
  screen: { flex: 1, backgroundColor: colors.lightBg },
  center: { alignItems: 'center', justifyContent: 'center', padding: 28 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  backText: { fontSize: 14, color: colors.mutedText },
  exerciseArea: { flex: 1 },

  errorTitle: { fontFamily: 'Nunito_700Bold', fontSize: 18, color: colors.darkText, marginBottom: 8, textAlign: 'center' },
  errorMsg: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.mutedText, textAlign: 'center', marginBottom: 24 },
  retryBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 },
  retryBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: colors.white },
  skipBtn: { marginTop: 14, paddingVertical: 10, paddingHorizontal: 20 },
  skipBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.mutedText },

  // Intro screen
  introHeaderRow: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 6 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 16, color: colors.darkText, fontWeight: '700' },
  introScroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 22 },
  introContent: { alignItems: 'center' },
  lumoIntro: { width: 120, height: 120, marginBottom: 24 },
  introText: { fontFamily: 'Nunito_700Bold', fontSize: 20, color: colors.darkText, textAlign: 'center', lineHeight: 28 },
  footer: { paddingHorizontal: 22, paddingTop: 12 },
  beginBtn: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  beginBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: colors.white },
});

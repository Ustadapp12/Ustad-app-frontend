import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../ui/AppText';
import { EmojiText } from '../ui/EmojiText';
import { PrimaryButton } from '../ui/PrimaryButton';
import { LessonShell } from './LessonShell';
import { AudioPlayButton } from '../ui/AudioPlayButton';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { copy } from '../../i18n/copy';
import { getReciterId } from '../../utils/storage';
import { progressApi } from '../../api';
import { playAudioUrl } from '../../services/audioPlayer';
import { resolveAyahPlayUrl, resolveWordPlayUrl, warmAudioUrlCache } from '../../services/audioUrls';
import { SpeakerIcon } from '../ui/Icons';
import type { ExerciseStep } from '../../lesson/types';
import { wordsInAyahOrder } from '../../lesson/wordOrder';
import {
  getFillBlankCorrectAnswer,
  resolveBlankDisplay,
  resolveFullAyahArabic,
} from '../../lesson/exerciseHelpers';
import { ayahIdForApi } from '../../utils/ayahId';
import type { WordOut } from '../../types/api';

interface Props {
  step: ExerciseStep;
  stepIndex: number;
  total: number;
  hearts: number;
  sessionId?: string | null;
  onClose: () => void;
  onComplete: (correct: boolean) => void;
}

export function ExerciseRenderer({ step, stepIndex, total, hearts, sessionId, onClose, onComplete }: Props) {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, spacing.sm);

  // answer state
  const [selected, setSelected] = useState<number | null>(null);
  const [filledWord, setFilledWord] = useState<string | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [seqOrder, setSeqOrder] = useState<number[]>([]);
  const [selectedWordPos, setSelectedWordPos] = useState<number | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  // listen_repeat
  const recordStartRef = useRef<number | null>(null);
  const [recordedMs, setRecordedMs] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  // feedback
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  // animations
  const feedbackSlide = useRef(new Animated.Value(200)).current;
  const correctScale  = useRef(new Animated.Value(1)).current;
  const wrongShake    = useRef(new Animated.Value(0)).current;
  const advancingRef  = useRef(false);

  useEffect(() => {
    advancingRef.current = false;
    let cancelled = false;
    (async () => {
      await warmAudioUrlCache();
      const id = await getReciterId();
      const url = await resolveAyahPlayUrl(step.ayah, step.ayahAudioUrl, id);
      if (!cancelled) setAudioUrl(url);
    })();
    return () => { cancelled = true; };
  }, [step.ayah, step.ayahAudioUrl, stepIndex, step.type]);

  const resetLocal = () => {
    setSelected(null);
    setFilledWord(null);
    setOrder([]);
    setSeqOrder([]);
    setSelectedWordPos(null);
    setRecordedMs(null);
    setRecording(false);
    setChecked(false);
    feedbackSlide.setValue(200);
    correctScale.setValue(1);
  };

  // ── Animations ────────────────────────────────────────────────
  const animateCorrect = () => {
    Animated.sequence([
      Animated.spring(correctScale, { toValue: 1.12, useNativeDriver: true, tension: 200, friction: 5 }),
      Animated.spring(correctScale, { toValue: 1,    useNativeDriver: true, tension: 200, friction: 5 }),
    ]).start();
  };

  const animateWrong = () => {
    Animated.sequence([
      Animated.timing(wrongShake, { toValue: 10,  duration: 50,  useNativeDriver: true }),
      Animated.timing(wrongShake, { toValue: -10, duration: 50,  useNativeDriver: true }),
      Animated.timing(wrongShake, { toValue: 6,   duration: 40,  useNativeDriver: true }),
      Animated.timing(wrongShake, { toValue: -6,  duration: 40,  useNativeDriver: true }),
      Animated.timing(wrongShake, { toValue: 0,   duration: 30,  useNativeDriver: true }),
    ]).start();
  };

  const showFeedbackPanel = (correct: boolean) => {
    if (correct) animateCorrect(); else animateWrong();
    Animated.spring(feedbackSlide, { toValue: 0, useNativeDriver: true, tension: 90, friction: 10 }).start();
  };

  const handleContinue = useCallback(() => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    Animated.timing(feedbackSlide, { toValue: 200, duration: 180, useNativeDriver: true }).start(() => {
      onComplete(isCorrect);
      resetLocal();
    });
  }, [isCorrect, onComplete]);

  // ── Correctness logic ─────────────────────────────────────────
  const handleCheck = async () => {
    if (checked || advancingRef.current) return;
    let correct = false;
    switch (step.type) {
      case 'listen':
      case 'interstitial':
        correct = true;
        break;
      case 'fill_blank':
        correct = filledWord === getFillBlankCorrectAnswer(step);
        break;
      case 'reorder':
        correct = step.correctOrder
          ? order.join('|') === step.correctOrder.join('|')
          : order.join('|') === step.ayah.words.map(w => w.arabic).join('|');
        break;
      case 'match_meaning':
      case 'mcq':
      case 'word_meaning':
      case 'continue_ayah':
        correct = selected === (step.correctIndex ?? -1);
        break;
      case 'sequence_order':
        correct = seqOrder.join(',') === (step.sequenceAyahs?.map(a => a.number) ?? []).join(',');
        break;
      case 'listen_repeat': {
        const dur = recordedMs ?? 0;
        if (sessionId) {
          try {
            const res = await progressApi.voiceAttempt({
              session_id: sessionId,
              ayah_id: ayahIdForApi(step.ayah),
              duration_ms: dur,
            });
            correct = res.passed;
          } catch { correct = dur >= 2000; }
        } else { correct = dur >= 2000; }
        break;
      }
      default: correct = true;
    }
    setIsCorrect(correct);
    setChecked(true);
    showFeedbackPanel(correct);
  };

  // ── Can-submit guard ──────────────────────────────────────────
  const canCheck = (): boolean => {
    switch (step.type) {
      case 'listen': case 'interstitial': return true;
      case 'listen_repeat': return (recordedMs ?? 0) > 0;
      case 'fill_blank':     return filledWord != null;
      case 'reorder':        return order.length === (step.scrambledWords?.length ?? step.ayah.words.length);
      case 'sequence_order': return seqOrder.length === (step.sequenceAyahs?.length ?? 0);
      default:               return selected != null;
    }
  };

  // ── Prompt labels ─────────────────────────────────────────────
  const promptLabel = (): string => {
    switch (step.type) {
      case 'listen':         return 'Listen to the recitation';
      case 'listen_repeat':  return 'Listen, then repeat aloud';
      case 'fill_blank':     return 'Fill in the missing word';
      case 'reorder':        return 'Build the ayah — tap words in order';
      case 'match_meaning':  return 'What does this ayah mean?';
      case 'word_meaning':   return 'What does this word mean?';
      case 'continue_ayah':  return 'What comes next?';
      case 'sequence_order': return 'Put the ayahs in the correct order';
      case 'interstitial':   return copy.streakGoal.tip;
      default:               return 'Choose the correct answer';
    }
  };

  // ── Compact audio chip shown on exercises that aren't dedicated listen steps ──
  const AudioChip = () => {
    const [playing, setPlaying] = useState(false);
    if (!audioUrl) return null;
    return (
      <Pressable
        style={[styles.audioChip, playing && styles.audioChipPlaying]}
        disabled={playing}
        onPress={async () => {
          setPlaying(true);
          try { await playAudioUrl(audioUrl); } finally { setPlaying(false); }
        }}>
        <SpeakerIcon size={13} color={playing ? colors.white : colors.primary} />
        <AppText style={[styles.audioChipLabel, playing && styles.audioChipLabelPlaying]}>
          {playing ? 'Playing…' : 'Play ayah'}
        </AppText>
      </Pressable>
    );
  };

  // ── Body ─────────────────────────────────────────────────────
  const renderBody = () => {
    if (step.type === 'interstitial') {
      const pct = total > 0 ? Math.round((stepIndex / total) * 100) : 50;
      return (
        <View style={styles.center}>
          <EmojiText size={56}>🌟</EmojiText>
          <AppText variant="h2" style={[styles.centerText, styles.interstitialHeading]}>
            Halfway there!
          </AppText>
          <AppText style={styles.interstitialSub}>
            {pct}% of this lesson complete — keep going!
          </AppText>
          <View style={styles.interstitialProgress}>
            <View style={[styles.interstitialFill, { width: `${pct}%` }]} />
          </View>
          <View style={styles.interstitialCard}>
            <EmojiText size={18}>💡</EmojiText>
            <AppText style={styles.interstitialTip}>{copy.streakGoal.tip}</AppText>
          </View>
          {step.ayah.arabic ? (
            <View style={styles.interstitialAyahWrap}>
              <AppText style={styles.interstitialAyahLabel}>Today's ayah</AppText>
              <AppText variant="arabic" style={styles.interstitialAyah}>
                {step.ayah.arabic}
              </AppText>
            </View>
          ) : null}
        </View>
      );
    }

    return (
      <Animated.View style={{ flex: 1, transform: [{ translateX: wrongShake }] }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* ── Prompt ─ */}
          <AppText style={styles.prompt}>{promptLabel()}</AppText>

          {/* ══ LISTEN ═══════════════════════════════════════════ */}
          {(step.type === 'listen' || step.type === 'listen_repeat') && (() => {
            const listenWords = step.metadataWords ?? step.ayah.words ?? [];
            const hasWords = listenWords.length > 0;
            const fullAyah = resolveFullAyahArabic(step.ayah.arabic, listenWords);
            return (
            <View style={styles.listenBlock}>
              <AudioPlayButton url={audioUrl} label="Play full ayah" />
              {fullAyah ? (
                <View style={styles.ayahCard}>
                  <AppText variant="arabic" style={styles.ayahCardText}>
                    {fullAyah}
                  </AppText>
                </View>
              ) : null}
              {hasWords ? (
                <>
                  <AppText style={styles.tapHint}>
                    Listen above, then tap each word
                  </AppText>
                  <View style={styles.wordRow}>
                    {wordsInAyahOrder(listenWords).map(w => (
                      <WordChip key={w.position} word={w}
                        selected={selectedWordPos === w.position}
                        onPress={() => setSelectedWordPos(w.position)} />
                    ))}
                  </View>
                  {selectedWordPos !== null && (() => {
                    const w = listenWords.find(x => x.position === selectedWordPos);
                    return w ? (
                      <View style={styles.wordInfoCard}>
                        <AppText style={styles.wordTrans}>{w.transliteration}</AppText>
                        {w.meaning ? <AppText style={styles.wordMeaning}>{w.meaning}</AppText> : null}
                      </View>
                    ) : null;
                  })()}
                </>
              ) : null}
              {step.type === 'listen_repeat' && !checked && (
                <Pressable onPressIn={() => { recordStartRef.current = Date.now(); setRecording(true); }}
                  onPressOut={() => { if (recordStartRef.current) setRecordedMs(Date.now() - recordStartRef.current); setRecording(false); }}
                  style={[styles.recordBtn, recording && styles.recordBtnActive]}>
                  <AppText style={styles.recordBtnText}>
                    {recording ? '🎙  Recording…' : recordedMs ? '✓  Recorded — tap Check' : '🎙  Hold to repeat aloud'}
                  </AppText>
                </Pressable>
              )}
            </View>
            );
          })()}

          {/* ══ FILL BLANK ═══════════════════════════════════════ */}
          {step.type === 'fill_blank' && (() => {
            const correctAnswer = getFillBlankCorrectAnswer(step);
            const options = step.options ?? step.ayah.words.map(w => w.arabic);
            return (
            <View style={styles.fillBlankBlock}>
              <AudioChip />
              <View style={styles.blankAyahCard}>
                <AppText variant="arabic" style={styles.blankAyahText}>
                  {resolveBlankDisplay(step)}
                </AppText>
              </View>
              <AppText style={styles.tileHint}>Choose the missing word</AppText>
              <View style={styles.tileRow}>
                {options.map((w, i) => {
                  const isSelected = filledWord === w;
                  const isRight = checked && w === correctAnswer;
                  const isWrong = checked && isSelected && w !== correctAnswer;
                  return (
                    <Pressable key={`${w}-${i}`} disabled={checked}
                      onPress={() => setFilledWord(w)}
                      style={[styles.tile, isSelected && styles.tileSelected, isRight && styles.tileCorrect, isWrong && styles.tileWrong]}>
                      {isRight  && <AppText style={styles.tileCheck}>✓</AppText>}
                      {isWrong  && <AppText style={styles.tileX}>✗</AppText>}
                      <AppText variant="arabic" style={styles.tileText}>{w}</AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            );
          })()}

          {/* ══ REORDER ══════════════════════════════════════════ */}
          {step.type === 'reorder' && (
            <View style={styles.reorderBlock}>
              {/* Drop zone — no full ayah shown */}
              <View style={[styles.dropZone, order.length > 0 && styles.dropZoneActive]}>
                {order.length === 0
                  ? <AppText style={styles.dropZonePlaceholder}>Tap words below to build the ayah</AppText>
                  : order.map((w, i) => (
                      <Pressable key={`${w}-${i}`} disabled={checked}
                        onPress={() => setOrder(order.filter((_, j) => j !== i))}
                        style={styles.tile}>
                        <AppText variant="arabic" style={styles.tileText}>{w}</AppText>
                      </Pressable>
                    ))
                }
              </View>
              <View style={styles.tileRow}>
                {(step.scrambledWords ?? step.ayah.words.map(w => w.arabic))
                  .filter(w => order.filter(x => x === w).length < (step.scrambledWords ?? step.ayah.words.map(x => x.arabic)).filter(x => x === w).length)
                  .map((w, i) => (
                    <Pressable key={`${w}-${i}`} disabled={checked}
                      onPress={() => setOrder([...order, w])} style={styles.tile}>
                      <AppText variant="arabic" style={styles.tileText}>{w}</AppText>
                    </Pressable>
                  ))}
              </View>
            </View>
          )}

          {/* ══ CONTINUE AYAH ════════════════════════════════════ */}
          {step.type === 'continue_ayah' && (
            <View style={styles.continueBlock}>
              <AudioChip />
              <View style={styles.shownAyahCard}>
                <AppText style={styles.shownLabel}>COMPLETE THIS</AppText>
                <AppText variant="arabic" style={styles.shownAyah}>
                  {step.shownAyahAr ?? step.ayah.arabic}
                </AppText>
              </View>
              <View style={styles.optionList}>
                {step.options?.map((opt, i) => {
                  const isSel   = selected === i;
                  const isRight = checked && i === step.correctIndex;
                  const isWrong = checked && isSel && i !== step.correctIndex;
                  return (
                    <Pressable key={`${opt}-${i}`} disabled={checked}
                      onPress={() => setSelected(i)}
                      style={[styles.optionCard, isSel && styles.optionSel, isRight && styles.optionOk, isWrong && styles.optionErr]}>
                      <View style={styles.optionIndicator}>
                        {isRight && <AppText style={styles.indicatorOk}>✓</AppText>}
                        {isWrong && <AppText style={styles.indicatorErr}>✗</AppText>}
                        {!checked && isSel && <View style={styles.indicatorDot} />}
                      </View>
                      <AppText variant="arabic" style={styles.optionArabic}>{opt}</AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* ══ MATCH MEANING / WORD MEANING ═════════════════════ */}
          {(step.type === 'match_meaning' || step.type === 'mcq') && (
            <View style={styles.matchBlock}>
              <AudioChip />
              <View style={styles.ayahCard}>
                <AppText variant="arabic" style={styles.ayahCardText}>{step.ayah.arabic}</AppText>
              </View>
              <OptionList options={step.options ?? []} selected={selected} correctIndex={step.correctIndex ?? -1}
                checked={checked} onSelect={i => setSelected(i)} />
            </View>
          )}

          {step.type === 'word_meaning' && (
            <View style={styles.matchBlock}>
              <AudioChip />
              <View style={styles.ayahCard}>
                <AppText variant="arabic" style={styles.ayahCardText}>{step.ayah.arabic}</AppText>
              </View>
              {step.wordAr ? (() => {
                // Find matching word by position or arabic text for word-level audio
                const matchedWord = step.ayah.words?.find(
                  w => w.position === step.blankPosition || w.arabic === step.wordAr
                ) ?? null;
                return (
                  <View style={styles.wordHighlight}>
                    <AppText style={styles.highlightLabel}>This word ↓</AppText>
                    <View style={styles.wordHighlightRow}>
                      <AppText variant="arabic" style={styles.highlightWord}>{step.wordAr}</AppText>
                      {matchedWord && (matchedWord.audio_url || matchedWord.audio_rel_path) ? (
                        <WordAudioButton word={matchedWord} />
                      ) : null}
                    </View>
                  </View>
                );
              })() : null}
              <OptionList options={step.options ?? []} selected={selected} correctIndex={step.correctIndex ?? -1}
                checked={checked} onSelect={i => setSelected(i)} />
            </View>
          )}

          {/* ══ SEQUENCE ORDER ═══════════════════════════════════ */}
          {step.type === 'sequence_order' && (
            <View style={styles.seqBlock}>
              <View style={[styles.seqZone, seqOrder.length > 0 && styles.seqZoneActive]}>
                {seqOrder.length === 0
                  ? <AppText style={styles.dropZonePlaceholder}>Tap ayahs below in order</AppText>
                  : seqOrder.map((num, i) => {
                      const a = step.sequenceAyahs?.find(x => x.number === num);
                      return (
                        <Pressable key={`${num}-${i}`} disabled={checked}
                          onPress={() => setSeqOrder(seqOrder.filter((_, j) => j !== i))}
                          style={styles.seqCard}>
                          <AppText style={styles.seqNum}>{i + 1}</AppText>
                          <AppText variant="arabic" style={styles.seqAyah} numberOfLines={2}>{a?.ar ?? ''}</AppText>
                        </Pressable>
                      );
                    })
                }
              </View>
              <View style={styles.seqPool}>
                {step.sequenceAyahs?.filter(a => !seqOrder.includes(a.number)).map(a => (
                  <Pressable key={a.number} disabled={checked}
                    onPress={() => setSeqOrder([...seqOrder, a.number])} style={styles.seqCard}>
                    <AppText variant="arabic" style={styles.seqAyah} numberOfLines={2}>{a.ar}</AppText>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

        </ScrollView>
      </Animated.View>
    );
  };

  // ── Duolingo-style slide-up feedback panel ────────────────────
  const FeedbackPanel = () => (
    <Animated.View style={[
      styles.feedbackPanel,
      isCorrect ? styles.feedbackPanelOk : styles.feedbackPanelBad,
      { transform: [{ translateY: feedbackSlide }], paddingBottom: bottomInset + spacing.lg },
    ]}>
      <View style={styles.feedbackTop}>
        <View style={[styles.feedbackIcon, isCorrect ? styles.feedbackIconOk : styles.feedbackIconBad]}>
          <AppText style={styles.feedbackIconText}>{isCorrect ? '✓' : '✗'}</AppText>
        </View>
        <View style={styles.feedbackTexts}>
          <AppText style={[styles.feedbackTitle, isCorrect ? styles.feedbackTitleOk : styles.feedbackTitleBad]}>
            {isCorrect ? 'Excellent! 🎉' : 'Not quite!'}
          </AppText>
          <AppText style={styles.feedbackSub}>
            {isCorrect ? 'Keep going — you\'re doing great!' : 'Review the answer and keep practising'}
          </AppText>
        </View>
      </View>
      <Animated.View style={{ transform: [{ scale: correctScale }] }}>
        <PrimaryButton
          title={isCorrect ? 'Continue ›' : 'Got it'}
          onPress={handleContinue}
          style={isCorrect ? styles.feedbackBtnOk : styles.feedbackBtnBad}
        />
      </Animated.View>
    </Animated.View>
  );

  return (
    <LessonShell step={stepIndex} total={total} hearts={hearts} onClose={onClose}>
      {renderBody()}

      {/* Bottom action area */}
      <View style={[styles.bottomArea, { paddingBottom: bottomInset + spacing.md }]}>
        {!checked ? (
          <PrimaryButton
            title={step.type === 'listen' ? 'Continue →' : 'Check'}
            onPress={handleCheck}
            variant={canCheck() ? 'primary' : 'disabled'}
            disabled={!canCheck()}
          />
        ) : null}
      </View>

      {/* Slide-up feedback */}
      {checked ? <FeedbackPanel /> : null}
    </LessonShell>
  );
}

// ── Reusable MCQ option list ───────────────────────────────────
function OptionList({ options, selected, correctIndex, checked, onSelect }: {
  options: string[]; selected: number | null; correctIndex: number; checked: boolean; onSelect: (i: number) => void;
}) {
  return (
    <View style={styles.optionList}>
      {options.map((opt, i) => {
        const isSel   = selected === i;
        const isRight = checked && i === correctIndex;
        const isWrong = checked && isSel && i !== correctIndex;
        return (
          <Pressable key={`${opt}-${i}`} disabled={checked} onPress={() => onSelect(i)}
            style={[styles.optionCard, isSel && styles.optionSel, isRight && styles.optionOk, isWrong && styles.optionErr]}>
            <View style={styles.optionIndicator}>
              {isRight && <AppText style={styles.indicatorOk}>✓</AppText>}
              {isWrong && <AppText style={styles.indicatorErr}>✗</AppText>}
              {!checked && isSel && <View style={styles.indicatorDot} />}
            </View>
            <AppText style={[styles.optionText, isRight && styles.optionTextOk, isWrong && styles.optionTextErr]}>{opt}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Standalone word audio button (for word_meaning exercises) ─────
function WordAudioButton({ word }: { word: WordOut }) {
  const [playing, setPlaying] = useState(false);
  return (
    <Pressable
      style={[styles.wordAudioBtn, playing && styles.wordAudioBtnPlaying]}
      disabled={playing}
      onPress={async () => {
        const url = await resolveWordPlayUrl(word);
        if (!url) return;
        setPlaying(true);
        try { await playAudioUrl(url); } catch { /* audio optional */ } finally { setPlaying(false); }
      }}>
      <SpeakerIcon size={14} color={playing ? colors.white : colors.primary} />
    </Pressable>
  );
}

// ── Word chip ──────────────────────────────────────────────────
function WordChip({ word, selected, onPress }: { word: WordOut; selected: boolean; onPress: () => void }) {
  const [playing, setPlaying] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = async () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, tension: 300 }),
      Animated.spring(scale, { toValue: 1,    useNativeDriver: true, tension: 200 }),
    ]).start();
    onPress();
    const url = await resolveWordPlayUrl(word);
    if (!url) return;
    setPlaying(true);
    try {
      await playAudioUrl(url);
    } catch {
      // audio is optional
    }
    setPlaying(false);
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPress={handlePress}
        style={[styles.wordChip, selected && styles.wordChipSelected]}>
        <AppText variant="arabic" style={styles.wordChipText}>{word.arabic}</AppText>
        {playing ? <ActivityIndicator size="small" color={colors.primary} />
          : (word.audio_url || word.audio_rel_path) ? (
            <SpeakerIcon size={12} color={selected ? colors.primary : colors.grey} />
          ) : null}
      </Pressable>
    </Animated.View>
  );
}

const TILE_RADIUS = 14;
const CARD_RADIUS = 16;

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, paddingBottom: spacing.sm, paddingHorizontal: spacing.screenHorizontal },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.screenHorizontal },
  centerText: { textAlign: 'center', color: colors.charcoal },
  interstitialHeading: { color: colors.dark, marginTop: 0 },
  interstitialSub: { color: colors.charcoal, fontWeight: '700', fontSize: 14, textAlign: 'center' },
  interstitialProgress: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: `${colors.grey}30`,
    overflow: 'hidden',
  },
  interstitialFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  interstitialCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: `${colors.yellow}15`,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.yellow}35`,
    width: '100%',
  },
  interstitialTip: { flex: 1, color: colors.charcoal, fontWeight: '600', fontSize: 13, lineHeight: 19 },
  interstitialAyahWrap: {
    width: '100%',
    backgroundColor: colors.ash,
    borderRadius: 14,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${colors.grey}20`,
  },
  interstitialAyahLabel: { color: colors.grey, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  interstitialAyah: { fontSize: 22, lineHeight: 38, textAlign: 'center' },

  prompt: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.charcoal,
    marginBottom: spacing.md,
    letterSpacing: 0.2,
  },

  // ── Listen ─────────────────────────────────────────────────
  listenBlock: { gap: spacing.md },
  ayahCard: {
    backgroundColor: colors.ash,
    borderRadius: CARD_RADIUS,
    padding: spacing.lg,
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: `${colors.grey}20`,
  },
  ayahCardText: { fontSize: 26, lineHeight: 44, textAlign: 'right' },

  tapHint: { fontSize: 11, fontWeight: '700', color: colors.grey, textAlign: 'center', letterSpacing: 0.3 },
  /** First word of ayah at bottom; later words stack upward (recitation order). */
  wordRow: {
    flexDirection: 'column-reverse',
    alignItems: 'center',
    gap: spacing.sm,
  },
  wordChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: `${colors.grey}30`,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
  },
  wordChipSelected: { borderColor: colors.primary, backgroundColor: colors.successBg },
  wordChipText: { fontSize: 18 },
  wordInfoCard: {
    backgroundColor: colors.white, borderRadius: 12, borderWidth: 1.5,
    borderColor: `${colors.primary}30`, paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md, alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  wordTrans:   { color: colors.charcoal, fontWeight: '700', fontSize: 14, fontStyle: 'italic' },
  wordMeaning: { color: colors.primary, fontWeight: '900', fontSize: 18, marginTop: 2 },

  recordBtn: {
    marginTop: spacing.sm, backgroundColor: `${colors.primary}12`,
    borderWidth: 2, borderColor: `${colors.primary}40`,
    borderRadius: CARD_RADIUS, paddingVertical: spacing.lg, alignItems: 'center',
  },
  recordBtnActive: { backgroundColor: `${colors.heart}15`, borderColor: colors.heart },
  recordBtnText: { color: colors.dark, fontWeight: '800', fontSize: 15 },

  // ── Fill blank ─────────────────────────────────────────────
  fillBlankBlock: { gap: spacing.md },
  blankAyahCard: {
    backgroundColor: colors.ash, borderRadius: CARD_RADIUS, padding: spacing.lg,
    alignItems: 'flex-end', borderWidth: 1, borderColor: `${colors.grey}20`,
  },
  blankAyahText: { fontSize: 24, lineHeight: 42, textAlign: 'right', color: colors.dark },
  tileHint: { fontSize: 11, fontWeight: '700', color: colors.grey, textAlign: 'center' },
  tileRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  tile: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    backgroundColor: colors.white, borderRadius: TILE_RADIUS,
    borderWidth: 1.5, borderColor: `${colors.grey}30`,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 2, elevation: 1,
  },
  tileSelected: { borderColor: colors.primary, backgroundColor: `${colors.primary}10` },
  tileCorrect:  { borderColor: colors.primary, backgroundColor: colors.successBg },
  tileWrong:    { borderColor: colors.heart,   backgroundColor: colors.errorBg },
  tileText: { fontSize: 20 },
  tileCheck: { color: colors.primary, fontWeight: '900', fontSize: 14 },
  tileX:     { color: colors.heart,   fontWeight: '900', fontSize: 14 },

  // ── Reorder ────────────────────────────────────────────────
  reorderBlock: { gap: spacing.md },
  dropZone: {
    minHeight: 64, borderRadius: CARD_RADIUS, borderWidth: 2,
    borderColor: `${colors.grey}30`, borderStyle: 'dashed',
    backgroundColor: `${colors.grey}08`, flexDirection: 'row-reverse',
    flexWrap: 'wrap', gap: spacing.sm, padding: spacing.sm,
    alignItems: 'center',
  },
  dropZoneActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}06` },
  dropZonePlaceholder: { color: colors.grey, fontWeight: '600', fontSize: 13, flex: 1, textAlign: 'center' },

  // ── Continue ayah ──────────────────────────────────────────
  continueBlock: { gap: spacing.md },
  shownAyahCard: {
    backgroundColor: `${colors.dark}08`, borderRadius: CARD_RADIUS,
    padding: spacing.md, borderLeftWidth: 3, borderLeftColor: colors.primary,
  },
  shownLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1, color: colors.grey, marginBottom: spacing.xs, textTransform: 'uppercase' },
  shownAyah: { fontSize: 22, lineHeight: 38, textAlign: 'right' },

  // ── Match / word meaning ───────────────────────────────────
  matchBlock: { gap: spacing.md },
  wordHighlight: {
    backgroundColor: `${colors.yellow}15`, borderRadius: CARD_RADIUS,
    padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: `${colors.yellow}35`,
  },
  highlightLabel: { fontSize: 10, fontWeight: '800', color: colors.charcoal, marginBottom: 4, letterSpacing: 0.5 },
  wordHighlightRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  highlightWord: { fontSize: 30, color: colors.dark },
  wordAudioBtn: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    backgroundColor: `${colors.primary}15`, borderWidth: 1, borderColor: `${colors.primary}40`,
  },
  wordAudioBtnPlaying: { backgroundColor: colors.primary },

  // ── Options (shared) ───────────────────────────────────────
  optionList: { gap: spacing.sm },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, borderRadius: TILE_RADIUS,
    borderWidth: 1.5, borderColor: `${colors.grey}25`,
    backgroundColor: colors.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  optionSel: { borderColor: colors.primary, borderWidth: 2, backgroundColor: `${colors.primary}08` },
  optionOk:  { borderColor: colors.primary, backgroundColor: colors.successBg },
  optionErr: { borderColor: colors.heart,   backgroundColor: colors.errorBg },
  optionIndicator: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  indicatorOk:  { color: colors.primary, fontWeight: '900', fontSize: 15 },
  indicatorErr: { color: colors.heart,   fontWeight: '900', fontSize: 15 },
  indicatorDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  optionText:    { flex: 1, color: colors.dark, fontWeight: '600', fontSize: 14 },
  optionTextOk:  { color: colors.primary, fontWeight: '700' },
  optionTextErr: { color: colors.heart,   fontWeight: '700' },
  optionArabic:  { flex: 1, fontSize: 17, textAlign: 'right' },

  // ── Sequence ───────────────────────────────────────────────
  seqBlock: { gap: spacing.md },
  seqZone: {
    minHeight: 64, borderRadius: CARD_RADIUS, borderWidth: 2,
    borderColor: `${colors.grey}30`, borderStyle: 'dashed',
    backgroundColor: `${colors.grey}06`, gap: spacing.sm, padding: spacing.sm,
  },
  seqZoneActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}05` },
  seqPool: { gap: spacing.sm },
  seqCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.white, borderRadius: 12, padding: spacing.sm,
    borderWidth: 1, borderColor: `${colors.grey}20`,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  seqNum: { color: colors.primary, fontSize: 12, fontWeight: '900', width: 20, textAlign: 'center' },
  seqAyah: { flex: 1, fontSize: 17, textAlign: 'right' },

  // ── Bottom action area ─────────────────────────────────────
  bottomArea: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
  },

  // ── Duolingo feedback panel ────────────────────────────────
  feedbackPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 10,
  },
  feedbackPanelOk:  { backgroundColor: colors.successBg, borderTopWidth: 2, borderTopColor: `${colors.primary}40` },
  feedbackPanelBad: { backgroundColor: colors.errorBg,   borderTopWidth: 2, borderTopColor: `${colors.heart}40` },
  feedbackTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  feedbackIcon: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
  },
  feedbackIconOk:  { backgroundColor: colors.primary },
  feedbackIconBad: { backgroundColor: colors.heart },
  feedbackIconText: { color: colors.white, fontWeight: '900', fontSize: 20 },
  feedbackTexts: { flex: 1 },
  feedbackTitle:    { fontWeight: '900', fontSize: 17 },
  feedbackTitleOk:  { color: colors.primary },
  feedbackTitleBad: { color: colors.heart },
  feedbackSub: { color: colors.charcoal, fontWeight: '600', fontSize: 13, marginTop: 2 },
  feedbackBtnOk:  { backgroundColor: colors.primary },
  feedbackBtnBad: { backgroundColor: colors.heart },

  // ── Compact audio chip (non-listen exercise types) ─────────
  audioChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'center',
    backgroundColor: `${colors.primary}12`,
    borderRadius: 20, paddingHorizontal: spacing.md, paddingVertical: 6,
    borderWidth: 1, borderColor: `${colors.primary}30`,
    marginBottom: spacing.xs,
  },
  audioChipPlaying: { backgroundColor: colors.primary },
  audioChipLabel: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  audioChipLabelPlaying: { color: colors.white },
});

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Easing, ActivityIndicator, Platform, Modal, Alert, Image, Pressable,
  useWindowDimensions, BackHandler, type ImageSourcePropType,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  playAudioUrl, pauseAudio, resumeAudio, stopAudio,
  preloadAudioUrls, evictPreloadedUrls, onPlayingChange, playFeedbackSound,
} from '../../services/audioPlayer';
import {
  requestMicPermission, startRecording as startRecordingSvc, stopRecording as stopRecordingSvc,
} from '../../services/audioRecorder';
import { useLessonStore } from '../../store/lessonStore';
import { useAuthStore } from '../../store/authStore';
import { learningApi, progressApi } from '../../api';
import { captureError } from '../../services/crashReporter';
import { useArabicFont, arabicTextStyle } from '../../utils/arabicFont';
import { safeBottomInset } from '../../utils/responsive';
import { colors } from '../../theme/colors';
import PredictedProgressBar from '../../components/PredictedProgressBar';
import PlayPauseIcon from '../../components/PlayPauseIcon';
import LoadingSpinner from '../../components/LoadingSpinner';
import MascotShadow from '../../components/MascotShadow';
import LumoInfoModal from '../../components/LumoInfoModal';
import LoadingStatusText from '../../components/LoadingStatusText';
import type { ExerciseDict, ExpectedWordResult, FormulaAttemptOut, SegmentStatus } from '../../types/api';
import type { RootNavProp } from '../../navigation/types';

// The speaker/audio-playback icon used everywhere a "tap to hear" control
// shows a handheld speaker — replaces the old 🔊 emoji.
const SPEAKER_ICON = require('../../../assets/map/speaker.png');

// ── Tour-only glow ───────────────────────────────────────────────────
// The guided tour highlights a real element by asking that element to glow
// itself, rather than drawing a separate ring on top of it at measured
// coordinates (see TourOverlay's own comment for why: a drawn ring can
// disagree with the real shape, drift out of sync with a timing race, or
// simply be wrong). Every glow-capable prop below defaults to falsy and is
// only ever set by TourLessonScreen/TourOfferModal call sites — a normal
// lesson never passes them, so this is invisible outside the tour.
//
// Two variants:
// - TOUR_GLOW has no radius of its own, so it inherits whatever the host
//   element already declares (Check's borderRadius:16, the mic's 54, the
//   feedback sheet's top-only 24) — same pattern EX.optionGlow already used
//   for the pre-picked option, just generalised.
// - TOUR_GLOW_ROUND is for the handful of targets whose ref sits on a bare
//   wrapper View with no shape of its own (the hint icon, the hearts row,
//   the progress slot) — borderRadius: 999 clamps to a perfect circle/pill
//   at whatever size that wrapper actually renders, on any device.
export const TOUR_GLOW = {
  borderWidth: 2, borderColor: colors.gold,
  shadowColor: colors.gold, shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
  elevation: 8,
} as const;
export const TOUR_GLOW_ROUND = { ...TOUR_GLOW, borderRadius: 999 } as const;
// Same spotlight, thinner halo — TOUR_GLOW_ROUND's shadowRadius:10 is a soft
// blur bigger than the 10px-tall progress bar it's meant to outline, so the
// gold blur reads as the bar's own color instead of a highlight around a
// green bar. Every other TOUR_GLOW_ROUND target (hearts row, hint icon) is
// tall enough that the same blur stays a thin rim; only the progress bar
// needs the lighter version.
export const TOUR_GLOW_ROUND_THIN = { ...TOUR_GLOW_ROUND, shadowRadius: 3, shadowOpacity: 0.7 } as const;

// ── Audio helper ───────────────────────────────────────────────────
// Thin wrappers around services/audioPlayer.ts (react-native-sound) that
// preserve the call-site API (`playUrl(url, onDone)` etc.) used throughout
// this file.

// Which exercise is actually on screen right now — a plain module-level
// value, not React state, set as a direct statement during the main
// screen's render (see its own `activeExerciseId = exercise?.ex_id` line)
// rather than from an effect, so it's already correct by the time ANY
// effect (this component's own or a child exercise's) runs afterward.
//
// Reported bug: on a slow device, tapping a "Hear" button queues playback
// that hasn't started by the time the learner gives up waiting and taps
// Next — the several TouchableOpacity/useEffect call sites below have no
// concept of "is this still the exercise being shown," so a still-pending
// playUrl/playUrlSequence call just kept running and played out loud on
// whatever exercise the learner had since moved to (multiple queued taps
// cascading across several later screens). playUrl/playUrlSequence re-check
// this on every step of a sequence and bail the instant it goes stale, and
// the main screen calls stopAudio() the moment the exercise changes so
// anything already mid-playback cuts off immediately too.
//
// The comment above used to claim a staleness re-check here ("bails the
// instant it goes stale") that did not actually exist: it compared
// activeExerciseId to itself with zero async work in between capturing it
// and checking it, so it could never observe a change and was a permanent
// no-op. Removed 2026-08-28 alongside the real fix for a production
// incident this contributed to (several stalled audio loads all surfacing
// minutes later at once, well after the exercises that requested them were
// long gone) — see playToken's comment in services/audioPlayer.ts for the
// root cause and the actual fix. That fix lives at the one choke point every
// play request passes through regardless of caller, which is the only place
// it can be correct; nothing needs re-checking here.
//
// onDone must run UNCONDITIONALLY, every time, including on failure —
// several callers (e.g. HearAndSelect's startPlayback) await it via
// `new Promise(resolve => playUrl(url, resolve))` to sequence multiple
// clips, and a skipped onDone would hang that await forever, stalling the
// rest of the sequence rather than just skipping one stale clip.
let activeExerciseId: string | null = null;

async function playUrl(url: string | null | undefined, onDone?: () => void) {
  if (!url) return;
  try {
    await playAudioUrl(url);
  } catch (e) {
    console.warn('[audio] playUrl failed:', e);
  } finally {
    onDone?.();
  }
}

// Play a list of URLs one after another (for segment_audio_urls)
async function playUrlSequence(urls: string[], onDone?: () => void) {
  const forExercise = activeExerciseId;
  for (const url of urls) {
    if (forExercise !== activeExerciseId) break;
    await playUrl(url);
  }
  onDone?.();
}

// Pre-loads all audio files concurrently then plays them back-to-back with
// the smallest possible gap — used for the "Hear" button in read_and_speak.
async function playUrlSequenceFast(urls: string[], onDone?: () => void) {
  if (!urls.length) { onDone?.(); return; }
  const forExercise = activeExerciseId;
  try {
    await preloadAudioUrls(urls);
  } catch {}
  // The preload above is its own async gap — re-check here too, not just
  // inside playUrlSequence, since that function captures activeExerciseId
  // fresh at ITS OWN start and would otherwise treat "still current as of
  // right now" as "was still current when this was first requested."
  if (forExercise !== activeExerciseId) { onDone?.(); return; }
  await playUrlSequence(urls, onDone);
}


async function pauseCurrentAudio() {
  pauseAudio();
}

async function resumeCurrentAudio() {
  resumeAudio();
}

// ── Audio recording helpers (speak exercises) ──────────────────────
// Backed by services/audioRecorder.ts (react-native-audio-recorder-player).

/** Start recording. */
async function startRecording(): Promise<void> {
  stopAudio();
  await startRecordingSvc();
}

/**
 * Stop the active recording and return its local file URI.
 * Returns null if nothing was being recorded or if an error occurred.
 */
async function stopRecording(): Promise<string | null> {
  try {
    const uri = await stopRecordingSvc();
    return uri || null;
  } catch (e) {
    console.warn('[recording] stopRecording error:', e);
    return null;
  }
}

export function PlayPauseBtn({
  url, urls, label = 'Listen', darkMode = false, disabled = false,
}: { url?: string | null; urls?: string[] | null; label?: string; darkMode?: boolean; disabled?: boolean }) {
  const [state, setState] = useState<'idle' | 'playing' | 'paused'>('idle');
  const mountedRef = useRef(true);

  // Normalise: prefer single url, fall back to playing urls in sequence
  const hasAudio = !!(url || urls?.length);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => { setState('idle'); }, [url]);

  // External stop (e.g. Check pressed mid-playback) doesn't always fire
  // playUrl's own completion callback (Sound.stop() on Android skips it) —
  // without this, the icon can keep showing "playing" for several seconds
  // after the audio itself has actually stopped.
  useEffect(() => onPlayingChange(playing => {
    if (!playing && mountedRef.current) setState(s => (s === 'playing' ? 'idle' : s));
  }), []);

  const handlePress = async () => {
    if (disabled) return;
    if (state === 'idle') {
      setState('playing'); // set before awaiting — playUrl only resolves once playback finishes
      if (url) {
        await playUrl(url, () => { if (mountedRef.current) setState('idle'); });
      } else if (urls?.length) {
        void playUrlSequence(urls, () => { if (mountedRef.current) setState('idle'); });
      }
    } else if (state === 'playing') {
      setState('paused');
      await pauseCurrentAudio();
    } else {
      setState('playing');
      await resumeCurrentAudio();
    }
  };

  const btnLabel = state === 'playing' ? 'Pause' : state === 'paused' ? 'Resume' : label;

  if (!hasAudio) return null;
  return (
    <TouchableOpacity
      style={[PP.btn, darkMode && PP.btnDark, disabled && PP.btnDisabled]}
      onPress={handlePress}
      disabled={disabled}
    >
      <PlayPauseIcon playing={state === 'playing'} size={14} color={darkMode ? '#E0BC4E' : colors.primary} />
      <Text style={[PP.text, darkMode && PP.textDark]}>{`  ${btnLabel}`}</Text>
    </TouchableOpacity>
  );
}

const PP = StyleSheet.create({
  btn:     { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(42,125,79,0.12)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'center', marginBottom: 14 },
  btnDark: { backgroundColor: 'rgba(224,188,78,0.15)' },
  btnDisabled: { opacity: 0.4 },
  text:    { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.primary },
  textDark:{ color: '#E0BC4E' },
});

// ── Speech bubble text per exercise type ─────────────────────────
const BUBBLE_TEXT: Record<string, string> = {
  fill_blank:          "Let's fill the blank",
  audio_fill:          "Hear and fill the blank",
  next_word:           "Let's fill the blank",
  reorder:             "Let's order the ayah",
  sequence:            "Tap the ayahs to the correct order",
  ayat_then_order:     "First ayat is shown, complete the rest",
  segment_recall:      "Can you find the right verse?",
  hear_and_select:     "Hear the sound and select",
  read_ayah_and_speak: "Listen, then recite the ayah",
  read_and_speak:      "Read the words aloud",
};

// Shown instead of the normal BUBBLE_TEXT once a recitation attempt has
// failed and the retry-choice sheet is up — most low scores trace back to
// background noise the mic picked up, so this is the one moment worth
// telling the user that directly rather than just "try again".
const RETRY_BUBBLE_TEXT = "Try again with a clear background, it helps a lot";

// Types the app fully handles — anything else is silently skipped
const HANDLED_EXERCISE_TYPES = new Set([
  'ayah_display', 'fill_blank', 'audio_fill', 'next_word',
  'reorder', 'sequence', 'ayat_then_order', 'segment_recall', 'hear_and_select',
  'read_ayah_and_speak', 'read_and_speak',
]);

// ── Bismillah stripping ───────────────────────────────────────────
// The hint modal receives ayah_ar which sometimes includes the Bismillah
// (بسم الله الرحمن الرحيم) as a leading prefix from the backend or group data.
// This function removes it so the hint shows only the actual ayah text with ۝.
// Matches any diacritisation variant via the optional-harakat character class.

const _D = '[ً-ٰٟ]*'; // any Arabic diacritics (harakat / dagger alif)
const BISMILLAH_RE = new RegExp(
  '^[\\s﷽]*' +              // leading whitespace or ﷽ glyph
  `ب${_D}س${_D}م${_D}` + // بسم
  `\\s+ا${_D}ل${_D}ل${_D}[هة]${_D}` + // الله
  `\\s+ا${_D}ل${_D}ر${_D}ح${_D}م${_D}[نا]${_D}` + // الرحمن
  `\\s+ا${_D}ل${_D}ر${_D}ح${_D}[يى]${_D}م${_D}` + // الرحيم
  '[\\s\\n]*',
);

function stripBismillahPrefix(text: string | null | undefined): string {
  if (!text) return text ?? '';
  const stripped = text.replace(BISMILLAH_RE, '').trim();
  // Guard: if stripping would empty the string (i.e. the ayah IS Bismillah,
  // like Surah 1:1), return the original unchanged.
  return stripped || text;
}

// ── Ayah text with matching-size ۝ end-marker ────────────────────
function AyahText({ text, style }: { text: string; style: any }) {
  if (!text.includes('۝')) return <Text style={style}>{text}</Text>;
  const parts = text.split('۝');
  const circleSize = style.fontSize ?? 20;
  return (
    <Text style={style}>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {part}
          {i < parts.length - 1 && (
            <Text style={{ fontSize: circleSize }}>۝</Text>
          )}
        </React.Fragment>
      ))}
    </Text>
  );
}

// ── Hint button (glowing lightbulb, top-right) with Lumo modal ─────
export function HintButton({
  url, ayahAr, ayahTranslation,
}: { url?: string | null; ayahAr?: string | null; ayahTranslation?: string | null }) {
  const arabicFont = useArabicFont();
  const glowAnim   = useRef(new Animated.Value(0.5)).current;
  const [visible, setVisible]   = useState(false);
  const [playing, setPlaying]   = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0.5, duration: 900, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  // Stop audio whenever the modal closes
  useEffect(() => {
    if (!visible && playing) {
      void pauseCurrentAudio();
      if (mountedRef.current) setPlaying(false);
    }
  }, [visible]);

  const handlePlayPause = async () => {
    if (!url) return;
    if (playing) {
      setPlaying(false);
      await pauseCurrentAudio();
    } else {
      setPlaying(true); // set before awaiting — playUrl only resolves once playback finishes
      await playUrl(url, () => { if (mountedRef.current) setPlaying(false); });
    }
  };

  // A hint is worth showing if there's either audio or text — previously an
  // exercise that carried the ayah and its translation but no audio url hid the
  // button entirely, throwing away a perfectly good hint.
  if (!url && !ayahAr) return null;

  return (
    <>
      <TouchableOpacity style={HB.container} onPress={() => setVisible(true)}>
        <Animated.View style={[HB.glow, { opacity: glowAnim }]} />
        <Text style={HB.icon}>💡</Text>
        <Text style={HB.label}>Hint</Text>
      </TouchableOpacity>

      <Modal transparent animationType="fade" visible={visible} onRequestClose={() => setVisible(false)}>
        <View style={HB.backdrop}>
          <View style={HB.modal}>
            <View style={{ width: 100, height: 100, marginBottom: 8 }}>
              <Image
                source={require('../../../assets/images/lumo_hint.png')}
                style={[HB.lumo, { marginBottom: 0 }]}
                resizeMode="contain"
              />
              <MascotShadow width={100} />
            </View>
            <Text style={HB.modalTitle}>Hint</Text>

            {ayahAr ? (
              <View style={HB.ayahBox}>
                {/* Strip Bismillah so only the actual ayah with ۝ is shown */}
                <AyahText text={stripBismillahPrefix(ayahAr)} style={arabicTextStyle(HB.ayahAr as any, arabicFont) as any} />
                {ayahTranslation ? (
                  <Text style={HB.ayahTrans}>"{ayahTranslation}"</Text>
                ) : null}
              </View>
            ) : null}

            {/* Play / Pause button — omitted when the hint is text-only */}
            {url ? (
              <TouchableOpacity
                style={[HB.playBtn, playing && HB.playBtnActive]}
                onPress={handlePlayPause}
              >
                <View style={HB.pauseRow}>
                  <PlayPauseIcon playing={playing} size={16} color="white" />
                  <Text style={HB.playText}>  {playing ? 'Pause' : 'Hear the Ayah'}</Text>
                </View>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={HB.cancelBtn} onPress={() => setVisible(false)}>
              <Text style={HB.cancelText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const HB = StyleSheet.create({
  container:    { alignItems: 'center', justifyContent: 'center', width: 52, height: 52 },
  glow:         { position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF59D' },
  icon:         { fontSize: 22 },
  label:        { fontSize: 10, fontFamily: 'Nunito_700Bold', color: '#A07C00', marginTop: 1 },
  backdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  modal:        { backgroundColor: 'white', borderRadius: 24, padding: 24, alignItems: 'center', width: '88%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  lumo:         { width: 100, height: 100, marginBottom: 8 },
  modalTitle:   { fontFamily: 'Nunito_700Bold', fontSize: 20, color: colors.darkText, marginBottom: 12 },
  ayahBox:      { width: '100%', backgroundColor: '#FFFBF0', borderRadius: 14, borderWidth: 1.5, borderColor: '#E8D8A0', padding: 16, alignItems: 'center', marginBottom: 16 },
  ayahAr:       { fontFamily: 'NotoNaskhArabic_400Regular', fontSize: 22, color: colors.darkText, textAlign: 'center', lineHeight: 38 },
  ayahTrans:    { fontFamily: 'Nunito_400Regular', fontSize: 12, color: colors.mutedText, textAlign: 'center', marginTop: 8, fontStyle: 'italic', lineHeight: 18 },
  playBtn:      { width: '100%', backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  playBtnActive:{ backgroundColor: '#1A5C3A' },
  playText:     { fontFamily: 'Nunito_700Bold', fontSize: 14, color: 'white' },
  pauseRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cancelBtn:    { width: '100%', borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  cancelText:   { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.midText },
});

// ── Character rotation ────────────────────────────────────────────
export interface Character { src: ImageSourcePropType; name: string }
export const CHARACTERS: Character[] = [
  { src: require('../../../assets/characters/ayesha.png'),   name: 'Ayesha' },
  { src: require('../../../assets/characters/farah.png'),    name: 'Farah' },
  { src: require('../../../assets/characters/fatima.png'),   name: 'Fatima' },
  { src: require('../../../assets/characters/hamza.png'),    name: 'Hamza' },
  { src: require('../../../assets/characters/muhammad.png'), name: 'Muhammad' },
  { src: require('../../../assets/characters/umar.png'),     name: 'Umar' },
  { src: require('../../../assets/characters/waleed.png'),   name: 'Waleed' },
];
export function shuffleIndices(len: number): number[] {
  const arr = Array.from({ length: len }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
export function characterForIndex(shuffled: number[], idx: number): Character {
  return CHARACTERS[shuffled[idx % shuffled.length]];
}

// ── Hearts ─────────────────────────────────────────────────────────
// 5 heart icons, each worth 2 half-heart units (full -> half -> empty), so
// the session actually ends at 10 total mistakes, not 5 — these two numbers
// must move together or the "out of hearts" trigger silently drifts out of
// sync with what the heart icons are visually showing.
const MAX_HEARTS = 5;
const MAX_MISTAKES = MAX_HEARTS * 2;

// Stars shown on the completion screen, derived from real accuracy (not the
// hardcoded 3 this used to be) — kept in sync with the backend's own
// _stars_from_score() thresholds (app/learning/service.py) so the number
// shown here never disagrees with the stars persisted for the level on the map.
function starsFromAccuracy(scorePct: number): number {
  if (scorePct >= 90) return 3;
  if (scorePct >= 60) return 2;
  return 1; // floor of 1 star for any completed attempt, including <30%
}

// Back button used as a safety net on the blank loading state below.
const LL = StyleSheet.create({
  backBtn: { position: 'absolute', left: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  backArrowIcon: { width: 14, height: 14, tintColor: colors.midText, marginRight: 6 },
  backText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.midText },
});

// ── Between-exercise loading — a spinning green dial + "Loading" label,
// shown briefly while an answer submits and the next exercise is fetched. ──
function SubmittingSpinner() {
  return <LoadingSpinner size={40} label="Loading…" />;
}

// ── Segment play button with waveform signal ─────────────────────
// url: the full segment / ayah audio; urls: word-by-word clips played in
// sequence when no single url is given (mirrors PlayPauseBtn's pattern).

const BAR_HEIGHTS = [7, 13, 20, 13, 7]; // waveform bar heights in px

export function SegmentPlayBtn({ url, urls }: { url?: string | null; urls?: string[] | null }) {
  const [playing, setPlaying] = useState(false);
  const mountedRef = useRef(true);
  const pulseAnims = useRef(BAR_HEIGHTS.map(() => new Animated.Value(1))).current;
  const hasAudio = !!(url || urls?.length);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => { setPlaying(false); }, [url, urls]);

  // See PlayPauseBtn's identical subscription — an external stopAudio() call
  // (Check press) doesn't reliably fire playUrl's completion callback, so the
  // waveform pulse can keep animating after the sound has actually stopped.
  useEffect(() => onPlayingChange(isPlaying => {
    if (!isPlaying && mountedRef.current) setPlaying(false);
  }), []);

  useEffect(() => {
    if (playing) {
      const anims = pulseAnims.map((a, i) =>
        Animated.loop(Animated.sequence([
          Animated.timing(a, { toValue: 0.35, duration: 300 + i * 80, useNativeDriver: true }),
          Animated.timing(a, { toValue: 1, duration: 300 + i * 80, useNativeDriver: true }),
        ]))
      );
      anims.forEach(a => a.start());
      return () => anims.forEach(a => a.stop());
    } else {
      pulseAnims.forEach(a => a.setValue(1));
    }
  }, [playing]);

  const handle = async () => {
    if (!hasAudio) return;
    if (playing) {
      setPlaying(false);
      await pauseCurrentAudio();
    } else {
      setPlaying(true); // set before awaiting — resolves only once playback finishes
      if (url) {
        await playUrl(url, () => { if (mountedRef.current) setPlaying(false); });
      } else if (urls?.length) {
        await playUrlSequenceFast(urls, () => { if (mountedRef.current) setPlaying(false); });
      }
    }
  };

  return (
    <TouchableOpacity style={SPB.row} onPress={handle} disabled={!hasAudio}>
      <View style={[SPB.btn, !hasAudio && { opacity: 0.4 }]}>
        <PlayPauseIcon playing={playing} size={11} color="white" />
      </View>
      {/* Waveform signal bars — always visible, animate when playing */}
      <View style={SPB.waveform}>
        {BAR_HEIGHTS.map((h, i) => (
          <Animated.View
            key={i}
            style={[SPB.bar, { height: h, opacity: pulseAnims[i] }]}
          />
        ))}
      </View>
    </TouchableOpacity>
  );
}

const SPB = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  btn:      { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  waveform: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  bar:      { width: 4, backgroundColor: colors.primary, borderRadius: 2 },
});

// ── Bismillah intro screen ────────────────────────────────────────

function BismillahIntro({
  surahName, surahNumber, onBegin, insetTop,
}: { surahName: string; surahNumber: number; onBegin: () => void; insetTop: number }) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const arabicFont = useArabicFont();
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
      Animated.timing(floatAnim, { toValue: 0, duration: 1600, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  const ty = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  return (
    <View style={[BI.container, { paddingTop: insetTop }]}>
      <Animated.Image
        source={require('../../../assets/images/lumo_read.png')}
        style={[BI.luma, { transform: [{ translateY: ty }] }]}
        resizeMode="contain"
      />
      <View style={BI.card}>
        <Text style={BI.surahLabel}>Surah {surahName} · No. {surahNumber}</Text>
        <Text style={arabicTextStyle(BI.bismillah as any, arabicFont) as any}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
        <Text style={BI.translation}>In the Name of Allah, the Most Gracious, the Most Merciful</Text>
      </View>
      <TouchableOpacity style={BI.beginBtn} onPress={onBegin}>
        <Text style={BI.beginBtnText}>Begin Lesson  →</Text>
      </TouchableOpacity>
    </View>
  );
}

const BI = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D3B26', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  luma: { width: 130, height: 130, marginBottom: 16 },
  card: {
    backgroundColor: 'rgba(4,20,10,0.88)', borderRadius: 22,
    borderWidth: 1.5, borderColor: 'rgba(224,188,78,0.45)',
    paddingHorizontal: 26, paddingVertical: 28,
    alignItems: 'center', width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.55, shadowRadius: 14, elevation: 10,
  },
  surahLabel: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: 'rgba(224,188,78,0.8)', marginBottom: 12, letterSpacing: 0.5 },
  bismillah: { fontFamily: 'NotoNaskhArabic_400Regular', fontSize: 32, color: '#E0BC4E', textAlign: 'center', lineHeight: 52 },
  translation: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 10, lineHeight: 18 },
  listenBtn: { marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(224,188,78,0.15)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20 },
  listenBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: '#E0BC4E' },
  beginBtn: { marginTop: 28, backgroundColor: colors.primary, borderRadius: 18, paddingVertical: 18, paddingHorizontal: 60, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 12, elevation: 6 },
  beginBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 17, color: 'white' },
});

// ── Segment progress dots ─────────────────────────────────────────

// ── Exercise progress bar ─────────────────────────────────────────

export function ProgressBar({ fraction }: { fraction: number }) {
  const animW = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(animW, { toValue: Math.max(0, Math.min(fraction, 1)), duration: 600, useNativeDriver: false }).start();
  }, [fraction]);
  return (
    <View style={PBR.track}>
      <Animated.View style={[PBR.fill, {
        width: animW.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
      }]} />
    </View>
  );
}

// ── Exercise header ───────────────────────────────────────────────
// The ✕ / progress bar / hearts / hint strip that sits above every exercise.
//
// Extracted (rather than left inline in the main screen) so the guided tour can
// render the genuine article instead of a mock-up of it. The tour is meant to
// show new users what the real lesson screen looks like, and a hand-copied
// lookalike would start lying the first time this changed. Same component, same
// hearts, same bar, same hint modal — they cannot drift apart.
export interface LessonHeaderTargets {
  progress?: React.Ref<View>;
  hearts?: React.Ref<View>;
  hint?: React.Ref<View>;
}

export function LessonHeader({
  mistakes,
  progressFraction,
  hintUrl,
  hintAyahAr,
  hintAyahTranslation,
  onExit,
  targets,
  glowTarget,
  hideHearts,
}: {
  /** In half-heart units — see MAX_MISTAKES. */
  mistakes: number;
  progressFraction: number;
  hintUrl?: string | null;
  hintAyahAr?: string | null;
  hintAyahTranslation?: string | null;
  onExit: () => void;
  /** Optional refs so the tour can measure what it's about to spotlight. */
  targets?: LessonHeaderTargets;
  /** Tour-only: which of this header's own elements should glow itself. */
  glowTarget?: 'hint' | 'hearts' | 'progress' | null;
  /** Special (merged/review) levels — hearts aren't shown at all, not just
   * exempted from loss (see isNoMistake in submitAnswer). */
  hideHearts?: boolean;
}) {
  const heartsLeftHalf = MAX_MISTAKES - mistakes;

  return (
    <View style={LH.header}>
      <TouchableOpacity style={LH.backBtn} onPress={onExit}>
        <Text style={LH.backText}>✕</Text>
      </TouchableOpacity>

      <View
        ref={targets?.progress}
        collapsable={false}
        style={[LH.progressSlot, glowTarget === 'progress' && TOUR_GLOW_ROUND_THIN]}
      >
        <ProgressBar fraction={progressFraction} />
      </View>

      {!hideHearts && (
        <View
          ref={targets?.hearts}
          collapsable={false}
          style={[LH.heartsRow, glowTarget === 'hearts' && TOUR_GLOW_ROUND]}
        >
          {Array.from({ length: MAX_HEARTS }).map((_, i) => {
            const heartsFromThisIcon = heartsLeftHalf - i * 2; // each icon is worth 2 half-hearts
            const src =
              heartsFromThisIcon >= 2 ? require('../../../assets/map/redh.png') :
              heartsFromThisIcon === 1 ? require('../../../assets/map/halfh.png') :
              require('../../../assets/map/whiteh.png');
            return (
              <View key={i} style={LH.heartWrapper}>
                <Image source={src} style={LH.heartImage} resizeMode="contain" />
              </View>
            );
          })}
        </View>
      )}

      <View ref={targets?.hint} collapsable={false} style={glowTarget === 'hint' ? TOUR_GLOW_ROUND : undefined}>
        <HintButton url={hintUrl} ayahAr={hintAyahAr} ayahTranslation={hintAyahTranslation} />
      </View>
    </View>
  );
}

const LH = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  backText: { fontSize: 14, color: colors.mutedText },
  // ProgressBar itself carries flex:1; this wrapper only exists so the tour has
  // something measurable to point at, so it has to pass that through. Needs its
  // own flexDirection:'row' — a plain View defaults to column, which put
  // ProgressBar's flex:1 on the vertical axis instead of the horizontal one
  // it had when it sat directly in this row-direction header, before this
  // wrapper existed.
  progressSlot: { flex: 1, flexDirection: 'row' },
  heartsRow: { flexDirection: 'row', gap: 3 },
  heartImage: { width: 20, height: 20 },
  heartWrapper: { alignItems: 'center', justifyContent: 'center', width: 20, height: 20 },
});

const PBR = StyleSheet.create({
  track: { flex: 1, height: 10, backgroundColor: '#E5E7EB', borderRadius: 6, overflow: 'hidden', marginHorizontal: 10 },
  fill:  { height: '100%', backgroundColor: colors.primary, borderRadius: 6 },
});

// ── Exercise renderers ─────────────────────────────────────────────

export function AyahDisplay({
  ex, surahName, transliteration, showLumo, onContinue,
}: {
  ex: ExerciseDict;
  surahName: string;
  transliteration?: string | null;
  showLumo?: boolean;
  onContinue: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const mountedRef = useRef(true);
  const arabicFont = useArabicFont();
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => { setPlaying(false); }, [ex.ex_id]);

  const handlePlayPause = async () => {
    if (playing) {
      setPlaying(false);
      await pauseCurrentAudio();
    } else {
      setPlaying(true); // set before awaiting — playUrl only resolves once playback finishes
      await playUrl(ex.ayah_audio_url, () => { if (mountedRef.current) setPlaying(false); });
    }
  };

  return (
    <ScrollView contentContainerStyle={AD.container} showsVerticalScrollIndicator={false}>
      {showLumo && (
        <View style={AD.lumoRow}>
          <Image
            source={require('../../../assets/images/lumo_kufi.png')}
            style={AD.lumoImg}
            resizeMode="contain"
          />
          <View style={AD.lumoBubble}>
            <View style={AD.lumoBubbleTail} />
            <Text style={AD.lumoBubbleText}>Read and listen carefully</Text>
          </View>
        </View>
      )}

      {/* Verse title */}
      <Text style={AD.verseTitle}>Surah {surahName} · Verse {ex.ayah_no}</Text>
      <Text style={AD.subInstruction}>Tap the speaker to listen. Tap again to pause.</Text>

      {/* Main ayah card */}
      {ex.ayah_ar ? (
        <View style={AD.ayahCard}>
          <AyahText text={ex.ayah_ar ?? ''} style={arabicTextStyle(AD.ayahAr as any, arabicFont) as any} />
          {transliteration ? <Text style={AD.transliteration}>{transliteration}</Text> : null}
          {ex.ayah_translation ? <Text style={AD.translation}>"{ex.ayah_translation}"</Text> : null}
        </View>
      ) : null}

      {/* Big play button */}
      <TouchableOpacity style={[AD.playBtn, playing && AD.playBtnActive]} onPress={handlePlayPause}>
        <PlayPauseIcon playing={playing} size={26} color="white" />
      </TouchableOpacity>

      {/* Tip */}
      <View style={AD.tipCard}>
        <Text style={AD.tipIcon}>💡</Text>
        <Text style={AD.tipText}>Tip: Listen 3 times before continuing to help it stick in memory.</Text>
      </View>

      {/* Continue */}
      <TouchableOpacity style={AD.continueBtn} onPress={onContinue}>
        <Text style={AD.continueBtnText}>Got it  →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const AD = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, alignItems: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF8E7', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginBottom: 16, borderWidth: 1, borderColor: '#E0BC4E' },
  badgeIcon: { fontSize: 14 },
  badgeText: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: '#9A7A20', letterSpacing: 0.8 },
  verseTitle: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: colors.darkText, marginBottom: 4, textAlign: 'center' },
  subInstruction: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: colors.mutedText, textAlign: 'center', marginBottom: 20 },
  ayahCard: { width: '100%', backgroundColor: '#FFFBF0', borderRadius: 18, borderWidth: 1.5, borderColor: '#E8D8A0', padding: 24, alignItems: 'center', marginBottom: 24 },
  ayahAr: { fontFamily: 'NotoNaskhArabic_400Regular', fontSize: 30, color: colors.darkText, textAlign: 'center', lineHeight: 54, marginBottom: 12 },
  transliteration: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: '#9A7A20', textAlign: 'center', marginBottom: 6 },
  translation: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.mutedText, textAlign: 'center', fontStyle: 'italic' },
  playBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 24, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  playBtnActive: { backgroundColor: '#1A5C3A' },
  lumoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10, width: '100%' },
  lumoImg: { width: 70, height: 70 },
  lumoBubble: { flex: 1, backgroundColor: '#E8F5EE', borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary, paddingHorizontal: 14, paddingVertical: 10, position: 'relative' },
  lumoBubbleTail: { position: 'absolute', left: -9, top: 14, width: 0, height: 0, borderTopWidth: 7, borderBottomWidth: 7, borderRightWidth: 10, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: colors.primary },
  lumoBubbleText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.primary },
  tipCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFFBEC', borderRadius: 14, padding: 14, width: '100%', marginBottom: 24, borderWidth: 1, borderColor: '#FDE68A' },
  tipIcon: { fontSize: 16 },
  tipText: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: '#92400E', flex: 1, lineHeight: 18 },
  continueBtn: { width: '100%', backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  continueBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: 'white' },
});

// EX.blankBox has a fixed size tuned for the default Naskh font. Nastaliq
// needs a narrower box (scale shrinks glyph width) but a taller one
// (lineHeightScale — its letterforms stack vertically) — see arabicFont.ts
// for why these can't be the same single factor.
function scaledBlankBox(font: { scale: number; lineHeightScale: number }): { height: number; minWidth: number } {
  return {
    height: Math.round(40 * font.scale * font.lineHeightScale),
    minWidth: Math.round(70 * font.scale),
  };
}

export function FillBlankOrNextWord({
  ex, surahName, character, locked, onSubmit, previewSelected, checkButtonRef, selectedOptionRef,
  glowCheck,
}: {
  ex: ExerciseDict;
  surahName: string;
  character: Character;
  locked?: boolean;
  onSubmit: (ans: string) => void;
  /**
   * Tour-only: pre-fills `selected` so the Check button reads as enabled
   * instead of permanently greyed out, in a screen where taps never reach
   * the options (see TourLessonScreen). Never passed by the real lesson
   * flow, so `selected` still starts `null` there exactly as before.
   */
  previewSelected?: string;
  /** Tour-only: lets TourLessonScreen measure the real Check button, for the cutout hole. */
  checkButtonRef?: React.Ref<View>;
  /** Tour-only: lets TourLessonScreen measure the pre-selected option, for the cutout hole. */
  selectedOptionRef?: React.Ref<View>;
  /** Tour-only: glow the real Check button itself. */
  glowCheck?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(previewSelected ?? null);
  const arabicFont = useArabicFont();

  useEffect(() => {
    if (ex.word_audio_url) { void playUrl(ex.word_audio_url); }
    setSelected(previewSelected ?? null);
  }, [ex.ex_id, previewSelected]);

  // Show "Hear words" only when the blank is the first or last token (corner position)
  const blankIdx = ex.tokens?.findIndex(t => t.blank) ?? -1;
  const isCorner = blankIdx === 0 || (ex.tokens != null && blankIdx === ex.tokens.length - 1);
  const wordAudioUrls = isCorner && ex.segment_audio_urls?.length ? ex.segment_audio_urls : null;
  return (
    <ScrollView contentContainerStyle={EX.scrollContent} showsVerticalScrollIndicator={false}>
      {ex.phase === 'mistakes_review' && (
        <View style={EX.reviewBanner}>
          <Text style={EX.reviewBannerText}>🔁  Try again</Text>
        </View>
      )}

      {/* Character + speech bubble */}
      <View style={EX.characterRow}>
        <Image source={character.src} style={EX.characterImg} resizeMode="contain" />
        <View style={EX.verseInfoCard}>
          <View style={EX.bubbleTail} />
          <Text style={EX.characterName}>Ustad {character.name} says:</Text>
          <Text style={EX.bubbleText}>{BUBBLE_TEXT[ex.type] ?? ex.instruction}</Text>
          <Text style={EX.bubbleLabel}>Surah {surahName} · Verse {ex.ayah_no}</Text>
        </View>
      </View>

      {/* Word-by-word speaker — only when blank is in corner position */}
      {wordAudioUrls && (
        <TouchableOpacity style={EX.wordAudioBtn} onPress={() => void playUrlSequence(wordAudioUrls)}>
          <Image source={SPEAKER_ICON} style={EX.wordAudioIcon} resizeMode="contain" />
          <Text style={EX.wordAudioLabel}>Hear words</Text>
        </TouchableOpacity>
      )}

      {/* Question card: context + tokens */}
      <View style={EX.questionCard}>
        {ex.context_before?.length ? (
          <Text style={arabicTextStyle(EX.contextText as any, arabicFont) as any}>{ex.context_before.join(' ')}</Text>
        ) : null}

        {ex.tokens?.length ? (
          <View style={EX.tokensRow}>
            {ex.tokens.map((t, i) =>
              t.blank
                ? <View key={i} style={[EX.blankBox, scaledBlankBox(arabicFont), selected && EX.blankFilled]}>
                    {selected ? <Text style={arabicTextStyle(EX.blankText as any, arabicFont) as any}>{selected}</Text> : null}
                  </View>
                : <Text key={i} style={arabicTextStyle(EX.tokenWord as any, arabicFont) as any}>{t.ar}</Text>
            )}
          </View>
        ) : null}

        {ex.context_after?.length ? (
          <Text style={arabicTextStyle(EX.contextText as any, arabicFont) as any}>{ex.context_after.join(' ')}</Text>
        ) : null}
      </View>

      {/* Options: tap once = select, long-press = audio; locked after Check */}
      <View style={EX.optionsGrid}>
        {ex.options?.map((o, i) => {
          // Gated on the immutable prop, not the `selected` state — `selected`
          // is seeded from `previewSelected` via useState/useEffect, so for a
          // beat across renders it can lag behind, and the ref detaching then
          // reattaching is exactly what let a stale rect from the wrong
          // option survive in the tour store (confirmed: the tour's "Pick
          // your answer" tail pointed at the wrong option). `previewSelected`
          // itself never changes after the exercise mounts, so gating on it
          // directly is stable from the very first render.
          const isPreviewPick = previewSelected != null && o.ar === previewSelected;
          return (
            <TouchableOpacity
              key={i}
              ref={isPreviewPick ? selectedOptionRef : undefined}
              style={[
                EX.optionBtn,
                selected === o.ar && EX.optionSelected,
                // Tour-only: glow the auto-picked option so it's obvious why
                // Check is enabled, since no real tap ever lands here.
                isPreviewPick && EX.optionGlow,
                locked && { opacity: 0.7 },
              ]}
              // onLongPress used to double as "hear this option's audio,"
              // but pairing it with onPress on the same element makes RN's
              // responder wait to see whether a touch becomes a long-press
              // before firing onPress AT ALL -- on a real device that
              // disambiguation delay is exactly what read as "I press them
              // and one of the 4 sometimes doesn't move." A misclassified
              // tap fired the audio instead of selecting, colliding with
              // whatever else was tracking play state. Nothing in this
              // screen ever told the user "hold to hear," so it cost
              // reliability on the one gesture that matters (selecting) for
              // a hidden feature nobody could discover. Removed outright,
              // not reduced -- onPress alone fires immediately, no wait.
              onPress={() => { if (!locked) setSelected(o.ar); }}
            >
              <Text style={[arabicTextStyle(EX.optionText as any, arabicFont) as any, selected === o.ar && EX.optionTextSelected]}>{o.ar}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View ref={checkButtonRef} collapsable={false}>
        <TouchableOpacity
          style={[EX.continueBtn, (!selected || locked) && EX.continueBtnDisabled, glowCheck && TOUR_GLOW]}
          onPress={() => { if (selected && !locked) onSubmit(selected); }}
          disabled={!selected || locked}
        >
          <Text style={EX.continueBtnText}>Check</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

export function ReorderOrSequence({
  ex, surahName, character, locked, onSubmit,
}: { ex: ExerciseDict; surahName: string; character: Character; locked?: boolean; onSubmit: (ans: string[]) => void }) {
  const tiles = (ex.tiles ?? []).filter(t => t.ar != null) as Array<{ ar: string; audio_url?: string | null }>;
  const [bank, setBank] = useState<string[]>(() => tiles.map(t => t.ar));
  const [placed, setPlaced] = useState<string[]>([]);
  const tileAudio = useRef<Record<string, string | null>>({});
  const arabicFont = useArabicFont();

  useEffect(() => {
    tiles.forEach(t => { tileAudio.current[t.ar] = t.audio_url ?? null; });
    setBank(tiles.map(t => t.ar));
    setPlaced([]);
  }, [ex.ex_id]);

  // Tap = place tile only; long press = play audio
  const tapFromBank = (ar: string, idx: number) => {
    setBank(b => b.filter((_, i) => i !== idx));
    setPlaced(p => [...p, ar]);
  };

  const longPressFromBank = (ar: string) => {
    void playUrl(tileAudio.current[ar]);
  };

  // Tap = return to bank; long press = play audio
  const tapFromPlaced = (ar: string, idx: number) => {
    setPlaced(p => p.filter((_, i) => i !== idx));
    setBank(b => [...b, ar]);
  };

  const longPressFromPlaced = (ar: string) => {
    void playUrl(tileAudio.current[ar]);
  };

  const answerLen = ex.answer_len ?? tiles.length;
  const ready = placed.length === answerLen;

  return (
    <ScrollView contentContainerStyle={EX.scrollContent} showsVerticalScrollIndicator={false}>
      {ex.phase === 'mistakes_review' && (
        <View style={EX.reviewBanner}>
          <Text style={EX.reviewBannerText}>🔁  Try again</Text>
        </View>
      )}

      {/* Character + speech bubble */}
      <View style={EX.characterRow}>
        <Image source={character.src} style={EX.characterImg} resizeMode="contain" />
        <View style={EX.verseInfoCard}>
          <View style={EX.bubbleTail} />
          <Text style={EX.characterName}>Ustad {character.name} says:</Text>
          <Text style={EX.bubbleText}>{BUBBLE_TEXT[ex.type] ?? ex.instruction}</Text>
          <Text style={EX.bubbleLabel}>Surah {surahName} · Verse {ex.ayah_no}</Text>
        </View>
      </View>

      {/* Context before */}
      {ex.context_before?.length ? <Text style={arabicTextStyle(EX.contextText as any, arabicFont) as any}>{ex.context_before.join(' ')}</Text> : null}

      {/* Answer zone */}
      <View style={EX.answerZone}>
        {placed.length === 0
          ? <Text style={EX.answerPlaceholder}>Tap words below to place them here</Text>
          : placed.map((ar, i) => (
              <TouchableOpacity
                key={i} style={[EX.placedTile, locked && { opacity: 0.7 }]}
                onPress={() => { if (!locked) tapFromPlaced(ar, i); }}
                onLongPress={() => longPressFromPlaced(ar)}
                delayLongPress={400}
              >
                <Text style={arabicTextStyle(EX.tileText as any, arabicFont) as any}>{ar}</Text>
              </TouchableOpacity>
            ))
        }
      </View>

      {/* Context after */}
      {ex.context_after?.length ? <Text style={arabicTextStyle(EX.contextText as any, arabicFont) as any}>{ex.context_after.join(' ')}</Text> : null}

      {/* Tile bank */}
      <View style={EX.tileBank}>
        {bank.map((ar, i) => (
          <TouchableOpacity
            key={i} style={[EX.bankTile, locked && { opacity: 0.7 }]}
            onPress={() => { if (!locked) tapFromBank(ar, i); }}
            onLongPress={() => longPressFromBank(ar)}
            delayLongPress={400}
          >
            <Text style={arabicTextStyle(EX.tileText as any, arabicFont) as any}>{ar}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[EX.continueBtn, (!ready || locked) && EX.continueBtnDisabled]}
        onPress={() => { if (ready && !locked) onSubmit(placed); }}
        disabled={!ready || locked}
      >
        <Text style={EX.continueBtnText}>Check</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

export function SegmentRecall({
  ex, surahName, character, locked, onSubmit,
}: {
  ex: ExerciseDict;
  surahName: string;
  character: Character;
  locked?: boolean;
  onSubmit: (ans: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const rawOptions = ex.options ?? [];
  const arabicFont = useArabicFont();

  useEffect(() => { setSelected(null); }, [ex.ex_id]);

  return (
    <ScrollView contentContainerStyle={EX.scrollContent} showsVerticalScrollIndicator={false}>
      {ex.phase === 'mistakes_review' && (
        <View style={EX.reviewBanner}>
          <Text style={EX.reviewBannerText}>🔁  Try again</Text>
        </View>
      )}

      {/* Character + speech bubble */}
      <View style={EX.characterRow}>
        <Image source={character.src} style={EX.characterImg} resizeMode="contain" />
        <View style={EX.verseInfoCard}>
          <View style={EX.bubbleTail} />
          <Text style={EX.characterName}>Ustad {character.name} says:</Text>
          <Text style={EX.bubbleText}>{BUBBLE_TEXT[ex.type] ?? ex.instruction}</Text>
          <Text style={EX.bubbleLabel}>Surah {surahName} · Verse {ex.ayah_no}</Text>
        </View>
      </View>

      {/* Options: single tap = select; locked after Check */}
      <View style={EX.optionsColumn}>
        {rawOptions.map((o, i) => (
          <TouchableOpacity
            key={i}
            style={[EX.optionBtnFull, selected === o.ar && EX.optionSelected, locked && { opacity: 0.7 }]}
            onPress={() => { if (!locked) setSelected(o.ar); }}
          >
            <Text style={[arabicTextStyle(EX.optionTextArabic as any, arabicFont) as any, selected === o.ar && EX.optionTextSelected]}>{o.ar}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[EX.continueBtn, (!selected || locked) && EX.continueBtnDisabled]}
        onPress={() => { if (selected && !locked) onSubmit(selected); }}
        disabled={!selected || locked}
      >
        <Text style={EX.continueBtnText}>Check</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Sequence exercise (ayah ordering) ────────────────────────────
// Drag full ayah tiles into numbered dotted slots in the correct order.
// Tiles are plain strings (not ExerciseTile objects). No audio on tiles.

export function SequenceExercise({
  ex, surahName, character, locked, onSubmit,
}: { ex: ExerciseDict; surahName: string; character: Character; locked?: boolean; onSubmit: (ans: string[]) => void }) {
  const rawTiles = (ex.tiles ?? []) as unknown as string[];
  const answerLen = ex.answer_len ?? rawTiles.length;
  const [bank, setBank]     = useState<string[]>([...rawTiles]);
  const [placed, setPlaced] = useState<(string | null)[]>(Array(answerLen).fill(null));
  const arabicFont = useArabicFont();

  useEffect(() => {
    setBank([...rawTiles]);
    setPlaced(Array(answerLen).fill(null));
  }, [ex.ex_id]);

  function tapTile(text: string) {
    if (locked) return;
    const emptyIdx = placed.findIndex(p => p === null);
    if (emptyIdx === -1) return;
    setPlaced(prev => { const n = [...prev]; n[emptyIdx] = text; return n; });
    setBank(b => b.filter(t => t !== text));
  }

  function tapSlot(idx: number) {
    if (locked || !placed[idx]) return;
    const evicted = placed[idx]!;
    setPlaced(prev => { const n = [...prev]; n[idx] = null; return n; });
    setBank(b => [...b, evicted]);
  }

  const ready = placed.every(p => p !== null);

  return (
    <ScrollView contentContainerStyle={EX.scrollContent} showsVerticalScrollIndicator={false}>
      {ex.phase === 'mistakes_review' && (
        <View style={EX.reviewBanner}><Text style={EX.reviewBannerText}>🔁  Try again</Text></View>
      )}

      <View style={EX.characterRow}>
        <Image source={character.src} style={EX.characterImg} resizeMode="contain" />
        <View style={EX.verseInfoCard}>
          <View style={EX.bubbleTail} />
          <Text style={EX.characterName}>Ustad {character.name} says:</Text>
          <Text style={EX.bubbleText}>{BUBBLE_TEXT[ex.type] ?? ex.instruction}</Text>
          <Text style={EX.bubbleLabel}>Surah {surahName}</Text>
        </View>
      </View>

      {/* Answer zone — same-size boxes side by side */}
      <View style={EX.seqAnswerZone}>
        {placed.map((tile, i) => (
          <TouchableOpacity
            key={i}
            style={[EX.seqBox, tile ? EX.seqBoxFilled : EX.seqBoxEmpty]}
            onPress={() => tapSlot(i)}
            activeOpacity={tile ? 0.7 : 1}
          >
            {tile
              ? <Text style={arabicTextStyle(EX.seqTileText as any, arabicFont) as any}>{tile}</Text>
              : <Text style={EX.seqSlotNum}>{i + 1}</Text>}
          </TouchableOpacity>
        ))}
      </View>

      {/* Bank — same-size boxes */}
      <View style={EX.seqBank}>
        {bank.map((text, i) => (
          <TouchableOpacity
            key={`${text}-${i}`}
            style={EX.seqBox}
            onPress={() => tapTile(text)}
            activeOpacity={0.75}
          >
            <AyahText text={text} style={arabicTextStyle(EX.seqTileText as any, arabicFont) as any} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[EX.continueBtn, (!ready || locked) && EX.continueBtnDisabled]}
        onPress={() => { if (ready && !locked) onSubmit(placed.filter(Boolean) as string[]); }}
        disabled={!ready || locked}
      >
        <Text style={EX.continueBtnText}>Check</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Audio Fill exercise ───────────────────────────────────────────
// Same layout as fill_blank but options show play buttons only — no Arabic text visible.

export function AudioFill({
  ex, surahName, character, locked, onSubmit,
}: {
  ex: ExerciseDict;
  surahName: string;
  character: Character;
  locked?: boolean;
  onSubmit: (ans: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const mountedRef = useRef(true);
  const arabicFont = useArabicFont();

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // See PlayPauseBtn's identical subscription — an external stopAudio() call
  // (Check press) doesn't reliably fire playUrl's completion callback on
  // Android, so a play circle can keep showing its pause icon after the
  // sound has actually stopped.
  useEffect(() => onPlayingChange(isPlaying => {
    if (!isPlaying && mountedRef.current) setPlayingIdx(null);
  }), []);

  useEffect(() => {
    setSelected(null);
    setPlayingIdx(null);

    // Preload all audio for this exercise in the background so taps play instantly.
    const allUrls = [
      ...(ex.segment_audio_urls ?? []),
      ...(ex.options?.map(o => o.audio_url).filter(Boolean) ?? []),
    ] as string[];
    void preloadAudioUrls(allUrls);

    return () => { evictPreloadedUrls(allUrls); };
  }, [ex.ex_id]);

  const handleOptionTap = async (ar: string, audioUrl: string | null | undefined, idx: number) => {
    if (locked) return;
    setSelected(ar);
    if (playingIdx === idx) {
      await pauseCurrentAudio();
      if (mountedRef.current) setPlayingIdx(null);
    } else {
      if (mountedRef.current) setPlayingIdx(idx);
      await playUrl(audioUrl, () => { if (mountedRef.current) setPlayingIdx(null); });
    }
  };

  const blankIdx = ex.tokens?.findIndex(t => t.blank) ?? -1;
  const isCorner = blankIdx === 0 || (ex.tokens != null && blankIdx === ex.tokens.length - 1);
  const wordAudioUrls = isCorner && ex.segment_audio_urls?.length ? ex.segment_audio_urls : null;

  return (
    <ScrollView contentContainerStyle={EX.scrollContent} showsVerticalScrollIndicator={false}>
      {ex.phase === 'mistakes_review' && (
        <View style={EX.reviewBanner}><Text style={EX.reviewBannerText}>🔁  Try again</Text></View>
      )}

      <View style={EX.characterRow}>
        <Image source={character.src} style={EX.characterImg} resizeMode="contain" />
        <View style={EX.verseInfoCard}>
          <View style={EX.bubbleTail} />
          <Text style={EX.characterName}>Ustad {character.name} says:</Text>
          <Text style={EX.bubbleText}>{BUBBLE_TEXT['audio_fill']}</Text>
          <Text style={EX.bubbleLabel}>Surah {surahName} · Verse {ex.ayah_no}</Text>
        </View>
      </View>

      {/* "Hear the word" button — user must press to hear; not auto-played */}
      {ex.segment_audio_urls?.length ? (
        <TouchableOpacity style={AF.hearBtn} onPress={() => void playUrlSequence(ex.segment_audio_urls!)}>
          <Image source={SPEAKER_ICON} style={AF.hearBtnIcon} resizeMode="contain" />
          <Text style={AF.hearBtnLabel}>Hear the word</Text>
        </TouchableOpacity>
      ) : null}

      <View style={EX.questionCard}>
        {ex.context_before?.length ? <Text style={arabicTextStyle(EX.contextText as any, arabicFont) as any}>{ex.context_before.join(' ')}</Text> : null}
        {ex.tokens?.length ? (
          <View style={EX.tokensRow}>
            {ex.tokens.map((t, i) =>
              t.blank
                ? <View key={i} style={[EX.blankBox, scaledBlankBox(arabicFont), selected ? EX.blankFilled : null]}>
                    {selected ? <Text style={arabicTextStyle(EX.blankText as any, arabicFont) as any}>?</Text> : null}
                  </View>
                : <Text key={i} style={arabicTextStyle(EX.tokenWord as any, arabicFont) as any}>{t.ar}</Text>
            )}
          </View>
        ) : null}
        {ex.context_after?.length ? <Text style={arabicTextStyle(EX.contextText as any, arabicFont) as any}>{ex.context_after.join(' ')}</Text> : null}
      </View>

      {/* Audio-only options — numbered play circles, no Arabic text shown */}
      <View style={AF.optionsGrid}>
        {(ex.options ?? []).map((o, i) => (
          <TouchableOpacity
            key={i}
            style={[AF.optionBtn, selected === o.ar && AF.optionSelected, locked && { opacity: 0.7 }]}
            onPress={() => { void handleOptionTap(o.ar, o.audio_url, i); }}
            activeOpacity={0.8}
          >
            <View style={[AF.playCircle, selected === o.ar && AF.playCircleSelected, playingIdx === i && AF.playCirclePlaying]}>
              {playingIdx === i
                ? <View style={AF.pauseRow}><View style={AF.pauseBar} /><View style={AF.pauseBar} /></View>
                : <Text style={[AF.playIcon, selected === o.ar && { color: 'white' }]}>▶</Text>
              }
            </View>
            <Text style={[AF.optionNum, selected === o.ar && { color: colors.primary }]}>{i + 1}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[EX.continueBtn, (!selected || locked) && EX.continueBtnDisabled]}
        onPress={() => { if (selected && !locked) onSubmit(selected); }}
        disabled={!selected || locked}
      >
        <Text style={EX.continueBtnText}>Check</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const AF = StyleSheet.create({
  hearBtn:           { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', backgroundColor: colors.primaryBg, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 22, marginBottom: 10, borderWidth: 1.5, borderColor: colors.primary },
  hearBtnIcon:       { width: 18, height: 18 },
  hearBtnLabel:      { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.primary },
  optionsGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 12 },
  optionBtn:         { width: '45%', backgroundColor: 'white', borderWidth: 1.5, borderColor: colors.border, borderRadius: 16, paddingVertical: 12, alignItems: 'center', gap: 6, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  optionSelected:    { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  playCircle:        { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryBg, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  playCircleSelected:{ backgroundColor: colors.primary },
  playCirclePlaying: { backgroundColor: colors.primaryDark },
  playIcon:          { fontSize: 18, color: colors.primary },
  pauseRow:          { flexDirection: 'row', gap: 4 },
  pauseBar:          { width: 4, height: 14, backgroundColor: 'white', borderRadius: 2 },
  optionNum:         { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.mutedText },
});

// ── Ayat Then Order exercise ──────────────────────────────────────
// Shows first ayah as a read-only header. User then reorders tiles of the next ayah.

export function AyatThenOrder({
  ex, surahName, character, locked, onSubmit,
}: { ex: ExerciseDict; surahName: string; character: Character; locked?: boolean; onSubmit: (ans: string[]) => void }) {
  const tiles = (ex.tiles ?? []).filter(t => (t as any).ar != null) as Array<{ ar: string; audio_url?: string | null }>;
  const [bank, setBank]     = useState<string[]>(() => tiles.map(t => t.ar));
  const [placed, setPlaced] = useState<string[]>([]);
  const tileAudio = useRef<Record<string, string | null>>({});
  const arabicFont = useArabicFont();

  useEffect(() => {
    tiles.forEach(t => { tileAudio.current[t.ar] = t.audio_url ?? null; });
    setBank(tiles.map(t => t.ar));
    setPlaced([]);
  }, [ex.ex_id]);

  const tapFromBank = (ar: string, idx: number) => {
    setBank(b => b.filter((_, i) => i !== idx));
    setPlaced(p => [...p, ar]);
  };
  const tapFromPlaced = (ar: string, idx: number) => {
    setPlaced(p => p.filter((_, i) => i !== idx));
    setBank(b => [...b, ar]);
  };

  const answerLen = ex.answer_len ?? tiles.length;
  const ready = placed.length === answerLen;

  return (
    <ScrollView contentContainerStyle={EX.scrollContent} showsVerticalScrollIndicator={false}>
      {ex.phase === 'mistakes_review' && (
        <View style={EX.reviewBanner}><Text style={EX.reviewBannerText}>🔁  Try again</Text></View>
      )}

      <View style={EX.characterRow}>
        <Image source={character.src} style={EX.characterImg} resizeMode="contain" />
        <View style={EX.verseInfoCard}>
          <View style={EX.bubbleTail} />
          <Text style={EX.characterName}>Ustad {character.name} says:</Text>
          <Text style={EX.bubbleText}>{BUBBLE_TEXT['ayat_then_order']}</Text>
          <Text style={EX.bubbleLabel}>Surah {surahName}</Text>
        </View>
      </View>

      {/* First ayah — read-only header with play button */}
      {ex.first_ayah_text ? (
        <View style={ATO.firstAyahCard}>
          <AyahText text={ex.first_ayah_text} style={arabicTextStyle(ATO.firstAyahAr as any, arabicFont) as any} />
          {ex.first_ayah_audio_url ? (
            <PlayPauseBtn url={ex.first_ayah_audio_url} label="Listen" />
          ) : null}
        </View>
      ) : null}

      <Text style={ATO.divider}>↓ What comes next?</Text>

      {/* Answer zone */}
      <View style={EX.answerZone}>
        {placed.length === 0
          ? <Text style={EX.answerPlaceholder}>Tap words below to build the next ayah</Text>
          : placed.map((ar, i) => (
              <TouchableOpacity
                key={i} style={[EX.placedTile, locked && { opacity: 0.7 }]}
                onPress={() => { if (!locked) tapFromPlaced(ar, i); }}
                onLongPress={() => { void playUrl(tileAudio.current[ar]); }}
                delayLongPress={400}
              >
                <Text style={arabicTextStyle(EX.tileText as any, arabicFont) as any}>{ar}</Text>
              </TouchableOpacity>
            ))
        }
      </View>

      {/* Tile bank */}
      <View style={EX.tileBank}>
        {bank.map((ar, i) => (
          <TouchableOpacity
            key={i} style={[EX.bankTile, locked && { opacity: 0.7 }]}
            onPress={() => { if (!locked) tapFromBank(ar, i); }}
            onLongPress={() => { void playUrl(tileAudio.current[ar]); }}
            delayLongPress={400}
          >
            <Text style={arabicTextStyle(EX.tileText as any, arabicFont) as any}>{ar}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[EX.continueBtn, (!ready || locked) && EX.continueBtnDisabled]}
        onPress={() => { if (ready && !locked) onSubmit(placed); }}
        disabled={!ready || locked}
      >
        <Text style={EX.continueBtnText}>Check</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const ATO = StyleSheet.create({
  firstAyahCard: { backgroundColor: '#FFFBF0', borderRadius: 18, padding: 16, marginBottom: 8, borderWidth: 1.5, borderColor: 'rgba(196,168,76,0.4)', alignItems: 'center' },
  firstAyahAr:   { fontFamily: 'NotoNaskhArabic_400Regular', fontSize: 26, color: colors.darkText, textAlign: 'center', lineHeight: 44, marginBottom: 8 },
  divider:       { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.mutedText, textAlign: 'center', marginBottom: 12, marginTop: 4 },
});

// ── Shared result banner for speak exercises ───────────────────────
// Shown inline inside the exercise after the recording is scored.
// passed=true  → green banner  ("Great job!")
// passed=false → orange banner ("Keep practicing!")

interface SpeakResult {
  passed: boolean;
  score_pct: number;
  transcript: string;
  correctAyah?: string | null;
  ayahAudioUrl?: string | null;
  segmentAudioUrls?: string[] | null;
  expectedWords?: ExpectedWordResult[];
}

// Renders the expected text as a single block, highlighting the specific
// word(s) the backend marked wrong (expected_words[].correct === false) so
// the user sees exactly what to fix instead of just a pass/fail score.
function DiffAyahText({ words, fallbackText, style, wrongStyle }: {
  words?: ExpectedWordResult[];
  fallbackText: string;
  style: any;
  wrongStyle: any;
}) {
  if (!words?.length) return <AyahText text={fallbackText} style={style} />;
  return (
    <Text style={style} allowFontScaling={false}>
      {words.map((w, i) => (
        <React.Fragment key={w.index ?? i}>
          <Text style={!w.correct ? wrongStyle : undefined}>{w.word}</Text>
          {i < words.length - 1 ? ' ' : ''}
        </React.Fragment>
      ))}
    </Text>
  );
}

// Full bottom-sheet result — rendered at screen level (like FeedbackBanner)
// so it always has enough room to show the score, XP pill, and Continue button.
// onRetry present → this is the retry-choice moment (always a fail, since
// retry is only ever offered on a wrong first attempt): renders "Try Again" +
// "Next" instead of the single final "Continue" button. onAdvance in that
// case means "decline the retry, accept this result as final."
function SpeakResultBanner({ result, onAdvance, onRetry }: { result: SpeakResult; onAdvance: () => void; onRetry?: () => void }) {
  const { passed, score_pct, correctAyah, ayahAudioUrl, segmentAudioUrls, transcript, expectedWords } = result;
  const arabicFont = useArabicFont();
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  // Show the correction whenever any word was marked wrong — not only on
  // fail. A 75% pass still has mistakes worth pointing out.
  const hasMistakes = !!expectedWords?.some(w => !w.correct);
  return (
    // The sheet itself stays pinned to bottom: 0 — its colour is meant to
    // bleed all the way to the true screen edge, same as the feedback
    // sheet below. Only its own bottom padding grows by insets.bottom, so
    // the Advance button inside never sits under the Android nav buttons.
    //
    // Base padding cut 36 → 16 (2026-08-28). 36 was chosen back when
    // insets.bottom was usually 0; stacked on top of a real inset it left a
    // dead strip under Try Again / Next tall enough that the sheet's capped
    // ScrollView had to be scrolled to reach content that would otherwise
    // have fit. 16 is the gap to the button; insets.bottom is the clearance
    // for the system bar. Those are two different jobs and only one of them
    // should scale with the device.
    <View style={[SRB.sheet, !passed && SRB.sheetFail, { paddingBottom: 16 + insets.bottom }]}>
      {/* Top row: badge + title/subtitle */}
      <View style={SRB.topRow}>
        <View style={[SRB.badge, !passed && SRB.badgeFail]}>
          <Text style={SRB.badgeText} allowFontScaling={false}>{passed ? '★' : '~'}</Text>
        </View>
        <View style={SRB.topText}>
          <Text style={[SRB.title, !passed && SRB.titleFail]} allowFontScaling={false}>
            {passed ? 'Great job!' : 'Keep practicing!'}
          </Text>
          <Text style={[SRB.sub, !passed && SRB.subFail]} allowFontScaling={false}>
            {passed ? `YOU SCORED ${score_pct}%` : `SCORE: ${score_pct}%, AIM FOR 60%+`}
          </Text>
        </View>
      </View>

      {/* Scrollable so a long ayah / many mistake words / a long transcript
          grows inside the capped sheet instead of pushing it over the
          screen — the score header above and Continue button below stay
          fixed and always visible. */}
      <ScrollView style={SRB.scroll} showsVerticalScrollIndicator={false}>
        {/* XP pill — only shown when the user passed (earned it) */}
        {passed && (
          <View style={SRB.xpPill}>
            <Image source={require('../../../assets/images/lumo_xp.png')} style={SRB.xpLumo} resizeMode="contain" />
            <Text style={SRB.xpText} allowFontScaling={false}>+2 XP</Text>
          </View>
        )}

        {/* Correct ayah — shown whenever there's a mistake to point out, with the wrong word(s) highlighted */}
        {!!correctAyah && (hasMistakes || !passed) && (
          <View style={SRB.transcriptBox}>
            <Text style={SRB.transcriptLabel} allowFontScaling={false}>CORRECT AYAH</Text>
            <SegmentPlayBtn
              urls={segmentAudioUrls?.length ? segmentAudioUrls : undefined}
              url={segmentAudioUrls?.length ? undefined : ayahAudioUrl}
            />
            <DiffAyahText
              words={expectedWords}
              fallbackText={correctAyah}
              style={arabicTextStyle(SRB.ayahText as any, arabicFont) as any}
              wrongStyle={SRB.wrongWord}
            />
          </View>
        )}

        {/* What we heard you say — makes the transcription visible to the user */}
        {!!transcript && (hasMistakes || !passed) && (
          <View style={SRB.transcriptBox}>
            <Text style={SRB.transcriptLabel} allowFontScaling={false}>YOU SAID</Text>
            <Text style={arabicTextStyle(SRB.ayahText as any, arabicFont) as any} allowFontScaling={false}>{transcript}</Text>
          </View>
        )}
      </ScrollView>

      {onRetry ? (
        <View style={SRB.btnRow}>
          <TouchableOpacity style={[SRB.btn, SRB.btnSecondary, SRB.btnFlex]} onPress={onRetry}>
            <Text style={[SRB.btnText, SRB.btnTextSecondary]} allowFontScaling={false}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[SRB.btn, SRB.btnFail, SRB.btnFlex]} onPress={onAdvance}>
            <Text style={SRB.btnText} allowFontScaling={false}>Next  →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={[SRB.btn, { marginTop: 18 }, !passed && SRB.btnFail]} onPress={onAdvance}>
          <Text style={SRB.btnText} allowFontScaling={false}>Continue  →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const SRB = StyleSheet.create({
  // Matches FeedbackBanner: absolute bottom sheet with rounded top corners.
  // Capped at 65% of the screen — with more mistakes/a longer ayah than
  // fits, the inner ScrollView scrolls instead of the sheet covering the
  // whole screen (this content is otherwise unbounded auto-height).
  sheet:           { position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '72%', overflow: 'hidden', backgroundColor: '#D1FAE5', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: -2 }, elevation: 4 },
  sheetFail:       { backgroundColor: '#FFF3E0' },
  topRow:          { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  // flexShrink lets this pane give up space to the fixed header/button
  // above and below when content would exceed the sheet's maxHeight,
  // instead of the sheet growing past its cap.
  scroll:          { flexShrink: 1 },
  badge:           { width: 44, height: 44, borderRadius: 22, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center' },
  badgeFail:       { backgroundColor: '#F97316' },
  badgeText:       { fontSize: 20, color: 'white', fontWeight: '700' },
  topText:         { flex: 1 },
  title:           { fontFamily: 'Nunito_700Bold', fontSize: 22, color: '#14532D' },
  titleFail:       { color: '#7C2D12' },
  sub:             { fontFamily: 'Nunito_700Bold', fontSize: 11, color: '#16A34A', letterSpacing: 0.5 },
  subFail:         { color: '#9A3412' },
  // XP pill — full width, content centered, matching FeedbackBanner xpPill
  xpPill:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'white', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  xpLumo:          { width: 32, height: 32 },
  xpText:          { fontFamily: 'Nunito_700Bold', fontSize: 16, color: colors.darkText },
  // The CORRECT AYAH / YOU SAID boxes. Sized to hug the text they hold:
  // lineHeight was 38 on a 22px font (1.73×), which reserved most of a
  // blank extra line per row and made a one-line ayah's box read as an
  // oversized empty card. 1.55× still leaves real headroom for Naskh's
  // ascenders and harakat — the reason it can't simply hug the glyph box
  // — without the padding being visibly larger than the type.
  transcriptBox:   { backgroundColor: 'white', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12, alignItems: 'center' },
  transcriptLabel: { fontFamily: 'Nunito_700Bold', fontSize: 10, color: colors.mutedText, letterSpacing: 1.2, marginBottom: 6 },
  ayahText:        { fontFamily: 'NotoNaskhArabic_400Regular', fontSize: 22, color: colors.darkText, textAlign: 'center', lineHeight: 34 },
  wrongWord:       { color: '#DC2626', textDecorationLine: 'underline' },
  btn:             { backgroundColor: '#16A34A', borderRadius: 16, paddingVertical: 17, alignItems: 'center', shadowColor: '#16A34A', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  btnFail:         { backgroundColor: '#F97316', shadowColor: '#F97316' },
  btnText:         { fontFamily: 'Nunito_700Bold', fontSize: 16, color: 'white' },
  // Clear gap from the scrollable content above (transcript boxes) — was
  // sitting right against it with nothing but the last box's own
  // marginBottom, which read as the buttons crowding/interfering with it.
  btnRow:          { flexDirection: 'row', gap: 10, marginTop: 14 },
  btnFlex:         { flex: 1 },
  btnSecondary:    { backgroundColor: 'white', borderWidth: 2, borderColor: '#F97316', shadowOpacity: 0 },
  btnTextSecondary:{ color: '#F97316' },
});

// ── Read Ayah and Speak exercise ───────────────────────────────────
// Shows the full ayah with a play button (hear it first), then a
// press-and-hold mic to record recitation. Scores via speak-attempt
// API then calls onSpeakScored so the parent can show the result banner.
//
// phase: "main"   — single ayah
// phase: "review" — same UX (side-by-side comparison is deferred)

// retry_choice: sits between a failed first attempt and the final result —
// the user picks Try Again (one more recording, self-contained inside the
// exercise component) or Next (accept the failed attempt as final).
type SpeakState = 'idle' | 'recording' | 'scoring' | 'retry_choice' | 'done';

function ReadAyahAndSpeak({
  ex, surahName, character, onSpeakScored, onFinalize, onSkip,
}: {
  ex: ExerciseDict; surahName: string; character: Character; onSpeakScored: (result: SpeakResult) => void;
  /** Declining the retry (tapping Next in the retry-choice) — the user has
   * already seen that result's feedback there, so this advances straight to
   * the next question instead of routing back through onSpeakScored, which
   * would show the same feedback sheet a second time. */
  onFinalize: (result: SpeakResult) => void;
  onSkip: () => void;
}) {
  const arabicFont = useArabicFont();
  const [speakState, setSpeakState] = useState<SpeakState>('idle');
  const [error, setError]           = useState<string | null>(null);
  // The failed 1st-attempt result, held here (not sent to onSpeakScored) while
  // the user is deciding Try Again vs Next.
  const [pendingResult, setPendingResult] = useState<SpeakResult | null>(null);
  const mountedRef  = useRef(true);
  const recordedUriRef = useRef<string | null>(null);
  // 1 on the first attempt, 2 on the retry — a fail on attempt 2 is always
  // final, no second retry offered.
  const attemptNumRef = useRef(1);
  // Guards against a second tap landing before the first tap's state update
  // has taken effect — only one recording/scoring attempt in flight at a time.
  const busyRef = useRef(false);
  // Auto-stop-and-submit 60s after recording starts — see handleMicTap.
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearRecordingTimer();
      // Clean up any in-flight recording if the component unmounts mid-session
      void stopRecording().catch(() => {});
    };
  }, []);

  // Reset state when the exercise changes (e.g. phase=review, two in a row)
  useEffect(() => {
    setSpeakState('idle');
    setError(null);
    setPendingResult(null);
    recordedUriRef.current = null;
    attemptNumRef.current = 1;
    clearRecordingTimer();
  }, [ex.ex_id]);

  /**
   * Tap the mic — first tap starts recording, second tap stops it and
   * immediately submits it for scoring (no separate Check step).
   */
  const handleMicTap = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      if (speakState === 'idle') {
        setError(null);
        const granted = await requestMicPermission();
        if (!granted) {
          if (mountedRef.current) setError('Microphone permission is required to record your recitation.');
          return;
        }
        try {
          await startRecording();
          if (mountedRef.current) {
            setSpeakState('recording');
            // Auto-stop-and-submit at 60s, same as a manual second tap —
            // stops the recorder from being used to burn long/wasteful
            // speak-attempt API calls.
            clearRecordingTimer();
            recordingTimerRef.current = setTimeout(() => { void handleMicTap(); }, 60000);
          }
        } catch (e) {
          console.warn('[ReadAyahAndSpeak] startRecording failed:', e);
          // This error only ever reached console.warn before — invisible to
          // Crashlytics, so a persistent real-world failure here (as opposed
          // to the already-patched stuck-recorder case the retry above
          // handles silently) had no trace to diagnose from. Recorded here so
          // the next occurrence actually carries the real native message.
          captureError(e, { where: 'ReadAyahAndSpeak.startRecording' });
          if (mountedRef.current) setError('Could not start recording. Please try again.');
        }
        return;
      }

      if (speakState === 'recording') {
        clearRecordingTimer();
        let uri: string | null = null;
        try {
          uri = await stopRecording();
          if (!uri) throw new Error('No audio captured');
        } catch (e) {
          console.warn('[ReadAyahAndSpeak] stopRecording failed:', e);
          captureError(e, { where: 'ReadAyahAndSpeak.stopRecording' });
          if (mountedRef.current) {
            setError('Could not capture your recording. Please try again.');
            setSpeakState('idle');
          }
          return;
        }
        recordedUriRef.current = uri;
        if (mountedRef.current) setSpeakState('scoring');

        try {
          const scored = await progressApi.speakAttempt({
            expected_arabic: ex.expected_arabic ?? '',
            audioUri: uri,
            audioType: Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4',
          });

          if (mountedRef.current) {
            const result: SpeakResult = { passed: scored.passed, score_pct: scored.score_pct, transcript: scored.transcript, correctAyah: ex.ayah_ar ?? ex.expected_arabic ?? null, ayahAudioUrl: ex.ayah_audio_url ?? null, segmentAudioUrls: ex.segment_audio_urls ?? null, expectedWords: scored.expected_words };
            // A pass is always final. A fail on the retry (attempt 2) is also
            // final — only a fail on attempt 1 gets the retry choice.
            if (scored.passed || attemptNumRef.current >= 2) {
              setSpeakState('done');
              onSpeakScored(result);
            } else {
              setPendingResult(result);
              setSpeakState('retry_choice');
            }
          }
        } catch (e) {
          console.warn('[ReadAyahAndSpeak] speak-attempt failed:', e);
          captureError(e, { where: 'ReadAyahAndSpeak.speakAttempt' });
          if (mountedRef.current) {
            setError('Scoring failed. Tap the mic to try again.');
            setSpeakState('idle');
          }
        }
      }
    } finally {
      busyRef.current = false;
    }
  };

  const handleRetry = () => {
    attemptNumRef.current = 2;
    setPendingResult(null);
    setError(null);
    setSpeakState('idle');
  };

  const handleDeclineRetry = () => {
    if (!pendingResult) return;
    setSpeakState('done');
    onFinalize(pendingResult);
  };

  return (
    // Outer wrapper: scrollable content at top, mic pinned at bottom.
    // This ensures the mic button is always reachable regardless of screen size.
    <View style={RAS.outer}>
      <ScrollView contentContainerStyle={RAS.container} showsVerticalScrollIndicator={false}>

        {/* Character speech bubble */}
        <View style={EX.characterRow}>
          <Image source={character.src} style={EX.characterImg} resizeMode="contain" />
          <View style={EX.verseInfoCard}>
            <View style={EX.bubbleTail} />
            <Text style={EX.characterName}>Ustad {character.name} says:</Text>
            <Text style={EX.bubbleText}>{speakState === 'retry_choice' ? RETRY_BUBBLE_TEXT : BUBBLE_TEXT['read_ayah_and_speak']}</Text>
            <Text style={EX.bubbleLabel}>Surah {surahName} · Verse {ex.ayah_no}</Text>
          </View>
        </View>

        {/* Ayah card — the text the user will recite */}
        <View style={RAS.ayahCard}>
          <AyahText
            text={ex.ayah_ar ?? ''}
            style={arabicTextStyle(RAS.ayahText as any, arabicFont) as any}
          />
        </View>

        {/* Hear it first — prefer full ayah URL, fall back to segment URLs.
            Disabled from the moment recording starts through scoring/done —
            not just while actively recording: once an attempt has been
            submitted there's nothing left to prepare for, so replaying the
            hint no longer makes sense (and during recording it'd get picked
            up by the mic and corrupt the recitation being scored). */}
        <PlayPauseBtn
          url={ex.ayah_audio_url}
          urls={ex.segment_audio_urls}
          label="Hear the Ayah"
          disabled={speakState !== 'idle'}
        />

      </ScrollView>

      {/* Mic area pinned below the scroll content so it never gets
          pushed off-screen by the ayah text on short devices */}
      {speakState !== 'done' && speakState !== 'retry_choice' && (
        <View style={RAS.micArea}>
          <Text style={RAS.micInstruction}>
            {speakState === 'recording'
              ? 'Recording… tap to stop'
              : speakState === 'scoring'
              ? 'Scoring your recitation…'
              : 'Tap the mic to start, tap again to stop and check'}
          </Text>

          {speakState === 'scoring' ? (
            <RecitationScoringFeedback />
          ) : (
            <Pressable
              onPress={handleMicTap}
              style={({ pressed }) => [RAS.micBtn, pressed && RAS.micBtnActive]}
            >
              {speakState === 'recording' ? (
                <LottieView
        renderMode="SOFTWARE"
                  source={require('../../../assets/animations/listen.json')}
                  autoPlay
                  loop
                  style={RAS.listenAnim}
                />
              ) : (
                <Image
                  source={require('../../../assets/images/mic.png')}
                  style={RAS.micImage}
                  resizeMode="contain"
                />
              )}
            </Pressable>
          )}

          {/* Every recitation question is skippable — for people who don't
              want to attempt speaking at all. Only offered before a
              recording is made; once there's an attempt in flight/scored,
              the retry-choice's own Next button covers "move on" instead. */}
          {speakState === 'idle' && (
            <TouchableOpacity style={RAS.skipBtn} onPress={onSkip}>
              <Text style={RAS.skipBtnText}>Skip</Text>
            </TouchableOpacity>
          )}

          {!!error && (
            <View style={RAS.errorBox}>
              <Text style={RAS.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => { setError(null); setSpeakState('idle'); }}>
                <Text style={RAS.retryLink}>Try again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Retry-choice bottom sheet — same visual treatment as the final
          result banner, just with Try Again / Next instead of Continue. */}
      {speakState === 'retry_choice' && pendingResult && (
        <SpeakResultBanner result={pendingResult} onAdvance={handleDeclineRetry} onRetry={handleRetry} />
      )}
    </View>
  );
}

const RAS = StyleSheet.create({
  outer:          { flex: 1 },
  container:      { padding: 20, paddingBottom: 8 },
  ayahCard:       { width: '100%', backgroundColor: '#FFFBF0', borderRadius: 18, borderWidth: 1.5, borderColor: '#E8D8A0', padding: 24, alignItems: 'center', marginBottom: 16 },
  ayahText:       { fontFamily: 'NotoNaskhArabic_400Regular', fontSize: 28, color: colors.darkText, textAlign: 'center', lineHeight: 52 },
  // Fixed bottom area — always visible above the result sheet
  micArea:        { alignItems: 'center', paddingVertical: 20, paddingBottom: 32 },
  micInstruction: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.mutedText, marginBottom: 20, textAlign: 'center' },
  spinner:        { marginTop: 16, marginBottom: 16 },
  // White background with green border makes the mic.png icon clearly visible
  // against the button surface. Press → slight scale-down.
  micBtn:         { width: 108, height: 108, borderRadius: 54, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 12 },
  micBtnActive:   { transform: [{ scale: 0.93 }], shadowOpacity: 0.25 },
  micBtnRecorded: { width: 76, height: 76, borderRadius: 38, opacity: 0.7 },
  micImage:       { width: 52, height: 52, tintColor: 'white' },
  listenAnim:     { width: 88, height: 88 },
  checkBtn:       { width: '100%', marginTop: 20 },
  skipBtn:        { marginTop: 18, paddingVertical: 4, paddingHorizontal: 10 },
  skipBtnText:    { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.mutedText, textDecorationLine: 'underline' },
  errorBox:       { marginTop: 20, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, alignItems: 'center', width: '100%' },
  errorText:      { fontFamily: 'Nunito_400Regular', fontSize: 13, color: '#991B1B', textAlign: 'center', marginBottom: 8 },
  retryLink:      { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.primary },
});

// ── Read and Speak exercise ────────────────────────────────────────
// Shows a row of tappable word chips (each plays its audio_url).
// Press-and-hold the mic to record reading all the words aloud.
// Scores via speak-attempt API and shows result inline.

export function ReadAndSpeak({
  ex, surahName, character, onSpeakScored, onFinalize, onSkip, micButtonRef, glowMic,
}: {
  ex: ExerciseDict; surahName: string; character: Character; onSpeakScored: (result: SpeakResult) => void;
  /** Declining the retry (tapping Next in the retry-choice) — the user has
   * already seen that result's feedback there, so this advances straight to
   * the next question instead of routing back through onSpeakScored, which
   * would show the same feedback sheet a second time. */
  onFinalize: (result: SpeakResult) => void;
  onSkip: () => void;
  /** Tour-only: lets TourLessonScreen measure the real mic button, for the cutout hole. */
  micButtonRef?: React.Ref<View>;
  /** Tour-only: glow the real mic button itself. */
  glowMic?: boolean;
}) {
  const arabicFont = useArabicFont();
  const [speakState, setSpeakState] = useState<SpeakState>('idle');
  const [error, setError]           = useState<string | null>(null);
  // The failed 1st-attempt result, held here (not sent to onSpeakScored) while
  // the user is deciding Try Again vs Next.
  const [pendingResult, setPendingResult] = useState<SpeakResult | null>(null);
  // True only while the "Hear" (whole-phrase) audio is actually playing —
  // used to disable the individual word chips so their taps don't overlap
  // the sequential playback. Never hides the chips themselves.
  const [hearingAll, setHearingAll] = useState(false);
  const mountedRef = useRef(true);
  // 1 on the first attempt, 2 on the retry — a fail on attempt 2 is always
  // final, no second retry offered.
  const attemptNumRef = useRef(1);
  // Auto-stop-and-submit 60s after recording starts — see handleMicTap.
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearRecordingTimer();
      void stopRecording().catch(() => {});
    };
  }, []);

  const recordedUriRef = useRef<string | null>(null);
  // Guards against a second tap landing before the first tap's state update
  // has taken effect — only one recording/scoring attempt in flight at a time.
  const busyRef = useRef(false);

  useEffect(() => {
    setSpeakState('idle');
    setError(null);
    setPendingResult(null);
    setHearingAll(false);
    recordedUriRef.current = null;
    attemptNumRef.current = 1;
    clearRecordingTimer();
  }, [ex.ex_id]);

  /**
   * Tap the mic — first tap starts recording, second tap stops it and
   * immediately submits it for scoring (no separate Check step).
   */
  const handleMicTap = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      if (speakState === 'idle') {
        setError(null);
        const granted = await requestMicPermission();
        if (!granted) {
          if (mountedRef.current) setError('Microphone permission is required to record your recitation.');
          return;
        }
        try {
          await startRecording();
          if (mountedRef.current) {
            setSpeakState('recording');
            // Auto-stop-and-submit at 60s, same as a manual second tap —
            // stops the recorder from being used to burn long/wasteful
            // speak-attempt API calls.
            clearRecordingTimer();
            recordingTimerRef.current = setTimeout(() => { void handleMicTap(); }, 60000);
          }
        } catch (e) {
          console.warn('[ReadAndSpeak] startRecording failed:', e);
          captureError(e, { where: 'ReadAndSpeak.startRecording' });
          if (mountedRef.current) setError('Could not start recording. Please try again.');
        }
        return;
      }

      if (speakState === 'recording') {
        clearRecordingTimer();
        let uri: string | null = null;
        try {
          uri = await stopRecording();
          if (!uri) throw new Error('No audio captured');
        } catch (e) {
          console.warn('[ReadAndSpeak] stopRecording failed:', e);
          captureError(e, { where: 'ReadAndSpeak.stopRecording' });
          if (mountedRef.current) {
            setError('Could not capture your recording. Please try again.');
            setSpeakState('idle');
          }
          return;
        }
        recordedUriRef.current = uri;
        if (mountedRef.current) setSpeakState('scoring');

        try {
          const scored = await progressApi.speakAttempt({
            expected_arabic: ex.expected_arabic ?? '',
            audioUri: uri,
            audioType: Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4',
          });

          if (mountedRef.current) {
            const wordAudioUrls = ex.tokens?.map(t => t.audio_url).filter((u): u is string => !!u?.trim()) ?? null;
            const result: SpeakResult = { passed: scored.passed, score_pct: scored.score_pct, transcript: scored.transcript, correctAyah: ex.expected_arabic ?? null, ayahAudioUrl: ex.ayah_audio_url ?? null, segmentAudioUrls: wordAudioUrls, expectedWords: scored.expected_words };
            // A pass is always final. A fail on the retry (attempt 2) is also
            // final — only a fail on attempt 1 gets the retry choice.
            if (scored.passed || attemptNumRef.current >= 2) {
              setSpeakState('done');
              onSpeakScored(result);
            } else {
              setPendingResult(result);
              setSpeakState('retry_choice');
            }
          }
        } catch (e) {
          console.warn('[ReadAndSpeak] speak-attempt failed:', e);
          captureError(e, { where: 'ReadAndSpeak.speakAttempt' });
          if (mountedRef.current) {
            setError('Scoring failed. Tap the mic to try again.');
            setSpeakState('idle');
          }
        }
      }
    } finally {
      busyRef.current = false;
    }
  };

  const handleRetry = () => {
    attemptNumRef.current = 2;
    setPendingResult(null);
    setError(null);
    setSpeakState('idle');
  };

  const handleDeclineRetry = () => {
    if (!pendingResult) return;
    setSpeakState('done');
    onFinalize(pendingResult);
  };

  const tokens = ex.tokens ?? [];

  // Collect all audio URLs for the "hear them all" sequential playback
  const allAudioUrls = tokens.map(t => t.audio_url).filter(Boolean) as string[];

  return (
    <View style={RANS.outer}>
      <ScrollView contentContainerStyle={RANS.container} showsVerticalScrollIndicator={false}>

        {/* Character speech bubble */}
        <View style={EX.characterRow}>
          <Image source={character.src} style={EX.characterImg} resizeMode="contain" />
          <View style={EX.verseInfoCard}>
            <View style={EX.bubbleTail} />
            <Text style={EX.characterName}>Ustad {character.name} says:</Text>
            <Text style={EX.bubbleText}>{speakState === 'retry_choice' ? RETRY_BUBBLE_TEXT : BUBBLE_TEXT['read_and_speak']}</Text>
            <Text style={EX.bubbleLabel}>Surah {surahName} · Verse {ex.ayah_no}</Text>
          </View>
        </View>

        {/* Word chips — displayed RTL (right-to-left, Arabic reading order).
            Always stay visible; only disabled from the moment recording
            starts through scoring/done (mid-recording a tap would get
            picked up by the mic, and once an attempt is submitted there's
            nothing left to prepare for), or while "Hear" is playing all
            words back-to-back (avoids overlapping audio). */}
        <View style={RANS.wordRow}>
          {tokens.map((token, i) => (
            <TouchableOpacity
              key={i}
              style={[RANS.wordChip, (speakState !== 'idle' || hearingAll) && RANS.wordChipDisabled]}
              onPress={() => { void playUrl(token.audio_url); }}
              disabled={speakState !== 'idle' || hearingAll}
            >
              <Text style={arabicTextStyle(RANS.wordText as any, arabicFont) as any}>
                {token.ar}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* "Hear" — pre-loads all word audio then plays in rapid succession.
            Disabled from the moment recording starts through scoring/done,
            same as the word chips, and while its own playback is in flight. */}
        {allAudioUrls.length > 0 && (
          <TouchableOpacity
            style={[RANS.hearAllBtn, (speakState !== 'idle' || hearingAll) && RANS.hearAllBtnDisabled]}
            onPress={() => {
              setHearingAll(true);
              void playUrlSequenceFast(allAudioUrls, () => { if (mountedRef.current) setHearingAll(false); });
            }}
            disabled={speakState !== 'idle' || hearingAll}
          >
            <Image source={SPEAKER_ICON} style={RANS.hearAllIcon} resizeMode="contain" />
            <Text style={RANS.hearAllText}>Hear</Text>
          </TouchableOpacity>
        )}

      </ScrollView>

      {/* Mic area pinned below scroll — always visible on all screen sizes */}
      {speakState !== 'done' && speakState !== 'retry_choice' && (
        <View style={RANS.micArea}>
          {speakState !== 'scoring' && (
            <Text style={RANS.micInstruction}>
              {speakState === 'recording'
                ? 'Recording… tap to stop'
                : 'Tap the mic to start, tap again to stop and check'}
            </Text>
          )}

          {speakState === 'scoring' ? (
            <RecitationScoringFeedback />
          ) : (
            <View ref={micButtonRef} collapsable={false}>
              <Pressable
                onPress={handleMicTap}
                style={({ pressed }) => [RANS.micBtn, pressed && RANS.micBtnActive, glowMic && TOUR_GLOW]}
              >
                {speakState === 'recording' ? (
                  <LottieView
          renderMode="SOFTWARE"
                    source={require('../../../assets/animations/listen.json')}
                    autoPlay
                    loop
                    style={RANS.listenAnim}
                  />
                ) : (
                  <Image
                    source={require('../../../assets/images/mic.png')}
                    style={RANS.micImage}
                    resizeMode="contain"
                  />
                )}
              </Pressable>
            </View>
          )}

          {/* Every recitation question is skippable — for people who don't
              want to attempt speaking at all. Only offered before a
              recording is made; once there's an attempt in flight/scored,
              the retry-choice's own Next button covers "move on" instead. */}
          {speakState === 'idle' && (
            <TouchableOpacity style={RANS.skipBtn} onPress={onSkip}>
              <Text style={RANS.skipBtnText}>Skip</Text>
            </TouchableOpacity>
          )}

          {!!error && (
            <View style={RANS.errorBox}>
              <Text style={RANS.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => { setError(null); setSpeakState('idle'); }}>
                <Text style={RANS.retryLink}>Try again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Retry-choice bottom sheet — same visual treatment as the final
          result banner, just with Try Again / Next instead of Continue. */}
      {speakState === 'retry_choice' && pendingResult && (
        <SpeakResultBanner result={pendingResult} onAdvance={handleDeclineRetry} onRetry={handleRetry} />
      )}
    </View>
  );
}

const RANS = StyleSheet.create({
  outer:          { flex: 1 },
  container:      { padding: 20, paddingBottom: 8 },
  // Words wrap into multiple lines for longer ayahs
  wordRow:        { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 16, width: '100%' },
  wordChip:       { backgroundColor: '#FFFBF0', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1.5, borderColor: '#E8D8A0' },
  wordChipDisabled: { opacity: 0.4 },
  wordText:       { fontFamily: 'NotoNaskhArabic_400Regular', fontSize: 22, color: colors.darkText },
  // "Hear them all" button — plays the full phrase sequence
  hearAllBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', backgroundColor: colors.primaryBg, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 18, marginBottom: 8, borderWidth: 1, borderColor: colors.primary },
  hearAllBtnDisabled: { opacity: 0.4 },
  hearAllIcon:    { width: 14, height: 14 },
  hearAllText:    { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.primary },
  micArea:        { alignItems: 'center', paddingVertical: 20, paddingBottom: 32 },
  micInstruction: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.mutedText, marginBottom: 20, textAlign: 'center' },
  spinner:        { marginTop: 16, marginBottom: 16 },
  // White background with green border makes mic.png clearly visible
  micBtn:         { width: 108, height: 108, borderRadius: 54, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 12 },
  micBtnActive:   { transform: [{ scale: 0.93 }], shadowOpacity: 0.25 },
  micBtnRecorded: { width: 76, height: 76, borderRadius: 38, opacity: 0.7 },
  micImage:       { width: 52, height: 52, tintColor: 'white' },
  listenAnim:     { width: 88, height: 88 },
  checkBtn:       { width: '100%', marginTop: 20 },
  skipBtn:        { marginTop: 18, paddingVertical: 4, paddingHorizontal: 10 },
  skipBtnText:    { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.mutedText, textDecorationLine: 'underline' },
  errorBox:       { marginTop: 20, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, alignItems: 'center', width: '100%' },
  errorText:      { fontFamily: 'Nunito_400Regular', fontSize: 13, color: '#991B1B', textAlign: 'center', marginBottom: 8 },
  retryLink:      { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.primary },
});

// ── Recitation Scoring Feedback ───────────────────────────────────
// During recitation scoring, show Lumo mascot + rotating hourglass + text
function RecitationScoringFeedback() {
  const lottieRef = useRef<LottieView>(null);
  useEffect(() => {
    // autoPlay can silently fail to kick in for a LottieView mounted inside
    // a conditional branch during a batched re-render (this one appears
    // exactly when speakState flips to 'scoring') — explicitly start
    // playback too rather than relying on autoPlay alone.
    lottieRef.current?.play();
  }, []);
  return (
    <View style={RSF.container}>
      <View style={{ width: 90, height: 90 }}>
        <Image
          source={require('../../../assets/images/lumo_kufi.png')}
          style={RSF.lumo}
          resizeMode="contain"
        />
      </View>
      <LottieView
        ref={lottieRef}
        source={require('../../../assets/animations/loading.json')}
        autoPlay
        loop
        style={RSF.hourglass}
        renderMode="SOFTWARE"
      />
      <Text style={RSF.text}>Scoring your recitation please</Text>
    </View>
  );
}

const RSF = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16, marginBottom: 16 },
  lumo: { width: 90, height: 90 },
  hourglass: { width: 70, height: 70 },
  text: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: colors.mutedText, marginTop: 4 },
});

// ── Hear and Select exercise ──────────────────────────────────────
// Auto-plays segment audio on mount. Big speaker button to replay.
// Tap option = select. Long-press option = hear its audio. Submit = ar string.

export function HearAndSelect({
  ex, surahName, character, locked, onSubmit,
}: {
  ex: ExerciseDict;
  surahName: string;
  character: Character;
  locked?: boolean;
  onSubmit: (ans: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const seqGenRef = useRef(0);
  const mountedRef = useRef(true);
  const arabicFont = useArabicFont();
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // REMOVED 2026-08-28 (real bug, not the onLongPress issue reported
  // alongside it): this subscription used to fire on EVERY between-word gap
  // in the sequence below, not just a genuine external stop -- each clip in
  // segment_audio_urls independently goes true->false as it plays, so on a
  // 3-word phrase this fired twice before the phrase was even half heard.
  // Bumping seqGenRef here made the loop below see "seqGenRef.current !==
  // gen" on its very next iteration and return early -- so only the FIRST
  // word of any multi-word phrase ever actually played, and the button
  // flipped back to its idle icon at that same moment (both halves of "I'm
  // holding the options but audio is not playing" / "the play/pause
  // changes"). The loop's own natural-completion branch at the bottom of
  // startPlayback already sets playing=false correctly once every word has
  // genuinely finished -- this handler was never needed for that case, only
  // for a real external stop (Check press mid-phrase), and playToken (see
  // services/audioPlayer.ts) now makes that case safe without it: stopAudio()
  // bumps playToken, so every remaining queued clip's on-demand load sees a
  // stale token and resolves near-instantly without playing, instead of
  // hanging for its full duration -- the loop reaches its own natural end
  // (and sets playing=false itself) within a beat either way.

  const startPlayback = () => {
    const urls = ex.segment_audio_urls ?? [];
    if (!urls.length) return;
    seqGenRef.current += 1;
    const gen = seqGenRef.current;
    if (mountedRef.current) setPlaying(true);
    void (async () => {
      for (const url of urls) {
        if (seqGenRef.current !== gen) return;
        await new Promise<void>(resolve => { void playUrl(url, resolve); });
      }
      if (seqGenRef.current === gen && mountedRef.current) setPlaying(false);
    })();
  };

  useEffect(() => {
    setSelected(null);
  }, [ex.ex_id]);

  return (
    <ScrollView contentContainerStyle={EX.scrollContent} showsVerticalScrollIndicator={false}>
      {ex.phase === 'mistakes_review' && (
        <View style={EX.reviewBanner}>
          <Text style={EX.reviewBannerText}>🔁  Try again</Text>
        </View>
      )}

      {/* Character + speech bubble */}
      <View style={EX.characterRow}>
        <Image source={character.src} style={EX.characterImg} resizeMode="contain" />
        <View style={EX.verseInfoCard}>
          <View style={EX.bubbleTail} />
          <Text style={EX.characterName}>Ustad {character.name} says:</Text>
          <Text style={EX.bubbleText}>Hear the sound and select</Text>
          <Text style={EX.bubbleLabel}>Surah {surahName} · Verse {ex.ayah_no}</Text>
        </View>
      </View>

      {/* Big speaker button */}
      <TouchableOpacity
        style={[HAS.speakerBtn, playing && HAS.speakerBtnActive]}
        onPress={startPlayback}
        disabled={locked}
        activeOpacity={0.8}
      >
        {playing
          ? <View style={HAS.pauseIcon}><View style={HAS.pauseBar} /><View style={HAS.pauseBar} /></View>
          : <Image source={SPEAKER_ICON} style={HAS.speakerIcon} resizeMode="contain" />
        }
        <Text style={[HAS.speakerLabel, playing && { color: 'rgba(255,255,255,0.85)' }]}>
          {playing ? 'Playing…' : 'Tap to hear'}
        </Text>
      </TouchableOpacity>

      {/* Option cards */}
      <View style={EX.optionsColumn}>
        {(ex.options ?? []).map((o, i) => (
          <TouchableOpacity
            key={i}
            style={[EX.optionBtnFull, selected === o.ar && EX.optionSelected, locked && { opacity: 0.7 }]}
            // See the identical fix (and its full comment) in
            // FillBlankOrNextWord's option TouchableOpacity above -- same
            // onPress/onLongPress ambiguity, same fix: drop onLongPress so
            // onPress fires immediately instead of waiting to disambiguate.
            onPress={() => { if (!locked) setSelected(o.ar); }}
          >
            <Text style={[arabicTextStyle(EX.optionTextArabic as any, arabicFont) as any, selected === o.ar && EX.optionTextSelected]}>{o.ar}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[EX.continueBtn, (!selected || locked) && EX.continueBtnDisabled]}
        onPress={() => { if (selected && !locked) onSubmit(selected); }}
        disabled={!selected || locked}
      >
        <Text style={EX.continueBtnText}>Check</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const HAS = StyleSheet.create({
  speakerBtn: {
    alignSelf: 'center', alignItems: 'center', justifyContent: 'center',
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: colors.primaryBg, borderWidth: 3, borderColor: colors.primary,
    marginBottom: 24,
    shadowColor: colors.primary, shadowOpacity: 0.28, shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  speakerBtnActive: { backgroundColor: colors.primary },
  speakerIcon:  { width: 36, height: 36 },
  speakerLabel: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: colors.primary, marginTop: 6, textAlign: 'center' },
  pauseIcon:    { flexDirection: 'row', gap: 7, alignItems: 'center' },
  pauseBar:     { width: 7, height: 30, backgroundColor: 'white', borderRadius: 3 },
});

const EX = StyleSheet.create({
  // Trimmed from padding:20/paddingBottom:40 — this is a compact-fit
  // screen (see characterImg etc. below), not a scrolling one; the outer
  // exercise container already reserves the nav-bar inset on its own (see
  // exerciseArea in the main render), so this only needs a modest bottom
  // margin, not a scroll safety cushion.
  scrollContent: { padding: 16, paddingBottom: 20 },
  instruction: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: colors.darkText, textAlign: 'center', marginBottom: 12 },
  // Character + speech bubble — sized to fit every exercise on one screen
  // without scrolling on a typical phone, not to showcase the mascot.
  characterRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10, overflow: 'visible' },
  characterImg: { width: 80, height: 80 },
  // padding 12->8, gap 3->2 (2026-08-28): shared by FillBlankOrNextWord and
  // HearAndSelect's "Ustad says" clue bubble -- 12px of padding around 10-14px
  // text read as disproportionate ("a LOT of padding for such a small font").
  verseInfoCard: { flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 8, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2, gap: 2 },
  bubbleTail: { position: 'absolute', left: -10, top: 18, width: 0, height: 0, borderTopWidth: 8, borderBottomWidth: 8, borderRightWidth: 10, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: 'white' },
  characterName: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: colors.primary, letterSpacing: 0.8 },
  bubbleLabel: { fontFamily: 'Nunito_400Regular', fontSize: 10, color: colors.mutedText },
  bubbleText:  { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.darkText },
  // Word-by-word speaker (above question card)
  wordAudioBtn:   { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8, backgroundColor: colors.primaryBg, borderRadius: 14, paddingVertical: 5, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.primary },
  wordAudioIcon:  { width: 13, height: 13 },
  wordAudioLabel: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: colors.primary },
  // Review (wrong-answer replay) banner
  reviewBanner: { backgroundColor: '#FEF3C7', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, marginBottom: 10, alignItems: 'center' as const, borderWidth: 1, borderColor: '#F59E0B' },
  reviewBannerText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: '#92400E' },
  // Question card
  questionCard: { backgroundColor: '#FFFBF0', borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1.5, borderColor: 'rgba(196,168,76,0.4)', alignItems: 'center' },
  ayahCard: { backgroundColor: 'white', borderRadius: 18, padding: 22, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  ayahAr: { fontFamily: 'NotoNaskhArabic_400Regular', fontSize: 28, color: colors.darkText, textAlign: 'right', lineHeight: 52, marginBottom: 10 },
  ayahTrans: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.mutedText, textAlign: 'center', lineHeight: 20 },
  contextText: { fontFamily: 'NotoNaskhArabic_400Regular', fontSize: 22, color: colors.darkText, textAlign: 'center', marginBottom: 4 },
  tokensRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 },
  tokenWord: { fontFamily: 'NotoNaskhArabic_400Regular', fontSize: 24, color: colors.darkText },
  blankBox: { borderBottomWidth: 2.5, borderColor: colors.primary, minWidth: 70, height: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  blankFilled: { borderColor: colors.primary },
  blankText:        { fontFamily: 'NotoNaskhArabic_400Regular', fontSize: 24, color: colors.primary },
  blankSpeaker:     { alignItems: 'center', justifyContent: 'center', padding: 4 },
  blankSpeakerIcon: { fontSize: 20 },
  // Options
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 8 },
  optionBtn: { backgroundColor: 'white', borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', minWidth: '45%', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  optionBtnFull: { backgroundColor: 'white', borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 20, marginBottom: 10, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  optionGlow: {
    borderColor: colors.gold, borderWidth: 2,
    shadowColor: colors.gold, shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  optionText: { fontFamily: 'NotoNaskhArabic_400Regular', fontSize: 20, color: colors.darkText },
  optionTextArabic: { fontFamily: 'NotoNaskhArabic_400Regular', fontSize: 18, color: colors.darkText, textAlign: 'center' },
  optionTextSelected: { color: colors.primary },
  optionsColumn: { gap: 10, marginBottom: 24 },
  answerZone: { minHeight: 60, backgroundColor: 'white', borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed', flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, padding: 10, marginBottom: 16, alignItems: 'center', justifyContent: 'center' },
  answerPlaceholder: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.mutedText },
  tileBank: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 24 },
  bankTile: { backgroundColor: 'white', borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  placedTile: { backgroundColor: colors.primaryBg, borderWidth: 1.5, borderColor: colors.primary, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  tileText: { fontFamily: 'NotoNaskhArabic_400Regular', fontSize: 20, color: colors.darkText },
  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', backgroundColor: colors.primaryBg, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20, marginBottom: 16 },
  listenBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.primary },
  continueBtn: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 14, alignItems: 'center', shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  continueBtnDisabled: { opacity: 0.35 },
  continueBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: 'white' },
  // Sequence (ayah ordering) exercise styles
  seqAnswerZone: { flexDirection: 'column' as const, gap: 12, marginVertical: 20, paddingHorizontal: 16 },
  seqBank:       { flexDirection: 'column' as const, gap: 12, marginBottom: 24, paddingHorizontal: 16 },
  seqBox:        { minHeight: 64, borderRadius: 16,
                   alignItems: 'center' as const, justifyContent: 'center' as const,
                   paddingHorizontal: 16, paddingVertical: 14,
                   backgroundColor: 'white', borderWidth: 2, borderColor: colors.primary },
  seqBoxFilled:  { backgroundColor: 'rgba(55,161,104,0.1)' },
  seqBoxEmpty:   { borderStyle: 'dashed' as const, borderColor: 'rgba(55,161,104,0.4)', backgroundColor: 'rgba(55,161,104,0.03)' },
  seqSlotNum:    { fontFamily: 'Nunito_700Bold', fontSize: 18, color: 'rgba(55,161,104,0.25)' },
  seqTileText:   { fontFamily: 'NotoNaskhArabic_400Regular', fontSize: 20, color: '#1A3A2A', textAlign: 'right' as const, lineHeight: 32 },
});

// ── Feedback overlay ───────────────────────────────────────────────

export function FeedbackBanner({
  result, onAdvance, bannerRef, glow,
}: {
  result: FormulaAttemptOut; onAdvance: () => void;
  /** Tour-only: lets TourLessonScreen measure the real feedback sheet, for the cutout hole. */
  bannerRef?: React.Ref<View>;
  /** Tour-only: glow the real feedback sheet itself. */
  glow?: boolean;
}) {
  const correct = result.correct;
  const arabicFont = useArabicFont();
  const xpAwarded = result.xp_awarded ?? 0;
  const showAnswer = !correct && result.correct_answer != null;
  const answerStr = Array.isArray(result.correct_answer)
    ? result.correct_answer.join(' ')
    : String(result.correct_answer ?? '');

  if (correct) {
    return (
      <View ref={bannerRef} collapsable={false} style={[FB.sheet, glow && TOUR_GLOW]}>
        <View style={FB.correctRow}>
          <View style={FB.correctBadge}><Text style={FB.correctBadgeText}>✓</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={FB.correctTitle}>Correct!</Text>
            <Text style={FB.correctSub}>YOU'RE GOING STRONG!</Text>
          </View>
        </View>
        {xpAwarded > 0 && (
          <View style={FB.xpPill}>
            <Image source={require('../../../assets/images/lumo_xp.png')} style={FB.xpLumo} resizeMode="contain" />
            <Text style={FB.xpText}>+{xpAwarded} XP</Text>
          </View>
        )}
        <TouchableOpacity style={FB.continueBtn} onPress={onAdvance}>
          <Text style={FB.continueBtnText}>Continue  →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View ref={bannerRef} collapsable={false} style={[FB.sheet, FB.wrongSheet, glow && TOUR_GLOW]}>
      <View style={FB.wrongRow}>
        <View style={FB.wrongBadge}><Text style={FB.wrongBadgeText}>✕</Text></View>
        <Text style={[FB.wrongTitle, { flex: 1 }]}>Incorrect</Text>
      </View>
      {showAnswer && (
        <>
          <Text style={FB.correctAnswerLabel}>CORRECT ANSWER:</Text>
          <View style={FB.correctAnswerBox}>
            <Text style={arabicTextStyle(FB.correctAnswerText as any, arabicFont) as any}>{answerStr}</Text>
          </View>
        </>
      )}
      <TouchableOpacity style={FB.gotItBtn} onPress={onAdvance}>
        <Text style={FB.gotItBtnText}>GOT IT</Text>
      </TouchableOpacity>
    </View>
  );
}

const FB = StyleSheet.create({
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#D1FAE5', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 36, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: -2 }, elevation: 4 },
  wrongSheet: { backgroundColor: '#FEE2E2' },
  correctRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  correctBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center' },
  correctBadgeText: { fontSize: 20, color: 'white', fontWeight: '700' },
  correctTitle: { fontFamily: 'Nunito_700Bold', fontSize: 22, color: '#14532D' },
  correctSub: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: '#16A34A', letterSpacing: 0.5 },
  xpPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'white', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  xpLumo: { width: 32, height: 32 },
  xpText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: colors.darkText },
  continueBtn: { backgroundColor: '#16A34A', borderRadius: 16, paddingVertical: 17, alignItems: 'center', shadowColor: '#16A34A', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  continueBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: 'white' },
  wrongRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  wrongBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center' },
  wrongBadgeText: { fontSize: 18, color: 'white', fontWeight: '700' },
  wrongTitle: { fontFamily: 'Nunito_700Bold', fontSize: 22, color: '#7F1D1D' },
  correctAnswerLabel: { fontFamily: 'Nunito_700Bold', fontSize: 10, color: '#991B1B', letterSpacing: 1.2, marginBottom: 8 },
  correctAnswerBox: { backgroundColor: 'white', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center', marginBottom: 20 },
  correctAnswerText: { fontFamily: 'NotoNaskhArabic_400Regular', fontSize: 22, color: colors.darkText, textAlign: 'center' },
  gotItBtn: { backgroundColor: '#DC2626', borderRadius: 16, paddingVertical: 17, alignItems: 'center', shadowColor: '#DC2626', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  gotItBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: 'white', letterSpacing: 0.5 },
});

// ── Exercise slide-in — mounts fresh (via the `key={exercise.ex_id}` on its
// parent) every time the current exercise changes, so each new exercise
// animates in from the right instead of just popping into place. ──
export function ExerciseSlide({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const translateX = useRef(new Animated.Value(width)).current;
  useEffect(() => {
    Animated.timing(translateX, {
      toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, []);
  return <Animated.View style={{ flex: 1, transform: [{ translateX }] }}>{children}</Animated.View>;
}

// ── Main screen ────────────────────────────────────────────────────

interface Props {
  navigation: RootNavProp;
  route: { params: { groupId: string; surahName: string; surahNumber: number; isSpecial?: boolean } };
}

export default function LessonSessionScreen({ navigation, route }: Props) {
  const { groupId, surahName, surahNumber, isSpecial } = route.params;
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };

  const { sessionId, firstExercise, error, loading, group, reset, loadGroup, startSession, completeSession, abandonSession, groupId: storeGroupId, progressPct: storeProgressPct } = useLessonStore();
  const { user } = useAuthStore();

  const [exercise, setExercise] = useState<ExerciseDict | null>(null);
  // Plain statement, not an effect — see activeExerciseId's own comment for
  // why this has to land during render, before any effect (this component's
  // or a child exercise's) can run and capture a stale value.
  activeExerciseId = exercise?.ex_id ?? null;
  const [showBismillah, setShowBismillah] = useState(false);
  const [segments, setSegments] = useState<SegmentStatus[]>([]);
  const [feedback, setFeedback] = useState<FormulaAttemptOut | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  // Tracks real system-audio play/pause/stop state (audioPlayer.ts pub-sub)
  // so the wave animation shows exactly while audio is audibly playing.
  const [systemPlaying, setSystemPlaying] = useState(false);
  useEffect(() => onPlayingChange(setSystemPlaying), []);
  // Cuts off anything already mid-playback the instant the exercise changes
  // — activeExerciseId (set above, during render) stops a still-QUEUED play
  // from starting late on the next exercise, but a clip already partway
  // through needs this to stop audibly rather than finish out on its own.
  useEffect(() => { stopAudio(); }, [exercise?.ex_id]);
  const [noHeartsVisible, setNoHeartsVisible] = useState(false);
  const [exitConfirmVisible, setExitConfirmVisible] = useState(false);
  const [heartRefillInfoVisible, setHeartRefillInfoVisible] = useState(false);
  const [loadErrorFeedbackVisible, setLoadErrorFeedbackVisible] = useState(false);
  const [exercisesCompleted, setExercisesCompleted] = useState(0);
  const [progressPct, setProgressPct] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [speakResult, setSpeakResult] = useState<SpeakResult | null>(null);
  const exerciseIndexRef = useRef(0);
  // Submit lock. `submitting` is React state, so it does NOT close this: two
  // taps landing in the same frame both read it as false before the setter
  // has committed, and both fire a formula-attempt for the SAME ex_id. The
  // backend answers a duplicate/stale ex_id by returning its own current
  // exercise as `next_exercise` (process_answer's "ex_id mismatch" branch),
  // so a double tap could hand the client back a card it had already cleared.
  // A ref flips synchronously inside the first tap's handler, so the second
  // tap in the same frame sees it.
  const submitLockRef = useRef(false);
  // Every ex_id this session has already answered. The engine never reuses an
  // ex_id — even a wrong-answer replay in the review phase is minted a fresh
  // one (_build_review_queue: replay["ex_id"] = fx._new_id()) — so an ex_id
  // coming back is always a resync artefact, never real new work. Once the
  // user has cleared a card, it does not come back.
  const answeredExIdsRef = useRef<Set<string>>(new Set());
  const charOrderRef = useRef<number[]>(shuffleIndices(CHARACTERS.length));
  const startedAt = useRef(Date.now());
  // Whole-session clock, separate from startedAt above (which resets every
  // exercise for per-exercise timing) — set once at mount, read once at
  // completion to report total time on LessonSummaryScreen.
  const sessionStartedAtRef = useRef(Date.now());
  const pendingAdvanceFn = useRef<(() => void) | null>(null);
  const ayahDisplayCountRef = useRef(0);
  const totalXpRef = useRef(0); // accumulates xp_awarded across all formulaAttempt calls
  const confettiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mount: reset store, load group, start session
  useEffect(() => {
    let cancelled = false;
    reset();
    (async () => {
      try {
        await loadGroup(groupId);
        if (!cancelled) await startSession();
      } catch { /* error shown via store.error */ }
    })();
    return () => {
      cancelled = true;
      pendingAdvanceFn.current = null;
      stopAudio();
      void stopRecording().catch(() => {});
      if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
    };
  }, [groupId]);


  // Silently skip any exercise type the app doesn't handle yet — user never sees it
  useEffect(() => {
    if (exercise && !HANDLED_EXERCISE_TYPES.has(exercise.type) && !submitting) {
      void submitAnswer(null);
    }
  }, [exercise?.ex_id]);

  // Stop audio and reset playing state immediately when navigating away
  useEffect(() => {
    const unsub = navigation.addListener('blur', () => {
      stopAudio();
      // Also abort any in-flight recording
      void stopRecording().catch(() => {});
    });
    return unsub;
  }, [navigation]);

  // Once session starts, show bismillah intro then seed the first exercise.
  // Guard: storeGroupId must match the nav-param groupId to avoid seeding a
  // stale firstExercise that belongs to the previous lesson (race on first render).
  useEffect(() => {
    if (firstExercise && !exercise && storeGroupId === groupId) {
      setExercise(firstExercise);
      setShowBismillah(true);
      startedAt.current = Date.now();
      setProgressPct(storeProgressPct);
    }
  }, [firstExercise, storeGroupId]);

  const submitAnswer = useCallback(async (
    userAnswer: string | string[] | number[] | null,
    correctOverride?: boolean,
    // Real Deepgram-verified outcome for a speak exercise's one-and-only
    // formula-attempt call (sent after the retry choice resolves, or on
    // Skip) — see backend/app/learning/schemas.py FormulaAttemptIn.
    speakOutcome?: 'passed' | 'failed' | 'skipped',
  ) => {
    if (!sessionId || !exercise || submitting || submitLockRef.current) return;
    submitLockRef.current = true;
    // Every exercise's Check button funnels through here — stop whatever
    // audio is still playing (and its icon/waveform animation, via each
    // component's onPlayingChange subscription) the instant Check is pressed.
    stopAudio();
    setSubmitting(true);
    answeredExIdsRef.current.add(exercise.ex_id);
    const ms = Date.now() - startedAt.current;

    // ── Formula engine flow ──────────────────────────────────────────
    try {
      const result = await learningApi.formulaAttempt(sessionId, {
        ex_id: exercise.ex_id,
        user_answer: userAnswer,
        response_ms: ms,
        ...(speakOutcome ? { speak_result: speakOutcome } : {}),
      });

      // Speak exercises score correctness client-side (via Deepgram speak-attempt,
      // passed in as correctOverride) since formulaAttempt gets no user_answer to grade.
      const effectiveCorrect = correctOverride !== undefined ? correctOverride : result.correct;

      // ayah_display is a listen-along card, not a graded question — no ding
      // for it. A skipped recitation is the same: the user opted out, not a
      // wrong answer, so no buzzer.
      if (exercise.type !== 'ayah_display' && speakOutcome !== 'skipped') {
        playFeedbackSound(effectiveCorrect);
      }

      // remediation_up = reinforcement phase, no hearts lost even on wrong.
      // ayah_display is a listen-along card, not a gradable exercise — never
      // cut a heart for it regardless of what the backend reports, so this
      // doesn't depend on the backend always grading it as correct.
      // A skipped recitation is heart-neutral the same way — every
      // recitation question is skippable with no penalty. Special (merged/
      // review) levels are heart-exempt for their entire duration, not just
      // specific phases within them — hearts aren't even shown there (see
      // LessonHeader's hideHearts below).
      const isNoMistake = exercise.phase === 'mistakes_review' || exercise.phase === 'remediation_up' || exercise.type === 'ayah_display' || speakOutcome === 'skipped' || !!isSpecial;
      const snapCorrect  = correctCount + (effectiveCorrect ? 1 : 0);
      const snapMistakes = mistakes + (!effectiveCorrect && !isNoMistake ? 1 : 0);

      // Track cumulative XP earned across all exercises for the session-end screen
      totalXpRef.current += result.xp_awarded ?? 0;

      // Server-computed, monotonic % of the level's total work done (NOT an
      // accuracy score) — see session_engine.py's _progress_snapshot().
      if (typeof result.progress_pct === 'number') setProgressPct(result.progress_pct);

      if (!effectiveCorrect && !isNoMistake) setMistakes(snapMistakes);
      else if (effectiveCorrect) {
        setCorrectCount(snapCorrect);
        setExercisesCompleted(prev => prev + 1);
        // Confetti: XP awarded on normal questions only (not listen steps, speak exercises, or session end)
        const isSpeakExercise = exercise.type === 'read_ayah_and_speak' || exercise.type === 'read_and_speak';
        if ((result.xp_awarded ?? 0) > 0 && exercise.type !== 'ayah_display' && !isSpeakExercise && !result.done) {
          setShowConfetti(true);
          if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
          confettiTimerRef.current = setTimeout(() => setShowConfetti(false), 1500);
        }
      }

      if (result.segments.length) setSegments(result.segments);

      // Hearts exhausted — end attempt immediately (skip in no-mistake phases)
      if (!effectiveCorrect && !isNoMistake && snapMistakes >= MAX_MISTAKES) {
        submitLockRef.current = false;
        setSubmitting(false);
        setNoHeartsVisible(true);
        return;
      }

      // Capture score snapshot at submit time (state updates are async)
      const totalAnswerable = snapCorrect + snapMistakes;
      const scorePct = totalAnswerable > 0 ? Math.round((snapCorrect / totalAnswerable) * 100) : 100;

      const advanceFn = async () => {
        setFeedback(null);
        if (result.done) {
          try {
            const summary = await completeSession();
            console.warn('[Lesson] completeSession OK. totalXpRef:', totalXpRef.current, 'summary:', JSON.stringify(summary));
            // Merge the fresh streak/XP straight from this response into the
            // shared learning store — refreshLearning() is throttled and
            // nothing else calls it after a lesson, so without this the Map
            // HUD's flame/XP silently stayed stale until the next cold launch.
            // Includes the freeze/repair fields (2026-08-05) for the same
            // reason: a repair on this exact completion should flip the HUD
            // pill back to its active color immediately, not after the next
            // 60s poll or foreground event.
            if (typeof summary.current_streak === 'number') {
              const currentLearning = useAuthStore.getState().learning;
              if (currentLearning) {
                useAuthStore.setState({
                  learning: {
                    ...currentLearning,
                    current_streak: summary.current_streak,
                    xp_total: currentLearning.xp_total + (totalXpRef.current || summary.xp_awarded),
                    // Backend fields not deployed yet fall back to the
                    // previous value rather than clobbering it with undefined.
                    streak_state: summary.streak_state ?? currentLearning.streak_state,
                    freeze_days_remaining: summary.freeze_days_remaining ?? currentLearning.freeze_days_remaining,
                    repair_levels_required: summary.repair_levels_required ?? currentLearning.repair_levels_required,
                    repair_levels_completed: summary.repair_levels_completed ?? currentLearning.repair_levels_completed,
                  },
                });
              }
            }
            navigation.replace('LessonComplete', {
              xp: totalXpRef.current || summary.xp_awarded,
              scorePct,
              stars: starsFromAccuracy(scorePct),
              durationSec: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
              // Backend fields not deployed yet fall back safely to "no
              // celebration" rather than crashing on an undefined summary field.
              streakIncremented: summary.streak_incremented ?? false,
              currentStreak: summary.current_streak,
              streakRepaired: summary.streak_repaired ?? false,
              streakState: summary.streak_state,
              repairLevelsCompleted: summary.repair_levels_completed,
              repairLevelsRequired: summary.repair_levels_required,
            });
          } catch (e) {
            console.warn('[Lesson] completeSession FAILED. totalXpRef:', totalXpRef.current, 'error:', e);
            navigation.replace('LessonComplete', {
              xp: totalXpRef.current || 20, scorePct,
              stars: starsFromAccuracy(scorePct),
              durationSec: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
            });
          }
        } else if (result.next_exercise) {
          const next = result.next_exercise;
          // Never go back to a card the user has already cleared. The backend
          // hands back its OWN current exercise as `next_exercise` whenever it
          // receives a stale or duplicate ex_id (process_answer's "ex_id
          // mismatch" resync branch) — so this field is not always forward
          // progress, and mounting it blind is how an already-answered ayah
          // could reappear. The engine never reuses an ex_id (review replays
          // are minted fresh ones), so "already in the answered set" always
          // means echo, never new work. Ignoring it leaves the current card
          // up rather than rewinding; nothing deadlocks, since the user can
          // still answer that card and the server will move on.
          if (answeredExIdsRef.current.has(next.ex_id)) {
            console.warn('[Lesson] ignoring resync echo of an already-answered exercise:', next.ex_id);
          } else {
            exerciseIndexRef.current += 1;  // advance character only when moving to next exercise
            setExercise(next);
            startedAt.current = Date.now();
          }
        }
        submitLockRef.current = false;
      };

      // Speak exercises handle their own result UI internally; advance
      // immediately after formulaAttempt(null) without showing FeedbackBanner.
      // ayah_display also advances immediately (no feedback).
      const immediateAdvance =
        exercise.type === 'ayah_display' ||
        exercise.type === 'read_ayah_and_speak' ||
        exercise.type === 'read_and_speak';

      if (immediateAdvance) {
        void advanceFn();
        setSubmitting(false);
      } else {
        // Show feedback banner; user presses Continue / GOT IT to advance
        pendingAdvanceFn.current = advanceFn;
        setFeedback(result);
        setSubmitting(false);
      }
    } catch (e: any) {
      // Defensive reset, not an active retry path: every branch below ends by
      // abandoning the session and navigating away, so in normal operation
      // nothing ever re-renders this card unlocked. This exists purely so
      // that IF abandonSession/navigation ever fails to actually leave the
      // screen, the Check button and this ex_id aren't left permanently
      // locked (that dead-end — Check re-enabled, no feedback, no way
      // forward but force-closing the app — is exactly what the branches
      // below were added to stop; see their own comments).
      //
      // If some future path *does* resubmit this ex_id (a session resume
      // after the original request actually reached and was graded by the
      // server, e.g. a cold start slow enough that the client timed out
      // first), that's safe: the backend's process_answer() replays the
      // original grading for a repeat ex_id instead of re-grading or failing
      // it (see backend CHANGES.md, 2026-08-31).
      submitLockRef.current = false;
      answeredExIdsRef.current.delete(exercise.ex_id);
      setSubmitting(false);
      if (e?.status === 404 || e?.status === 400) {
        navigation.replace('LessonComplete', {
          xp: 0, scorePct: 0, stars: 1,
        });
      } else if (e?.status === 0) {
        // status 0 = fetch never got an HTTP response (client.ts) — no signal,
        // DNS/TLS failure, or our own 30s timeout. Answer was never scored, so
        // there's no partial progress to protect; bail out to the home screen
        // rather than leaving the exercise frozen on a submit that'll never resolve.
        Alert.alert(
          'Connection lost',
          'You lost connection. Please check your internet and try again.',
          [{ text: 'OK', onPress: () => {
            abandonSession({ silent: true }).catch(() => {});
            navigation.navigate('MainTabs');
          } }],
        );
      } else {
        // Everything else — 500, 502, 422, 403, a rate limit, a refresh that
        // could not be recovered. Previously this branch did not exist, so the
        // Check button simply re-enabled and nothing else happened: the user
        // tapped, saw no feedback, tapped again, and had no way forward except
        // force-closing the app. It also never reached Crashlytics, so the
        // failure was invisible in production too. Report it, then let the user
        // out the same way the no-connection branch does.
        captureError(e, {
          where: 'submitAnswer',
          status: e?.status ?? 'unknown',
          ex_id: exercise.ex_id,
          exercise_type: exercise.type,
        });
        Alert.alert(
          'Something went wrong',
          'We could not save that answer. Please try again in a moment.',
          [{ text: 'OK', onPress: () => {
            abandonSession({ silent: true }).catch(() => {});
            navigation.navigate('MainTabs');
          } }],
        );
      }
    }
  }, [sessionId, exercise, submitting, correctCount, mistakes, isSpecial]);

  const handleBack = () => {
    abandonSession({ silent: true }).catch(() => {});
    navigation.goBack();
  };

  // Hardware back during a live exercise must ask before throwing progress
  // away, exactly like the X button does — not silently pop the screen (the
  // previous default) or land on some other screen entirely. While the
  // exit-confirm Modal is already open, Android routes the back press to its
  // own onRequestClose directly (RN Modals capture hardware back at the
  // native window level ahead of any BackHandler listener), so this only
  // fires for that case when it's not yet open.
  //
  // The no-hearts overlay is a plain absolutely-positioned View, not a
  // Modal — it doesn't get that native interception, and today it has no
  // leave affordance at all (Buy Hearts is a coming-soon no-op, Retry starts
  // the level over). Back is the only way out of it, so it skips the confirm
  // (there's no fresh progress left to protect at that point) and leaves
  // straight away.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (noHeartsVisible) {
        setNoHeartsVisible(false);
        handleBack();
        return true;
      }
      setExitConfirmVisible(true);
      return true;
    });
    return () => sub.remove();
  }, [noHeartsVisible]);

  // ── Error state ──────────────────────────────────────────────────
  if (error && !loading) {
    return (
      <View style={[S.center, { paddingTop: insets.top }]}>
        <LottieView
        renderMode="SOFTWARE"
          source={require('../../../assets/animations/404.json')}
          autoPlay loop
          style={{ width: 200, height: 200 }}
        />
        <Text style={S.errorTitle}>Couldn't load the lesson</Text>
        <Text style={S.errorMsg}>{error}</Text>
        <TouchableOpacity style={S.retryBtn} onPress={() => {
          reset();
          loadGroup(groupId).then(() => startSession()).catch(() => {});
        }}>
          <Text style={S.retryBtnText}>Try again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
          <Text style={{ color: colors.mutedText, fontFamily: 'Nunito_400Regular' }}>Go back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setLoadErrorFeedbackVisible(true)} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.primary, fontFamily: 'Nunito_700Bold', fontSize: 13 }}>Give feedback</Text>
        </TouchableOpacity>
        <LumoInfoModal
          visible={loadErrorFeedbackVisible}
          onClose={() => setLoadErrorFeedbackVisible(false)}
          title="Still stuck?"
          message="Email us and we'll sort it out."
          contactEmail="helo.ustadapp@gmail.com"
        />
      </View>
    );
  }

  // ── Not ready: session loaded but backend has no exercises yet ───
  if (!loading && !error && !firstExercise && !exercise) {
    return (
      <View style={[S.center, { paddingTop: insets.top }]}>
        <LottieView
        renderMode="SOFTWARE"
          source={require('../../../assets/animations/loading.json')}
          autoPlay loop
          style={{ width: 140, height: 140 }}
        />
        <Text style={S.errorTitle}>Creating your custom environment</Text>
        <LoadingStatusText
          style={S.errorMsg}
          messages={['Your exercises are being prepared…', 'This usually takes a moment…', 'Almost ready…']}
        />
        <TouchableOpacity style={S.retryBtn} onPress={() => {
          reset();
          loadGroup(groupId).then(() => startSession()).catch(() => {});
        }}>
          <Text style={S.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { abandonSession({ silent: true }).catch(() => {}); navigation.goBack(); }}
          style={{ marginTop: 12 }}
        >
          <Text style={{ color: colors.mutedText, fontFamily: 'Nunito_400Regular' }}>Back to Map</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Bismillah intro ──────────────────────────────────────────────
  if (showBismillah && exercise) {
    return (
      <BismillahIntro
        surahName={surahName}
        surahNumber={surahNumber}
        insetTop={insets.top}
        onBegin={() => {
          setShowBismillah(false);
          startedAt.current = Date.now();
        }}
      />
    );
  }

  // ── Loading state — same Lottie + copy as the "not ready" state above,
  // unified so the user never sees two different-sounding loading messages
  // back to back for what's effectively the same wait. Back button kept as
  // a safety net in case a load ever hangs; no retry button here (unlike the
  // "not ready" state) since this one resolves on its own once the fetch
  // completes. ──
  if (!exercise || loading) {
    return (
      <View style={S.center}>
        <TouchableOpacity
          style={[LL.backBtn, { top: insets.top + 10 }]}
          onPress={() => { abandonSession({ silent: true }).catch(() => {}); navigation.goBack(); }}
        >
          <Image source={require('../../../assets/back_arrow.png')} style={LL.backArrowIcon} resizeMode="contain" />
          <Text style={LL.backText}>Map</Text>
        </TouchableOpacity>
        <LottieView
          renderMode="SOFTWARE"
          source={require('../../../assets/animations/loading.json')}
          autoPlay loop
          style={{ width: 140, height: 140 }}
        />
        <Text style={S.errorTitle}>Creating your custom environment</Text>
        <LoadingStatusText style={S.errorMsg} />
      </View>
    );
  }

  // ── Exercise header ──────────────────────────────────────────────
  // Bar is a server-computed, monotonic % of the level's total work done —
  // NOT an accuracy/score value. It only ever moves forward (a mistake adds
  // remediation work but holds the bar rather than dipping it) and hits 100%
  // only when the session is done. See session_engine.py's _progress_snapshot().
  const progressFraction = Math.min(Math.max(progressPct / 100, 0), 1);
  const character = characterForIndex(charOrderRef.current, exerciseIndexRef.current);

  return (
    <View style={[S.screen, { paddingTop: insets.top }]}>
      {/* Top bar: X + progress bar + 5 hearts + Hint */}
      {(() => {
        const hintAyah = group?.ayahs.find(a => a.ayah_number === exercise.ayah_no);
        const showHint = exercise.type !== 'ayah_display' && exercise.type !== 'hear_and_select' && exercise.type !== 'sequence';
        return (
          <LessonHeader
            mistakes={mistakes}
            progressFraction={progressFraction}
            hintUrl={showHint ? exercise.ayah_audio_url : null}
            hintAyahAr={showHint ? (exercise.ayah_ar ?? hintAyah?.arabic ?? null) : null}
            hintAyahTranslation={showHint ? (exercise.ayah_translation ?? hintAyah?.translation_en ?? null) : null}
            onExit={() => setExitConfirmVisible(true)}
            hideHearts={isSpecial}
          />
        );
      })()}

      {/* Exercise content.
          paddingBottom here, not just on each exercise's own ScrollView
          contentContainerStyle — that inner padding only creates real
          on-screen clearance once the user actually scrolls past the last
          element; when an exercise's content is short enough to fit without
          scrolling (a 4-option grid, say), the ScrollView never scrolls and
          the Check button lands wherever the plain top-down content flow
          puts it — right at this View's own bottom edge, which without this
          reaches the true physical bottom of the screen because S.screen
          only reserves insets.top, not insets.bottom. Shrinking the
          ScrollView's own viewport here is what actually guarantees
          clearance regardless of whether that exercise's content scrolls. */}
      <View style={[S.exerciseArea, { paddingBottom: insets.bottom }]}>
       <ExerciseSlide key={exercise.ex_id}>
        {exercise.type === 'ayah_display' && (
          <AyahDisplay
            key={exercise.ex_id}
            ex={exercise}
            surahName={surahName}
            transliteration={group?.ayahs.find(a => a.ayah_number === exercise.ayah_no)?.transliteration ?? null}
            showLumo={ayahDisplayCountRef.current < 3}
            onContinue={() => {
              stopAudio();
              ayahDisplayCountRef.current += 1;
              submitAnswer(null);
            }}
          />
        )}
        {(exercise.type === 'fill_blank' || exercise.type === 'next_word') && (
          <FillBlankOrNextWord
            key={exercise.ex_id}
            ex={exercise}
            surahName={surahName}
            character={character}
            locked={!!feedback}
            onSubmit={submitAnswer}
          />
        )}
        {exercise.type === 'reorder' && (
          <ReorderOrSequence key={exercise.ex_id} ex={exercise} surahName={surahName} character={character} locked={!!feedback} onSubmit={submitAnswer} />
        )}
        {exercise.type === 'sequence' && (
          <SequenceExercise key={exercise.ex_id} ex={exercise} surahName={surahName} character={character} locked={!!feedback} onSubmit={submitAnswer} />
        )}
        {exercise.type === 'segment_recall' && (
          <SegmentRecall
            key={exercise.ex_id}
            ex={exercise}
            surahName={surahName}
            character={character}
            locked={!!feedback}
            onSubmit={submitAnswer}
          />
        )}
        {exercise.type === 'hear_and_select' && (
          <HearAndSelect
            key={exercise.ex_id}
            ex={exercise}
            surahName={surahName}
            character={character}
            locked={!!feedback}
            onSubmit={submitAnswer}
          />
        )}
        {exercise.type === 'audio_fill' && (
          <AudioFill
            key={exercise.ex_id}
            ex={exercise}
            surahName={surahName}
            character={character}
            locked={!!feedback}
            onSubmit={submitAnswer}
          />
        )}
        {exercise.type === 'ayat_then_order' && (
          <AyatThenOrder
            key={exercise.ex_id}
            ex={exercise}
            surahName={surahName}
            character={character}
            locked={!!feedback}
            onSubmit={submitAnswer}
          />
        )}
        {exercise.type === 'read_ayah_and_speak' && (
          <ReadAyahAndSpeak
            key={exercise.ex_id}
            ex={exercise}
            surahName={surahName}
            character={character}
            onSpeakScored={setSpeakResult}
            onFinalize={(result) => { void submitAnswer(null, result.passed, result.passed ? 'passed' : 'failed'); }}
            onSkip={() => { void submitAnswer(null, false, 'skipped'); }}
          />
        )}
        {exercise.type === 'read_and_speak' && (
          <ReadAndSpeak
            key={exercise.ex_id}
            ex={exercise}
            surahName={surahName}
            character={character}
            onSpeakScored={setSpeakResult}
            onFinalize={(result) => { void submitAnswer(null, result.passed, result.passed ? 'passed' : 'failed'); }}
            onSkip={() => { void submitAnswer(null, false, 'skipped'); }}
          />
        )}
       </ExerciseSlide>
      </View>

      {/* Submitting spinner */}
      {submitting && !feedback && (
        <View style={S.spinnerOverlay}>
          <SubmittingSpinner />
        </View>
      )}

      {/* Speak result bottom sheet — shown after the FINAL speak attempt
          scores (a pass, a declined retry, or the retry itself). Continue
          calls submitAnswer(null, passed, 'passed'|'failed') so a failed
          recitation costs a heart just like any other wrong answer. A wrong
          FIRST attempt never reaches here — see each exercise component's
          own retry-choice state, which resolves down to this same call. */}
      {speakResult && !feedback && (
        <SpeakResultBanner
          result={speakResult}
          onAdvance={() => {
            const passed = speakResult.passed;
            setSpeakResult(null);
            void submitAnswer(null, passed, passed ? 'passed' : 'failed');
          }}
        />
      )}

      {/* Standard feedback bottom sheet */}
      {feedback && (
        <FeedbackBanner
          result={feedback}
          onAdvance={() => { void pendingAdvanceFn.current?.(); }}
        />
      )}

      {/* Confetti on correct answer */}
      {showConfetti && (
        <View style={S.confettiOverlay} pointerEvents="none">
          <LottieView
        renderMode="SOFTWARE"
            source={require('../../../assets/animations/celebration.json')}
            autoPlay
            loop={false}
            style={S.confettiAnim}
          />
        </View>
      )}

      {/* No Hearts modal */}
      {noHeartsVisible && (
        <View style={S.noHeartsOverlay}>
          <View style={S.noHeartsCard}>
            <View style={{ width: 120, height: 120, marginBottom: 8 }}>
              <Image
                source={require('../../../assets/images/lumo_cry.png')}
                style={[S.noHeartsLumo, { marginBottom: 0 }]}
                resizeMode="contain"
              />
              <MascotShadow width={120} />
            </View>
            <Text style={S.noHeartsTitle}>Out of Hearts!</Text>
            <Text style={S.noHeartsBody}>
              You've run out of hearts for this attempt.{'\n'}Take a breath and try again!
            </Text>
            <TouchableOpacity
              style={S.buyHeartsBtn}
              onPress={() => setHeartRefillInfoVisible(true)}
            >
              <Text style={S.buyHeartsBtnText}>💎  Buy Hearts</Text>
              <Text style={S.buyHeartsSubText}>Coming Soon</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={S.noHeartsRetryBtn}
              onPress={() => {
                setNoHeartsVisible(false);
                abandonSession({ silent: true }).catch(() => {});
                navigation.replace('LessonSession', { groupId, surahName, surahNumber });
              }}
            >
              <Text style={S.noHeartsRetryText}>↩  Retry Level</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Exit-level confirmation */}
      <Modal
        transparent
        animationType="fade"
        visible={exitConfirmVisible}
        onRequestClose={() => setExitConfirmVisible(false)}
      >
        <View style={S.noHeartsOverlay}>
          <View style={S.noHeartsCard}>
            <View style={{ width: 90, height: 90, marginBottom: 8 }}>
              <Image
                source={require('../../../assets/images/lumo_kufi.png')}
                style={[S.exitConfirmLumo, { marginBottom: 0 }]}
                resizeMode="contain"
              />
              <MascotShadow width={90} />
            </View>
            <Text style={S.noHeartsTitle}>Leave the lesson?</Text>
            <Text style={S.noHeartsBody}>
              Your progress this level won't be saved, you'll start fresh next time.
            </Text>
            {/* Order swapped 2026-08-28 (user: "stay on right, leave on
                left") — same two buttons, same styles/handlers, JSX order is
                what determines left-to-right position in this row. */}
            <View style={S.exitConfirmBtnRow}>
              <TouchableOpacity
                style={S.exitConfirmLeaveBtn}
                onPress={() => {
                  setExitConfirmVisible(false);
                  handleBack();
                }}
              >
                <Text style={S.exitConfirmLeaveText}>Yes, leave</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={S.exitConfirmCancelBtn}
                onPress={() => setExitConfirmVisible(false)}
              >
                <Text style={S.exitConfirmCancelText}>Keep practicing</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <LumoInfoModal
        visible={heartRefillInfoVisible}
        onClose={() => setHeartRefillInfoVisible(false)}
        title="Coming soon!"
        message="Heart refills will be available soon. Stay tuned!"
      />

      {/* Wave animation — shows exactly while system audio is audibly
          playing (see audioPlayer.ts's onPlayingChange), gone the instant
          it's paused or stopped. Suppressed during recitation exercises —
          the green SegmentPlayBtn waveform in SpeakResultBanner already
          gives audio feedback there, so this bar is redundant/distracting.
          Also suppressed for audio_fill — each option's playCircle already
          shows its own play/pause state, same reasoning. Also suppressed for
          hear_and_select (2026-08-28, user: "not needed") — its own big
          speaker button already swaps to a pause icon + "Playing…" label
          while audio plays, so this bar was a second, redundant indicator for
          the exact same state. */}
      {systemPlaying && exercise?.type !== 'read_ayah_and_speak' && exercise?.type !== 'read_and_speak' && exercise?.type !== 'audio_fill' && exercise?.type !== 'hear_and_select' && (
        <View pointerEvents="none" style={[S.waveBar, { bottom: insets.bottom + 8 }]}>
          <LottieView
            renderMode="SOFTWARE"
            source={require('../../../assets/animations/wave.json')}
            autoPlay loop
            style={S.waveLottie}
          />
        </View>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.lightBg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lightBg, padding: 28 },
  // Header styles now live with LessonHeader (see LH above), which both this
  // screen and the guided tour render.
  exerciseArea: { flex: 1 },
  spinnerOverlay:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(242,244,248,0.6)' },
  confettiOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  confettiAnim:    { width: '100%', height: 320 },
  errorTitle: { fontFamily: 'Nunito_700Bold', fontSize: 18, color: colors.darkText, marginBottom: 8, textAlign: 'center' },
  errorMsg: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.mutedText, textAlign: 'center', marginBottom: 24 },
  retryBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 },
  retryBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: 'white' },
  // No-hearts overlay
  noHeartsOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', zIndex: 100, paddingHorizontal: 28 },
  noHeartsCard: { backgroundColor: 'white', borderRadius: 28, padding: 28, alignItems: 'center', width: '100%', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 20 },
  noHeartsTitle: { fontFamily: 'Nunito_700Bold', fontSize: 26, color: colors.darkText, marginBottom: 10 },
  noHeartsBody: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: colors.midText, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  buyHeartsBtn: { width: '100%', backgroundColor: '#F0F4FF', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 12, borderWidth: 1.5, borderColor: '#C7D2FE' },
  buyHeartsBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: '#4338CA' },
  buyHeartsSubText: { fontFamily: 'Nunito_400Regular', fontSize: 11, color: '#818CF8', marginTop: 2 },
  noHeartsRetryBtn: { width: '100%', backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  noHeartsRetryText: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: 'white' },
  noHeartsLumo: { width: 120, height: 120, marginBottom: 8 },
  // Exit-level confirmation
  exitConfirmLumo: { width: 90, height: 90, marginBottom: 8 },
  exitConfirmBtnRow: { flexDirection: 'row', gap: 10, width: '100%' },
  // Staying is the green, filled, "default-looking" button and leaving is
  // the plain/colorless one — deliberately inverted from the usual
  // cancel/destructive convention so an impulsive or accidental tap keeps
  // the user on the level instead of throwing progress away.
  exitConfirmCancelBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  exitConfirmCancelText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: 'white' },
  exitConfirmLeaveBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  exitConfirmLeaveText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.midText },
  waveBar: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  waveLottie: { width: 220, height: 60 },
});

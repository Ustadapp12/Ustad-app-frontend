import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, ActivityIndicator, Platform, Modal, Alert, Image, Pressable,
  type ImageSourcePropType,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { useLessonStore } from '../../store/lessonStore';
import { useAuthStore } from '../../store/authStore';
import { learningApi, progressApi } from '../../api';
import { useArabicFont, arabicTextStyle } from '../../utils/arabicFont';
import { colors } from '../../theme/colors';
import type { ExerciseDict, FormulaAttemptOut, SegmentStatus } from '../../types/api';
import type { RootNavProp } from '../../navigation/types';


// ── Audio helper ───────────────────────────────────────────────────

let _sound: Audio.Sound | null = null;
let _audioReady = false;
let _playGeneration = 0;

// Pre-loaded sounds keyed by URL — populated by preloadAudioUrls() so that
// tapping an option in audio_fill plays instantly instead of waiting for a
// network fetch + decode on every tap.
const _preloadCache = new Map<string, Audio.Sound>();

// Load a set of URLs into the cache in the background (fire-and-forget).
async function preloadAudioUrls(urls: string[]): Promise<void> {
  await ensureAudioReady();
  await Promise.all(
    urls
      .filter(url => url && !_preloadCache.has(url))
      .map(async url => {
        try {
          const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: false });
          _preloadCache.set(url, sound);
        } catch {}
      }),
  );
}

// Release cached sounds for a set of URLs (call on exercise unmount).
function evictPreloadedUrls(urls: string[]): void {
  for (const url of urls) {
    const s = _preloadCache.get(url);
    if (s) { _preloadCache.delete(url); void s.unloadAsync().catch(() => {}); }
  }
}

async function ensureAudioReady() {
  if (_audioReady) return;
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    staysActiveInBackground: false,
    playsInSilentModeIOS: true,   // plays even when the iOS silent switch is on
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
  _audioReady = true;
}

async function playUrl(url: string | null | undefined, onDone?: () => void) {
  if (!url) return;
  const myGen = ++_playGeneration;
  try {
    await ensureAudioReady();
    if (_sound) {
      await _sound.stopAsync().catch(() => {});
      await _sound.unloadAsync().catch(() => {});
      _sound = null;
    }
    if (myGen !== _playGeneration) return; // newer tap superseded this one

    // Use preloaded sound if available (instant), otherwise fetch from network
    let sound: Audio.Sound;
    const cached = _preloadCache.get(url);
    if (cached) {
      _preloadCache.delete(url); // take ownership — now managed as _sound
      await cached.setPositionAsync(0).catch(() => {}); // rewind in case replayed
      sound = cached;
    } else {
      ({ sound } = await Audio.Sound.createAsync({ uri: url }));
    }

    if (myGen !== _playGeneration) { void sound.unloadAsync().catch(() => {}); return; }
    _sound = sound;
    sound.setOnPlaybackStatusUpdate(status => {
      if (status.isLoaded && status.didJustFinish) {
        notifySystemPlaying(false); // audio finished — hide WaveBar
        onDone?.();
      }
    });
    notifySystemPlaying(true); // audio starting — show WaveBar
    await sound.playAsync();
  } catch (e) {
    console.warn('[audio] playUrl failed:', e);
    notifySystemPlaying(false);
    onDone?.(); // unblock any waiting sequence
  }
}

// Play a list of URLs one after another (for segment_audio_urls)
async function playUrlSequence(urls: string[], onDone?: () => void) {
  for (const url of urls) {
    await new Promise<void>(resolve => { void playUrl(url, resolve); });
  }
  onDone?.();
}

// Pre-loads all audio files concurrently then plays them back-to-back with
// the smallest possible gap — used for the "Hear" button in read_and_speak.
async function playUrlSequenceFast(urls: string[], onDone?: () => void) {
  if (!urls.length) { onDone?.(); return; }
  const myGen = ++_playGeneration;
  try {
    await ensureAudioReady();
    // Load all sounds in parallel so there's no per-track fetch delay
    const loaded = await Promise.all(urls.map(url => Audio.Sound.createAsync({ uri: url })));
    if (myGen !== _playGeneration) {
      loaded.forEach(({ sound }) => void sound.unloadAsync().catch(() => {}));
      return;
    }
    notifySystemPlaying(true);
    for (const { sound } of loaded) {
      if (myGen !== _playGeneration) { void sound.unloadAsync().catch(() => {}); continue; }
      if (_sound) { await _sound.stopAsync().catch(() => {}); await _sound.unloadAsync().catch(() => {}); }
      _sound = sound;
      await new Promise<void>(resolve => {
        sound.setOnPlaybackStatusUpdate(status => {
          if (status.isLoaded && status.didJustFinish) resolve();
        });
        void sound.playAsync();
      });
    }
    notifySystemPlaying(false);
    onDone?.();
  } catch (e) {
    console.warn('[audio] playUrlSequenceFast failed:', e);
    notifySystemPlaying(false);
    onDone?.();
  }
}

async function pauseCurrentAudio() {
  if (!_sound) return;
  try {
    const s = await _sound.getStatusAsync();
    if (s.isLoaded && s.isPlaying) {
      await _sound.pauseAsync();
      notifySystemPlaying(false); // paused — hide WaveBar
    }
  } catch {}
}

async function resumeCurrentAudio() {
  if (!_sound) return;
  try {
    const s = await _sound.getStatusAsync();
    if (s.isLoaded && !s.isPlaying) {
      await _sound.playAsync();
      notifySystemPlaying(true);
    }
  } catch {}
}

// ── System audio playing state ─────────────────────────────────────
// Components subscribe via useSystemAudioPlaying() to drive the WaveBar
// that appears at the bottom of the exercise card whenever the app speaks.

type AudioPlayListener = (playing: boolean) => void;
const _audioPlayListeners = new Set<AudioPlayListener>();
let _isAudioPlaying = false;

function notifySystemPlaying(playing: boolean) {
  if (_isAudioPlaying === playing) return; // no-op if state unchanged
  _isAudioPlaying = playing;
  _audioPlayListeners.forEach(cb => cb(playing));
}

/** React hook — returns true while any system audio is actively playing. */
function useSystemAudioPlaying(): boolean {
  const [playing, setPlaying] = useState(_isAudioPlaying);
  useEffect(() => {
    _audioPlayListeners.add(setPlaying);
    return () => { _audioPlayListeners.delete(setPlaying); };
  }, []);
  return playing;
}

// ── Audio recording helpers (speak exercises) ──────────────────────

let _recording: Audio.Recording | null = null;

/** Switch audio session to recording mode (iOS requires this). */
async function enableRecordingMode(): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    staysActiveInBackground: false,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
  _audioReady = false; // flag stale — will re-init when switching back to playback
}

/** Switch back to playback-only mode after recording finishes. */
async function enablePlaybackMode(): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    staysActiveInBackground: false,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
  _audioReady = true;
}

/** Request microphone permission. Returns true if the user grants it. */
async function requestMicPermission(): Promise<boolean> {
  const { status } = await Audio.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Start recording. Stops any currently playing audio first so playback
 * and recording don't conflict (especially on iOS).
 */
async function startRecording(): Promise<void> {
  if (_sound) {
    await _sound.stopAsync().catch(() => {});
    await _sound.unloadAsync().catch(() => {});
    _sound = null;
    notifySystemPlaying(false);
  }
  await enableRecordingMode();
  const { recording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY,
  );
  _recording = recording;
}

/**
 * Stop the active recording and return its local file URI.
 * Returns null if nothing was being recorded or if an error occurred.
 */
async function stopRecording(): Promise<string | null> {
  if (!_recording) return null;
  try {
    await _recording.stopAndUnloadAsync();
    const uri = _recording.getURI();
    _recording = null;
    await enablePlaybackMode();
    return uri ?? null;
  } catch (e) {
    console.warn('[recording] stopRecording error:', e);
    _recording = null;
    await enablePlaybackMode().catch(() => {});
    return null;
  }
}

function PlayPauseBtn({
  url, urls, label = 'Listen', darkMode = false,
}: { url?: string | null; urls?: string[] | null; label?: string; darkMode?: boolean }) {
  const [state, setState] = useState<'idle' | 'playing' | 'paused'>('idle');
  const mountedRef = useRef(true);

  // Normalise: prefer single url, fall back to playing urls in sequence
  const hasAudio = !!(url || urls?.length);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => { setState('idle'); }, [url]);

  const handlePress = async () => {
    if (state === 'idle') {
      if (url) {
        await playUrl(url, () => { if (mountedRef.current) setState('idle'); });
      } else if (urls?.length) {
        void playUrlSequence(urls, () => { if (mountedRef.current) setState('idle'); });
      }
      if (mountedRef.current) setState('playing');
    } else if (state === 'playing') {
      await pauseCurrentAudio();
      if (mountedRef.current) setState('paused');
    } else {
      await resumeCurrentAudio();
      if (mountedRef.current) setState('playing');
    }
  };

  const icon = state === 'playing' ? '⏸' : '▶';
  const btnLabel = state === 'playing' ? 'Pause' : state === 'paused' ? 'Resume' : label;

  if (!hasAudio) return null;
  return (
    <TouchableOpacity
      style={[PP.btn, darkMode && PP.btnDark]}
      onPress={handlePress}
    >
      <Text style={[PP.icon, darkMode && PP.iconDark]}>{icon}</Text>
      <Text style={[PP.text, darkMode && PP.textDark]}>{`  ${btnLabel}`}</Text>
    </TouchableOpacity>
  );
}

const PP = StyleSheet.create({
  btn:     { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(42,125,79,0.12)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'center', marginBottom: 14 },
  btnDark: { backgroundColor: 'rgba(224,188,78,0.15)' },
  icon:    { fontSize: 14, color: colors.primary },
  iconDark:{ color: '#E0BC4E' },
  text:    { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.primary },
  textDark:{ color: '#E0BC4E' },
});

// ── WaveBar — full-width animation at the bottom of the exercise card ──
// Appears whenever the app is playing audio (system speaking).
// Self-manages visibility via useSystemAudioPlaying().

function WaveBar() {
  const isPlaying = useSystemAudioPlaying();
  if (!isPlaying) return null;
  return (
    <View style={WAV.bar} pointerEvents="none">
      <LottieView
        source={require('../../../assets/animations/wave.json')}
        autoPlay
        loop
        style={WAV.anim}
      />
    </View>
  );
}

const WAV = StyleSheet.create({
  // Raised 64 px above the bottom of the exerciseArea so it sits above the
  // home indicator / gesture bar and doesn't hug the very edge of the screen.
  bar:  { position: 'absolute', bottom: 64, left: 0, right: 0, height: 44, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  anim: { width: '100%', height: 64 },
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
function HintButton({
  url, ayahAr, ayahTranslation,
}: { url?: string | null; ayahAr?: string | null; ayahTranslation?: string | null }) {
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
      await pauseCurrentAudio();
      if (mountedRef.current) setPlaying(false);
    } else {
      await playUrl(url, () => { if (mountedRef.current) setPlaying(false); });
      if (mountedRef.current) setPlaying(true);
    }
  };

  if (!url) return null;

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
            <Image
              source={require('../../../assets/images/lumo_hint.png')}
              style={HB.lumo}
              resizeMode="contain"
            />
            <Text style={HB.modalTitle}>Hint</Text>

            {ayahAr ? (
              <View style={HB.ayahBox}>
                {/* Strip Bismillah so only the actual ayah with ۝ is shown */}
                <AyahText text={stripBismillahPrefix(ayahAr)} style={HB.ayahAr} />
                {ayahTranslation ? (
                  <Text style={HB.ayahTrans}>"{ayahTranslation}"</Text>
                ) : null}
              </View>
            ) : null}

            {/* Play / Pause button */}
            <TouchableOpacity
              style={[HB.playBtn, playing && HB.playBtnActive]}
              onPress={handlePlayPause}
            >
              {playing ? (
                <View style={HB.pauseRow}>
                  <View style={HB.pauseBar} />
                  <View style={HB.pauseBar} />
                  <Text style={HB.playText}>  Pause</Text>
                </View>
              ) : (
                <Text style={HB.playText}>▶  Hear the Ayah</Text>
              )}
            </TouchableOpacity>

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
  pauseBar:     { width: 4, height: 16, backgroundColor: 'white', borderRadius: 2 },
  cancelBtn:    { width: '100%', borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  cancelText:   { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.midText },
});

// ── Character rotation ────────────────────────────────────────────
interface Character { src: ImageSourcePropType; name: string }
const CHARACTERS: Character[] = [
  { src: require('../../../assets/characters/ayesha.png'),   name: 'Ayesha' },
  { src: require('../../../assets/characters/farah.png'),    name: 'Farah' },
  { src: require('../../../assets/characters/fatima.png'),   name: 'Fatima' },
  { src: require('../../../assets/characters/hamza.png'),    name: 'Hamza' },
  { src: require('../../../assets/characters/muhammad.png'), name: 'Muhammad' },
  { src: require('../../../assets/characters/umar.png'),     name: 'Umar' },
  { src: require('../../../assets/characters/waleed.png'),   name: 'Waleed' },
];
function shuffleIndices(len: number): number[] {
  const arr = Array.from({ length: len }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function characterForIndex(shuffled: number[], idx: number): Character {
  return CHARACTERS[shuffled[idx % shuffled.length]];
}

// ── Luma loading state ─────────────────────────────────────────────

function LumaLoading({ message, insetTop, onBack }: { message: string; insetTop: number; onBack?: () => void }) {
  return (
    <View style={[LL.container, { paddingTop: insetTop }]}>
      {onBack && (
        <TouchableOpacity style={[LL.backBtn, { top: insetTop + 10 }]} onPress={onBack}>
          <Text style={LL.backText}>←  Map</Text>
        </TouchableOpacity>
      )}
      <LottieView
        source={require('../../../assets/animations/loading.json')}
        autoPlay loop
        style={LL.lottie}
      />
      <View style={LL.bubble}><Text style={LL.bubbleText}>{message}</Text></View>
    </View>
  );
}

const LL = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightBg, alignItems: 'center', justifyContent: 'center' },
  lottie: { width: 180, height: 180 },
  bubble: { backgroundColor: 'white', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 12, marginTop: 16, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3, maxWidth: '88%' },
  bubbleText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: colors.darkText, textAlign: 'center' },
  backBtn: { position: 'absolute', left: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  backText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.midText },
});

// ── Segment play button with waveform signal ─────────────────────
// url: the full segment / ayah audio (NOT word-by-word)

const BAR_HEIGHTS = [7, 13, 20, 13, 7]; // waveform bar heights in px

function SegmentPlayBtn({ url }: { url?: string | null }) {
  const [playing, setPlaying] = useState(false);
  const mountedRef = useRef(true);
  const pulseAnims = useRef(BAR_HEIGHTS.map(() => new Animated.Value(1))).current;

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => { setPlaying(false); }, [url]);

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
    if (!url) return;
    if (playing) {
      await pauseCurrentAudio();
      if (mountedRef.current) setPlaying(false);
    } else {
      await playUrl(url, () => { if (mountedRef.current) setPlaying(false); });
      if (mountedRef.current) setPlaying(true);
    }
  };

  return (
    <TouchableOpacity style={SPB.row} onPress={handle} disabled={!url}>
      <View style={[SPB.btn, !url && { opacity: 0.4 }]}>
        <Text style={SPB.icon}>{playing ? '⏸' : '▶'}</Text>
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
  icon:     { fontSize: 11, color: 'white' },
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
    Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
      Animated.timing(floatAnim, { toValue: 0, duration: 1600, useNativeDriver: true }),
    ])).start();
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

function ProgressBar({ fraction }: { fraction: number }) {
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

const PBR = StyleSheet.create({
  track: { flex: 1, height: 10, backgroundColor: '#E5E7EB', borderRadius: 6, overflow: 'hidden', marginHorizontal: 10 },
  fill:  { height: '100%', backgroundColor: colors.primary, borderRadius: 6 },
});

// ── Exercise renderers ─────────────────────────────────────────────

function AyahDisplay({
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
      await pauseCurrentAudio();
      if (mountedRef.current) setPlaying(false);
    } else {
      await playUrl(ex.ayah_audio_url, () => { if (mountedRef.current) setPlaying(false); });
      if (mountedRef.current) setPlaying(true);
    }
  };

  return (
    <ScrollView contentContainerStyle={AD.container} showsVerticalScrollIndicator={false}>
      {showLumo && (
        <View style={AD.lumoRow}>
          <Image
            source={require('../../../assets/images/lumo_transparent.png')}
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
        {playing
          ? <View style={AD.pauseIcon}><View style={AD.pauseBar} /><View style={AD.pauseBar} /></View>
          : <Text style={AD.playIconText}>▶</Text>
        }
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
  playIconText: { fontSize: 24, color: 'white' },
  pauseIcon: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  pauseBar:  { width: 5, height: 22, backgroundColor: 'white', borderRadius: 2 },
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

function FillBlankOrNextWord({
  ex, surahName, character, locked, onSubmit,
}: {
  ex: ExerciseDict;
  surahName: string;
  character: Character;
  locked?: boolean;
  onSubmit: (ans: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const arabicFont = useArabicFont();

  useEffect(() => {
    if (ex.word_audio_url) { void playUrl(ex.word_audio_url); }
    setSelected(null);
  }, [ex.ex_id]);

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
          <Text style={EX.wordAudioIcon}>🔊</Text>
          <Text style={EX.wordAudioLabel}>Hear words</Text>
        </TouchableOpacity>
      )}

      {/* Question card: context + tokens */}
      <View style={EX.questionCard}>
        {ex.context_before?.length ? (
          <Text style={EX.contextText}>{ex.context_before.join(' ')}</Text>
        ) : null}

        {ex.tokens?.length ? (
          <View style={EX.tokensRow}>
            {ex.tokens.map((t, i) =>
              t.blank
                ? <View key={i} style={[EX.blankBox, selected && EX.blankFilled]}>
                    {selected ? <Text style={arabicTextStyle(EX.blankText as any, arabicFont) as any}>{selected}</Text> : null}
                  </View>
                : <Text key={i} style={arabicTextStyle(EX.tokenWord as any, arabicFont) as any}>{t.ar}</Text>
            )}
          </View>
        ) : null}

        {ex.context_after?.length ? (
          <Text style={EX.contextText}>{ex.context_after.join(' ')}</Text>
        ) : null}
      </View>

      {/* Options: tap once = select, long-press = audio; locked after Check */}
      <View style={EX.optionsGrid}>
        {ex.options?.map((o, i) => (
          <TouchableOpacity
            key={i}
            style={[EX.optionBtn, selected === o.ar && EX.optionSelected, locked && { opacity: 0.7 }]}
            onPress={() => { if (!locked) setSelected(o.ar); }}
            onLongPress={() => { if (o.audio_url && !locked) void playUrl(o.audio_url); }}
            delayLongPress={400}
          >
            <Text style={[arabicTextStyle(EX.optionText as any, arabicFont) as any, selected === o.ar && EX.optionTextSelected]}>{o.ar}</Text>
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

function ReorderOrSequence({
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
      {ex.context_before?.length ? <Text style={EX.contextText}>{ex.context_before.join(' ')}</Text> : null}

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

function SegmentRecall({
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

function SequenceExercise({
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

function AudioFill({
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
          <Text style={AF.hearBtnIcon}>🔊</Text>
          <Text style={AF.hearBtnLabel}>Hear the word</Text>
        </TouchableOpacity>
      ) : null}

      <View style={EX.questionCard}>
        {ex.context_before?.length ? <Text style={EX.contextText}>{ex.context_before.join(' ')}</Text> : null}
        {ex.tokens?.length ? (
          <View style={EX.tokensRow}>
            {ex.tokens.map((t, i) =>
              t.blank
                ? <View key={i} style={[EX.blankBox, selected ? EX.blankFilled : null]}>
                    {selected ? <Text style={arabicTextStyle(EX.blankText as any, arabicFont) as any}>?</Text> : null}
                  </View>
                : <Text key={i} style={arabicTextStyle(EX.tokenWord as any, arabicFont) as any}>{t.ar}</Text>
            )}
          </View>
        ) : null}
        {ex.context_after?.length ? <Text style={EX.contextText}>{ex.context_after.join(' ')}</Text> : null}
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
  hearBtn:           { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', backgroundColor: colors.primaryBg, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 22, marginBottom: 16, borderWidth: 1.5, borderColor: colors.primary },
  hearBtnIcon:       { fontSize: 18 },
  hearBtnLabel:      { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.primary },
  optionsGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 24 },
  optionBtn:         { width: '45%', backgroundColor: 'white', borderWidth: 1.5, borderColor: colors.border, borderRadius: 16, paddingVertical: 18, alignItems: 'center', gap: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  optionSelected:    { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  playCircle:        { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primaryBg, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  playCircleSelected:{ backgroundColor: colors.primary },
  playCirclePlaying: { backgroundColor: colors.primaryDark },
  playIcon:          { fontSize: 18, color: colors.primary },
  pauseRow:          { flexDirection: 'row', gap: 4 },
  pauseBar:          { width: 4, height: 14, backgroundColor: 'white', borderRadius: 2 },
  optionNum:         { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.mutedText },
});

// ── Ayat Then Order exercise ──────────────────────────────────────
// Shows first ayah as a read-only header. User then reorders tiles of the next ayah.

function AyatThenOrder({
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
}

// Full bottom-sheet result — rendered at screen level (like FeedbackBanner)
// so it always has enough room to show the score, XP pill, and Continue button.
function SpeakResultBanner({ result, onAdvance }: { result: SpeakResult; onAdvance: () => void }) {
  const { passed, score_pct, correctAyah } = result;
  const arabicFont = useArabicFont();
  return (
    <View style={[SRB.sheet, !passed && SRB.sheetFail]}>
      {/* Top row: badge + title/subtitle */}
      <View style={SRB.topRow}>
        <View style={[SRB.badge, !passed && SRB.badgeFail]}>
          <Text style={SRB.badgeText}>{passed ? '★' : '~'}</Text>
        </View>
        <View style={SRB.topText}>
          <Text style={[SRB.title, !passed && SRB.titleFail]}>
            {passed ? 'Great job!' : 'Keep practicing!'}
          </Text>
          <Text style={[SRB.sub, !passed && SRB.subFail]}>
            {passed ? `YOU SCORED ${score_pct}%` : `SCORE: ${score_pct}% — AIM FOR 60%+`}
          </Text>
        </View>
      </View>

      {/* XP pill — only shown when the user passed (earned it) */}
      {passed && (
        <View style={SRB.xpPill}>
          <Image source={require('../../../assets/images/lumo_xp.png')} style={SRB.xpLumo} resizeMode="contain" />
          <Text style={SRB.xpText}>+2 XP</Text>
        </View>
      )}

      {/* Correct ayah — shown on fail so user can see the right text */}
      {!!correctAyah && !passed && (
        <View style={SRB.transcriptBox}>
          <Text style={SRB.transcriptLabel}>CORRECT AYAH</Text>
          <AyahText text={correctAyah} style={arabicTextStyle(SRB.ayahText as any, arabicFont) as any} />
        </View>
      )}

      <TouchableOpacity style={[SRB.btn, !passed && SRB.btnFail]} onPress={onAdvance}>
        <Text style={SRB.btnText}>Continue  →</Text>
      </TouchableOpacity>
    </View>
  );
}

const SRB = StyleSheet.create({
  // Matches FeedbackBanner: absolute bottom sheet with rounded top corners
  sheet:           { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#D1FAE5', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 36, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 12 },
  sheetFail:       { backgroundColor: '#FFF3E0' },
  topRow:          { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
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
  transcriptBox:   { backgroundColor: 'white', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 14, alignItems: 'center' },
  transcriptLabel: { fontFamily: 'Nunito_700Bold', fontSize: 10, color: colors.mutedText, letterSpacing: 1.2, marginBottom: 8 },
  ayahText:        { fontFamily: 'NotoNaskhArabic_400Regular', fontSize: 22, color: colors.darkText, textAlign: 'center', lineHeight: 38 },
  btn:             { backgroundColor: '#16A34A', borderRadius: 16, paddingVertical: 17, alignItems: 'center', shadowColor: '#16A34A', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  btnFail:         { backgroundColor: '#F97316', shadowColor: '#F97316' },
  btnText:         { fontFamily: 'Nunito_700Bold', fontSize: 16, color: 'white' },
});

// ── Read Ayah and Speak exercise ───────────────────────────────────
// Shows the full ayah with a play button (hear it first), then a
// press-and-hold mic to record recitation. Scores via speak-attempt
// API then calls onSpeakScored so the parent can show the result banner.
//
// phase: "main"   — single ayah
// phase: "review" — same UX (side-by-side comparison is deferred)

type SpeakState = 'idle' | 'recording' | 'scoring' | 'done';

function ReadAyahAndSpeak({
  ex, surahName, character, onSpeakScored,
}: { ex: ExerciseDict; surahName: string; character: Character; onSpeakScored: (result: SpeakResult) => void }) {
  const arabicFont = useArabicFont();
  const [speakState, setSpeakState] = useState<SpeakState>('idle');
  const [error, setError]           = useState<string | null>(null);
  const mountedRef  = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Clean up any in-flight recording if the component unmounts mid-session
      if (_recording) { void stopRecording(); }
    };
  }, []);

  // Reset state when the exercise changes (e.g. phase=review, two in a row)
  useEffect(() => {
    setSpeakState('idle');
    setError(null);
  }, [ex.ex_id]);

  /** User pressed the mic — request permission then start recording. */
  const handlePressIn = async () => {
    if (speakState !== 'idle') return;
    setError(null);

    const granted = await requestMicPermission();
    if (!granted) {
      if (mountedRef.current) setError('Microphone permission is required to record your recitation.');
      return;
    }

    try {
      await startRecording();
      if (mountedRef.current) setSpeakState('recording');
    } catch (e) {
      console.warn('[ReadAyahAndSpeak] startRecording failed:', e);
      if (mountedRef.current) setError('Could not start recording. Please try again.');
    }
  };

  /** User lifted their finger — stop recording and score it. */
  const handlePressOut = async () => {
    if (speakState !== 'recording') return;
    if (mountedRef.current) setSpeakState('scoring');

    try {
      const uri = await stopRecording();
      if (!uri) throw new Error('No audio captured');

      const scored = await progressApi.speakAttempt({
        expected_arabic: ex.expected_arabic ?? '',
        audioUri: uri,
        audioType: Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4',
      });

      if (mountedRef.current) {
        setSpeakState('done');
        onSpeakScored({ passed: scored.passed, score_pct: scored.score_pct, transcript: scored.transcript, correctAyah: ex.ayah_ar ?? ex.expected_arabic ?? null });
      }
    } catch (e) {
      console.warn('[ReadAyahAndSpeak] speak-attempt failed:', e);
      if (mountedRef.current) {
        setError('Scoring failed. Tap "Try again" to re-record.');
        setSpeakState('idle');
      }
    }
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
            <Text style={EX.bubbleText}>{BUBBLE_TEXT['read_ayah_and_speak']}</Text>
            <Text style={EX.bubbleLabel}>Surah {surahName}</Text>
          </View>
        </View>

        {/* Ayah card — the text the user will recite */}
        <View style={RAS.ayahCard}>
          <AyahText
            text={ex.ayah_ar ?? ''}
            style={arabicTextStyle(RAS.ayahText as any, arabicFont) as any}
          />
        </View>

        {/* Hear it first — prefer full ayah URL, fall back to segment URLs */}
        <PlayPauseBtn
          url={ex.ayah_audio_url}
          urls={ex.segment_audio_urls}
          label="Hear the Ayah"
        />

      </ScrollView>

      {/* Mic area pinned below the scroll content so it never gets
          pushed off-screen by the ayah text on short devices */}
      {speakState !== 'done' && (
        <View style={RAS.micArea}>
          <Text style={RAS.micInstruction}>
            {speakState === 'recording'
              ? 'Recording… release to submit'
              : speakState === 'scoring'
              ? 'Scoring your recitation…'
              : 'Hold the mic and recite the ayah'}
          </Text>

          {speakState === 'scoring' ? (
            <ActivityIndicator color={colors.primary} size="large" style={RAS.spinner} />
          ) : (
            <Pressable
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              style={({ pressed }) => [RAS.micBtn, pressed && RAS.micBtnActive]}
            >
              {speakState === 'recording' ? (
                <LottieView
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
    </View>
  );
}

const RAS = StyleSheet.create({
  outer:          { flex: 1 },
  container:      { padding: 20, paddingBottom: 8 },
  ayahCard:       { width: '100%', backgroundColor: '#FFFBF0', borderRadius: 18, borderWidth: 1.5, borderColor: '#E8D8A0', padding: 24, alignItems: 'center', marginBottom: 16 },
  ayahText:       { fontFamily: 'NotoNaskhArabic_400Regular', fontSize: 28, color: colors.darkText, textAlign: 'center', lineHeight: 52 },
  // Fixed bottom area — always visible above the WaveBar / result sheet
  micArea:        { alignItems: 'center', paddingVertical: 20, paddingBottom: 32 },
  micInstruction: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.mutedText, marginBottom: 20, textAlign: 'center' },
  spinner:        { marginTop: 16, marginBottom: 16 },
  // White background with green border makes the mic.png icon clearly visible
  // against the button surface. Press → slight scale-down.
  micBtn:         { width: 108, height: 108, borderRadius: 54, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 12 },
  micBtnActive:   { transform: [{ scale: 0.93 }], shadowOpacity: 0.25 },
  micImage:       { width: 52, height: 52, tintColor: 'white' },
  listenAnim:     { width: 88, height: 88 },
  errorBox:       { marginTop: 20, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, alignItems: 'center', width: '100%' },
  errorText:      { fontFamily: 'Nunito_400Regular', fontSize: 13, color: '#991B1B', textAlign: 'center', marginBottom: 8 },
  retryLink:      { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.primary },
});

// ── Read and Speak exercise ────────────────────────────────────────
// Shows a row of tappable word chips (each plays its audio_url).
// Press-and-hold the mic to record reading all the words aloud.
// Scores via speak-attempt API and shows result inline.

function ReadAndSpeak({
  ex, surahName, character, onSpeakScored,
}: { ex: ExerciseDict; surahName: string; character: Character; onSpeakScored: (result: SpeakResult) => void }) {
  const arabicFont = useArabicFont();
  const [speakState, setSpeakState] = useState<SpeakState>('idle');
  const [error, setError]           = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (_recording) { void stopRecording(); }
    };
  }, []);

  useEffect(() => {
    setSpeakState('idle');
    setError(null);
  }, [ex.ex_id]);

  const handlePressIn = async () => {
    if (speakState !== 'idle') return;
    setError(null);

    const granted = await requestMicPermission();
    if (!granted) {
      if (mountedRef.current) setError('Microphone permission is required to record your recitation.');
      return;
    }

    try {
      await startRecording();
      if (mountedRef.current) setSpeakState('recording');
    } catch (e) {
      console.warn('[ReadAndSpeak] startRecording failed:', e);
      if (mountedRef.current) setError('Could not start recording. Please try again.');
    }
  };

  const handlePressOut = async () => {
    if (speakState !== 'recording') return;
    if (mountedRef.current) setSpeakState('scoring');

    try {
      const uri = await stopRecording();
      if (!uri) throw new Error('No audio captured');

      const scored = await progressApi.speakAttempt({
        expected_arabic: ex.expected_arabic ?? '',
        audioUri: uri,
        audioType: Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4',
      });

      if (mountedRef.current) {
        setSpeakState('done');
        onSpeakScored({ passed: scored.passed, score_pct: scored.score_pct, transcript: scored.transcript, correctAyah: ex.expected_arabic ?? null });
      }
    } catch (e) {
      console.warn('[ReadAndSpeak] speak-attempt failed:', e);
      if (mountedRef.current) {
        setError('Scoring failed. Tap "Try again" to re-record.');
        setSpeakState('idle');
      }
    }
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
            <Text style={EX.bubbleText}>{BUBBLE_TEXT['read_and_speak']}</Text>
            <Text style={EX.bubbleLabel}>Surah {surahName}</Text>
          </View>
        </View>

        {/* Word chips — displayed RTL (right-to-left, Arabic reading order) */}
        <View style={RANS.wordRow}>
          {tokens.map((token, i) => (
            <TouchableOpacity
              key={i}
              style={RANS.wordChip}
              onPress={() => { void playUrl(token.audio_url); }}
            >
              <Text style={arabicTextStyle(RANS.wordText as any, arabicFont) as any}>
                {token.ar}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* "Hear" — pre-loads all word audio then plays in rapid succession */}
        {allAudioUrls.length > 0 && (
          <TouchableOpacity
            style={RANS.hearAllBtn}
            onPress={() => { void playUrlSequenceFast(allAudioUrls); }}
          >
            <Text style={RANS.hearAllIcon}>🔊</Text>
            <Text style={RANS.hearAllText}>Hear</Text>
          </TouchableOpacity>
        )}

      </ScrollView>

      {/* Mic area pinned below scroll — always visible on all screen sizes */}
      {speakState !== 'done' && (
        <View style={RANS.micArea}>
          <Text style={RANS.micInstruction}>
            {speakState === 'recording'
              ? 'Recording… release to submit'
              : speakState === 'scoring'
              ? 'Scoring your recitation…'
              : 'Hold the mic and read the words above'}
          </Text>

          {speakState === 'scoring' ? (
            <ActivityIndicator color={colors.primary} size="large" style={RANS.spinner} />
          ) : (
            <Pressable
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              style={({ pressed }) => [RANS.micBtn, pressed && RANS.micBtnActive]}
            >
              {speakState === 'recording' ? (
                <LottieView
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
    </View>
  );
}

const RANS = StyleSheet.create({
  outer:          { flex: 1 },
  container:      { padding: 20, paddingBottom: 8 },
  // Words wrap into multiple lines for longer ayahs
  wordRow:        { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 16, width: '100%' },
  wordChip:       { backgroundColor: '#FFFBF0', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1.5, borderColor: '#E8D8A0' },
  wordText:       { fontFamily: 'NotoNaskhArabic_400Regular', fontSize: 22, color: colors.darkText },
  // "Hear them all" button — plays the full phrase sequence
  hearAllBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', backgroundColor: colors.primaryBg, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 18, marginBottom: 8, borderWidth: 1, borderColor: colors.primary },
  hearAllIcon:    { fontSize: 14 },
  hearAllText:    { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.primary },
  micArea:        { alignItems: 'center', paddingVertical: 20, paddingBottom: 32 },
  micInstruction: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.mutedText, marginBottom: 20, textAlign: 'center' },
  spinner:        { marginTop: 16, marginBottom: 16 },
  // White background with green border makes mic.png clearly visible
  micBtn:         { width: 108, height: 108, borderRadius: 54, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 12 },
  micBtnActive:   { transform: [{ scale: 0.93 }], shadowOpacity: 0.25 },
  micImage:       { width: 52, height: 52, tintColor: 'white' },
  listenAnim:     { width: 88, height: 88 },
  errorBox:       { marginTop: 20, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, alignItems: 'center', width: '100%' },
  errorText:      { fontFamily: 'Nunito_400Regular', fontSize: 13, color: '#991B1B', textAlign: 'center', marginBottom: 8 },
  retryLink:      { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.primary },
});

// ── Hear and Select exercise ──────────────────────────────────────
// Auto-plays segment audio on mount. Big speaker button to replay.
// Tap option = select. Long-press option = hear its audio. Submit = ar string.

function HearAndSelect({
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
          : <Text style={HAS.speakerIcon}>🔊</Text>
        }
        <Text style={[HAS.speakerLabel, playing && { color: 'rgba(255,255,255,0.85)' }]}>
          {playing ? 'Playing…' : 'Tap to hear again'}
        </Text>
      </TouchableOpacity>

      {/* Option cards */}
      <View style={EX.optionsColumn}>
        {(ex.options ?? []).map((o, i) => (
          <TouchableOpacity
            key={i}
            style={[EX.optionBtnFull, selected === o.ar && EX.optionSelected, locked && { opacity: 0.7 }]}
            onPress={() => { if (!locked) setSelected(o.ar); }}
            onLongPress={() => { if (o.audio_url) void playUrl(o.audio_url); }}
            delayLongPress={400}
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
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: colors.primaryBg, borderWidth: 3, borderColor: colors.primary,
    marginBottom: 24,
    shadowColor: colors.primary, shadowOpacity: 0.28, shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  speakerBtnActive: { backgroundColor: colors.primary },
  speakerIcon:  { fontSize: 46, textAlign: 'center', color: colors.primary },
  speakerLabel: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: colors.primary, marginTop: 6, textAlign: 'center' },
  pauseIcon:    { flexDirection: 'row', gap: 7, alignItems: 'center' },
  pauseBar:     { width: 7, height: 30, backgroundColor: 'white', borderRadius: 3 },
});

const EX = StyleSheet.create({
  scrollContent: { padding: 20, paddingBottom: 40 },
  instruction: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: colors.darkText, textAlign: 'center', marginBottom: 16 },
  // Character + speech bubble
  characterRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16, overflow: 'visible' },
  characterImg: { width: 110, height: 110 },
  verseInfoCard: { flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2, gap: 3 },
  bubbleTail: { position: 'absolute', left: -10, top: 18, width: 0, height: 0, borderTopWidth: 8, borderBottomWidth: 8, borderRightWidth: 10, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: 'white' },
  characterName: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: colors.primary, letterSpacing: 0.8 },
  bubbleLabel: { fontFamily: 'Nunito_400Regular', fontSize: 10, color: colors.mutedText },
  bubbleText:  { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.darkText },
  // Word-by-word speaker (above question card)
  wordAudioBtn:   { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8, backgroundColor: colors.primaryBg, borderRadius: 14, paddingVertical: 5, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.primary },
  wordAudioIcon:  { fontSize: 13 },
  wordAudioLabel: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: colors.primary },
  // Review (wrong-answer replay) banner
  reviewBanner: { backgroundColor: '#FEF3C7', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, marginBottom: 10, alignItems: 'center' as const, borderWidth: 1, borderColor: '#F59E0B' },
  reviewBannerText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: '#92400E' },
  // Question card
  questionCard: { backgroundColor: '#FFFBF0', borderRadius: 18, padding: 20, marginBottom: 20, borderWidth: 1.5, borderColor: 'rgba(196,168,76,0.4)', alignItems: 'center' },
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
  continueBtn: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  continueBtnDisabled: { opacity: 0.35 },
  continueBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: 'white' },
  // Sequence (ayah ordering) exercise styles
  seqAnswerZone: { flexDirection: 'row-reverse' as const, gap: 12, justifyContent: 'center' as const, marginVertical: 20, paddingHorizontal: 16 },
  seqBank:       { flexDirection: 'row-reverse' as const, gap: 12, justifyContent: 'center' as const, marginBottom: 24, paddingHorizontal: 16 },
  seqBox:        { flex: 1, minHeight: 90, borderRadius: 16,
                   alignItems: 'center' as const, justifyContent: 'center' as const,
                   paddingHorizontal: 10, paddingVertical: 12,
                   backgroundColor: 'white', borderWidth: 2, borderColor: colors.primary,
                   shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  seqBoxFilled:  { backgroundColor: 'rgba(55,161,104,0.1)' },
  seqBoxEmpty:   { borderStyle: 'dashed' as const, borderColor: 'rgba(55,161,104,0.4)', backgroundColor: 'rgba(55,161,104,0.03)' },
  seqSlotNum:    { fontFamily: 'Nunito_700Bold', fontSize: 18, color: 'rgba(55,161,104,0.25)' },
  seqTileText:   { fontFamily: 'NotoNaskhArabic_400Regular', fontSize: 20, color: '#1A3A2A', textAlign: 'center' as const },
});

// ── Feedback overlay ───────────────────────────────────────────────

function FeedbackBanner({
  result, onAdvance,
}: { result: FormulaAttemptOut; onAdvance: () => void }) {
  const correct = result.correct;
  const arabicFont = useArabicFont();
  const xpAwarded = result.xp_awarded ?? 0;
  const showAnswer = !correct && result.correct_answer != null;
  const answerStr = Array.isArray(result.correct_answer)
    ? result.correct_answer.join(' ')
    : String(result.correct_answer ?? '');

  if (correct) {
    return (
      <View style={FB.sheet}>
        <View style={FB.correctRow}>
          <View style={FB.correctBadge}><Text style={FB.correctBadgeText}>✓</Text></View>
          <View>
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
    <View style={[FB.sheet, FB.wrongSheet]}>
      <View style={FB.wrongRow}>
        <View style={FB.wrongBadge}><Text style={FB.wrongBadgeText}>✕</Text></View>
        <Text style={FB.wrongTitle}>Incorrect</Text>
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
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#D1FAE5', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 36, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 12 },
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

// ── Main screen ────────────────────────────────────────────────────

interface Props {
  navigation: RootNavProp;
  route: { params: { groupId: string; surahName: string; surahNumber: number } };
}

export default function LessonSessionScreen({ navigation, route }: Props) {
  const { groupId, surahName, surahNumber } = route.params;
  const insets = useSafeAreaInsets();

  const { sessionId, heartsAtStart, firstExercise, error, loading, group, steps, reset, loadGroup, startSession, completeSession, abandonSession, groupId: storeGroupId } = useLessonStore();
  const { user } = useAuthStore();

  const [exercise, setExercise] = useState<ExerciseDict | null>(null);
  const [showBismillah, setShowBismillah] = useState(false);
  const [segments, setSegments] = useState<SegmentStatus[]>([]);
  const [feedback, setFeedback] = useState<FormulaAttemptOut | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [noHeartsVisible, setNoHeartsVisible] = useState(false);
  const [exercisesCompleted, setExercisesCompleted] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [speakResult, setSpeakResult] = useState<SpeakResult | null>(null);
  const exerciseIndexRef = useRef(0);
  const charOrderRef = useRef<number[]>(shuffleIndices(CHARACTERS.length));
  const startedAt = useRef(Date.now());
  const pendingAdvanceFn = useRef<(() => void) | null>(null);
  const ayahDisplayCountRef = useRef(0);
  const totalXpRef = useRef(0); // accumulates xp_awarded across all formulaAttempt calls

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
      void _sound?.stopAsync().catch(() => {});
      void _sound?.unloadAsync().catch(() => {});
      notifySystemPlaying(false);
      if (_recording) { void stopRecording(); }
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
      void _sound?.stopAsync().catch(() => {});
      void _sound?.unloadAsync().catch(() => {});
      _sound = null;
      notifySystemPlaying(false);
      // Also abort any in-flight recording
      if (_recording) { void stopRecording(); }
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
    }
  }, [firstExercise, storeGroupId]);

  const submitAnswer = useCallback(async (userAnswer: string | string[] | number[] | null) => {
    if (!sessionId || !exercise || submitting) return;
    setSubmitting(true);
    const ms = Date.now() - startedAt.current;

    // ── Formula engine flow ──────────────────────────────────────────
    try {
      const result = await learningApi.formulaAttempt(sessionId, {
        ex_id: exercise.ex_id,
        user_answer: userAnswer,
        response_ms: ms,
      });

      // remediation_up = reinforcement phase, no hearts lost even on wrong
      const isNoMistake = exercise.phase === 'mistakes_review' || exercise.phase === 'remediation_up';
      const snapCorrect  = correctCount + (result.correct ? 1 : 0);
      const snapMistakes = mistakes + (!result.correct && !isNoMistake ? 1 : 0);

      // Track cumulative XP earned across all exercises for the session-end screen
      totalXpRef.current += result.xp_awarded ?? 0;

      if (!result.correct && !isNoMistake) setMistakes(snapMistakes);
      else if (result.correct) {
        setCorrectCount(snapCorrect);
        setExercisesCompleted(prev => prev + 1);
        // Confetti: XP awarded on normal questions only (not listen steps, speak exercises, or session end)
        const isSpeakExercise = exercise.type === 'read_ayah_and_speak' || exercise.type === 'read_and_speak';
        if ((result.xp_awarded ?? 0) > 0 && exercise.type !== 'ayah_display' && !isSpeakExercise && !result.done) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 1500);
        }
      }

      if (result.segments.length) setSegments(result.segments);

      // Hearts exhausted — end attempt immediately (skip in no-mistake phases)
      if (!result.correct && !isNoMistake && snapMistakes >= 5) {
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
            navigation.replace('LessonComplete', {
              xp: totalXpRef.current || summary.xp_awarded,
              scorePct: summary.passed ? Math.max(scorePct, 70) : scorePct,
              stars: 3,
              heartsRemaining: summary.hearts_remaining,
            });
          } catch {
            navigation.replace('LessonComplete', {
              xp: totalXpRef.current || 20, scorePct,
              stars: 3,
              heartsRemaining: Math.max(0, 5 - snapMistakes),
            });
          }
        } else if (result.next_exercise) {
          exerciseIndexRef.current += 1;  // advance character only when moving to next exercise
          setExercise(result.next_exercise);
          startedAt.current = Date.now();
        }
        setSubmitting(false);
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
      } else {
        // Show feedback banner; user presses Continue / GOT IT to advance
        pendingAdvanceFn.current = advanceFn;
        setFeedback(result);
      }
    } catch (e: any) {
      setSubmitting(false);
      if (e?.status === 404 || e?.status === 400) {
        navigation.replace('LessonComplete', {
          xp: 0, scorePct: 0, stars: 1, heartsRemaining: heartsAtStart,
        });
      }
    }
  }, [sessionId, exercise, submitting, correctCount, mistakes, heartsAtStart]);

  const handleBack = () => {
    abandonSession({ silent: true }).catch(() => {});
    navigation.goBack();
  };

  // ── Error state ──────────────────────────────────────────────────
  if (error && !loading) {
    return (
      <View style={[S.center, { paddingTop: insets.top }]}>
        <LottieView
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
      </View>
    );
  }

  // ── Not ready: session loaded but backend has no exercises yet ───
  if (!loading && !error && !firstExercise && !exercise) {
    return (
      <View style={[S.center, { paddingTop: insets.top }]}>
        <LottieView
          source={require('../../../assets/animations/loading.json')}
          autoPlay loop
          style={{ width: 140, height: 140 }}
        />
        <Text style={S.errorTitle}>Creating Your Training</Text>
        <Text style={S.errorMsg}>Your exercises are being prepared. This usually takes a moment.</Text>
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

  // ── Loading state ────────────────────────────────────────────────
  if (!exercise || loading) {
    return (
      <LumaLoading
        message={loading ? `Loading ${surahName}…` : 'Preparing your lesson…'}
        insetTop={insets.top}
        onBack={() => {
          abandonSession({ silent: true }).catch(() => {});
          navigation.goBack();
        }}
      />
    );
  }

  // ── Exercise header ──────────────────────────────────────────────
  const maxHearts = 5;
  const heartsLeft = Math.max(0, maxHearts - mistakes);

  const totalSteps       = Math.max(steps.filter(s => s.type !== 'interstitial').length, 1);
  const effectiveTotal   = Math.max(totalSteps, exerciseIndexRef.current + 1);
  const progressFraction = Math.min(exercisesCompleted / effectiveTotal, 1.0);
  const character = characterForIndex(charOrderRef.current, exerciseIndexRef.current);

  return (
    <View style={[S.screen, { paddingTop: insets.top }]}>
      {/* Top bar: X + progress bar + 4 hearts + Hint */}
      <View style={S.header}>
        <TouchableOpacity style={S.backBtn} onPress={handleBack}>
          <Text style={S.backText}>✕</Text>
        </TouchableOpacity>

        <ProgressBar fraction={progressFraction} />

        <View style={S.heartsRow}>
          {Array.from({ length: maxHearts }).map((_, i) => (
            <Text key={i} style={[S.heartIcon, i >= heartsLeft && { opacity: 0.2 }]}>❤️</Text>
          ))}
        </View>

        {(() => {
          const hintAyah = group?.ayahs.find(a => a.ayah_number === exercise.ayah_no);
          const showHint = exercise.type !== 'ayah_display' && exercise.type !== 'hear_and_select' && exercise.type !== 'sequence';
          return (
            <HintButton
              url={showHint ? exercise.ayah_audio_url : null}
              ayahAr={showHint ? (exercise.ayah_ar ?? hintAyah?.arabic ?? null) : null}
              ayahTranslation={showHint ? (exercise.ayah_translation ?? hintAyah?.translation_en ?? null) : null}
            />
          );
        })()}
      </View>

      {/* Exercise content + WaveBar (shows at bottom whenever audio plays) */}
      <View style={S.exerciseArea}>
        {exercise.type === 'ayah_display' && (
          <AyahDisplay
            key={exercise.ex_id}
            ex={exercise}
            surahName={surahName}
            transliteration={group?.ayahs.find(a => a.ayah_number === exercise.ayah_no)?.transliteration ?? null}
            showLumo={ayahDisplayCountRef.current < 3}
            onContinue={() => {
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
          />
        )}
        {exercise.type === 'read_and_speak' && (
          <ReadAndSpeak
            key={exercise.ex_id}
            ex={exercise}
            surahName={surahName}
            character={character}
            onSpeakScored={setSpeakResult}
          />
        )}

        {/* WaveBar: hidden for audio_fill (user is choosing words, not listening)
            and hidden for speak exercises (mic button is at the bottom — the wave
            animation physically overlaps it and the PlayPauseBtn already shows audio state). */}
        {exercise.type !== 'audio_fill' &&
         exercise.type !== 'read_ayah_and_speak' &&
         exercise.type !== 'read_and_speak' && <WaveBar />}
      </View>

      {/* Submitting spinner */}
      {submitting && !feedback && (
        <View style={S.spinnerOverlay}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}

      {/* Speak result bottom sheet — shown after speak-attempt scores.
          Continue calls submitAnswer(null) → formulaAttempt → next exercise. */}
      {speakResult && !feedback && (
        <SpeakResultBanner
          result={speakResult}
          onAdvance={() => {
            setSpeakResult(null);
            void submitAnswer(null);
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
            <Image
              source={require('../../../assets/images/lumo_cry.png')}
              style={S.noHeartsLumo}
              resizeMode="contain"
            />
            <Text style={S.noHeartsTitle}>Out of Hearts!</Text>
            <Text style={S.noHeartsBody}>
              You've run out of hearts for this attempt.{'\n'}Take a breath and try again!
            </Text>
            <TouchableOpacity
              style={S.buyHeartsBtn}
              onPress={() => Alert.alert('Coming Soon', 'Heart refills will be available soon. Stay tuned!')}
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
    </View>
  );
}

const S = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.lightBg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lightBg, padding: 28 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  backText: { fontSize: 14, color: colors.mutedText },
  heartsRow: { flexDirection: 'row', gap: 3 },
  heartIcon: { fontSize: 16 },
  exerciseArea: { flex: 1 },
  spinnerOverlay:  { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(242,244,248,0.6)' },
  confettiOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  confettiAnim:    { width: '100%', height: 320 },
  errorTitle: { fontFamily: 'Nunito_700Bold', fontSize: 18, color: colors.darkText, marginBottom: 8, textAlign: 'center' },
  errorMsg: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.mutedText, textAlign: 'center', marginBottom: 24 },
  retryBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 },
  retryBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: 'white' },
  // No-hearts overlay
  noHeartsOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', zIndex: 100, paddingHorizontal: 28 },
  noHeartsCard: { backgroundColor: 'white', borderRadius: 28, padding: 28, alignItems: 'center', width: '100%', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 20 },
  noHeartsTitle: { fontFamily: 'Nunito_700Bold', fontSize: 26, color: colors.darkText, marginBottom: 10 },
  noHeartsBody: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: colors.midText, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  buyHeartsBtn: { width: '100%', backgroundColor: '#F0F4FF', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 12, borderWidth: 1.5, borderColor: '#C7D2FE' },
  buyHeartsBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: '#4338CA' },
  buyHeartsSubText: { fontFamily: 'Nunito_400Regular', fontSize: 11, color: '#818CF8', marginTop: 2 },
  noHeartsRetryBtn: { width: '100%', backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  noHeartsRetryText: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: 'white' },
  noHeartsLumo: { width: 120, height: 120, marginBottom: 8 },
});

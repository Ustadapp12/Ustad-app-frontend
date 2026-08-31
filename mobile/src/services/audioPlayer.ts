import { Platform } from 'react-native';
import { captureError } from './crashReporter';

// Sounds pre-loaded for the active lesson — not released between steps
const preloadedSounds = new Map<string, unknown>();
let activeSoundIsPreloaded = false;
let currentSpeed = 1;

type SoundLike = {
  stop: () => void;
  release: () => void;
  play: (cb: (s: boolean) => void) => void;
  setCurrentTime: (t: number) => void;
  setSpeed: (speed: number) => void;
  getDuration: () => number;
};

let activeSound: SoundLike | null = null;

// ── Staleness token ──────────────────────────────────────────────────
// Root cause of a real production incident (2026-08-28): a user tapped
// several "play" buttons across several exercises while the network was
// degraded. Every tap's on-demand `new Sound(url, ...)` load sat buffering
// -- nothing tracked those in-flight, not-yet-loaded loads at all, only
// whatever had ALREADY finished loading and become `activeSound`. Calling
// stopActiveSound() on the next tap stopped the CURRENT sound but had no
// handle on the earlier ones still buffering in the background. Minutes
// later, when the network recovered, every one of those stale loads finished
// buffering within the same window and each one's callback did exactly what
// it always does: set activeSound and call .play() -- so five unrelated
// clips, requested on five different exercises, all started playing at
// once, long after the learner had moved on. LessonSessionScreen.tsx had its
// own activeExerciseId guard for this, but it checked staleness BEFORE
// awaiting playAudioUrl (a no-op -- nothing can have changed yet at that
// point) instead of after, and it only covered calls that went through its
// own playUrl() wrapper, not this module directly.
//
// The real fix has to live here, at the one choke point every play request
// -- from any screen, any component -- actually passes through. Every call
// to playAudioUrl() stamps itself with the current token BEFORE any async
// work starts. The on-demand load path re-checks its stamp the instant the
// network load finishes, right before the point of no return (.play()) --
// if a newer request (or an explicit stop) has since bumped the token, the
// stale one silently releases itself and never plays, never touches
// activeSound, never flips the "is audio playing" UI state. The preloaded
// path needs no such check: it calls .play() synchronously, with no window
// for staleness to develop.
let playToken = 0;

// ── System-audio playing state ──────────────────────────────────────
// A simple pub-sub so UI (e.g. the wave animation) can react to actual
// playback start/stop without every call site having to thread state
// through manually. "Playing" here means audibly playing right now — not
// merely loaded (see isSoundActive for that weaker check).
type PlayingListener = (playing: boolean) => void;
let playingListeners: PlayingListener[] = [];
let systemPlaying = false;

function setSystemPlaying(playing: boolean): void {
  if (systemPlaying === playing) return;
  systemPlaying = playing;
  playingListeners.forEach(l => l(playing));
}

/** Subscribe to play/pause/stop changes. Returns an unsubscribe function. */
export function onPlayingChange(listener: PlayingListener): () => void {
  playingListeners.push(listener);
  return () => { playingListeners = playingListeners.filter(l => l !== listener); };
}

export function isAudioPlaying(): boolean {
  return systemPlaying;
}

/** Set the playback speed for all subsequent play() calls. 0.75 / 1 / 1.25. */
export function setPlaybackSpeed(speed: number): void {
  currentSpeed = speed;
}

/**
 * Put the process-wide audio session into playback mode.
 *
 * Must run before EVERY play, not once at startup: the recorder flips the
 * shared AVAudioSession into PlayAndRecord and does not put it back, so any
 * playback after a speak exercise inherits that mode and routes to the
 * earpiece. Cheap and idempotent, so calling it per play is fine.
 *
 * No-op on Android, where the category concept does not exist.
 */
function ensurePlaybackCategory(): void {
  try {
    const SoundModule = require('react-native-sound');
    (SoundModule.default ?? SoundModule).setCategory('Playback');
  } catch {
    // Native module unavailable (Jest, Expo Go) — playback will fail later
    // and be reported there; nothing useful to do here.
  }
}

function stopActiveSound() {
  if (!activeSound) return;
  try {
    activeSound.stop();
    if (!activeSoundIsPreloaded) {
      activeSound.release();
    }
  } catch {
    // ignore
  }
  activeSound = null;
  activeSoundIsPreloaded = false;
  setSystemPlaying(false);
}

function logAudioIssue(
  phase: 'load' | 'play' | 'setup',
  url: string,
  error?: Error | unknown,
) {
  const detail =
    error instanceof Error ? error.message : error != null ? String(error) : phase;
  if (__DEV__) {
    console.warn(`[audioPlayer] ${phase} failed:`, detail, url);
  } else if (error instanceof Error) {
    captureError(error, { url, phase });
  } else {
    captureError(`audioPlayer ${phase} failed`, { url, detail });
  }
}

/**
 * Pre-buffer all audio files for the current lesson.
 * Called once when the lesson group loads. The Sound objects are kept alive
 * and reused when each step plays audio, eliminating per-step buffering delay.
 */
export async function preloadAudioUrls(urls: string[]): Promise<void> {
  if (!urls.length) return;
  try {
    const SoundModule = require('react-native-sound');
    const Sound = SoundModule.default ?? SoundModule;
    Sound.setCategory('Playback');

    const pending = urls.filter(url => url && !preloadedSounds.has(url));
    const BATCH = 4;
    for (let i = 0; i < pending.length; i += BATCH) {
      await Promise.allSettled(
        pending.slice(i, i + BATCH).map(
          url =>
            new Promise<void>(resolve => {
              const sound = new Sound(url, '', (err: Error | null) => {
                if (!err) {
                  preloadedSounds.set(url, sound);
                }
                resolve();
              });
            }),
        ),
      );
    }
  } catch {
    // non-fatal — regular lazy loading is the fallback
  }
}

/** Alias used by expo-originated screens. */
export const playAudio = playAudioUrl;

/** Stop any currently playing audio, AND invalidate any still-loading
 * in-flight request (see playToken's own comment) so it cannot start
 * playing later once its network load finally finishes. This is the
 * function every screen-change hook below calls -- it is what makes "leaving
 * the page" actually mean the audio stops, not just "whatever's audible
 * right now stops, but three other buffering clips are still queued up." */
export function stopAudio(): void {
  playToken++;
  stopActiveSound();
}

/** Pause currently playing audio (no-op if nothing playing). */
export function pauseAudio(): void {
  if (!activeSound) return;
  try { (activeSound as unknown as { pause: () => void }).pause(); } catch { /* ignore */ }
  setSystemPlaying(false);
}

/** Resume a paused sound (no-op if nothing paused). */
export function resumeAudio(): void {
  if (!activeSound) return;
  ensurePlaybackCategory();
  try { activeSound.play(() => {}); } catch { /* ignore */ }
  setSystemPlaying(true);
}

/** Release all pre-loaded sounds. Call when the lesson ends or is abandoned. */
export function clearPreloadedAudio(): void {
  stopActiveSound();
  for (const sound of preloadedSounds.values()) {
    try {
      (sound as { release: () => void }).release();
    } catch {
      // ignore
    }
  }
  preloadedSounds.clear();
}

/** Release pre-loaded sounds for a specific set of URLs (exercise unmount). */
export function evictPreloadedUrls(urls: string[]): void {
  for (const url of urls) {
    const sound = preloadedSounds.get(url) as SoundLike | undefined;
    if (sound) {
      preloadedSounds.delete(url);
      try { sound.release(); } catch { /* ignore */ }
    }
  }
}

/** Whether a sound is currently loaded (playing or paused). */
export function isSoundActive(): boolean {
  return activeSound !== null;
}

// Clamp a Sound's reported duration into a safe completion-fallback timeout.
// getDuration() can return 0 before metadata is ready — fall back to a
// generous fixed window in that case rather than resolving instantly.
function safeDurationMs(sound: SoundLike): number {
  const duration = sound.getDuration();
  return (duration > 0 ? duration * 1000 / currentSpeed : 6000) + 400;
}

/**
 * Play a URL. `onStart` fires the instant playback actually begins (after any
 * network buffering/decoding for non-preloaded sounds) — callers use it to
 * drive UI that must appear exactly when sound starts, not when loading
 * starts.
 */
export async function playAudioUrl(url: string, onStart?: () => void): Promise<void> {
  if (!url) return;
  // Stamped before ANY async work (including preloadedSounds.get, which is
  // sync, but the point is this must be the very first thing that happens)
  // so a later call -- or an explicit stopAudio() -- can invalidate this one
  // regardless of which branch below it takes.
  const myToken = ++playToken;

  const preloaded = preloadedSounds.get(url) as SoundLike | undefined;

  if (preloaded) {
    stopActiveSound();
    try {
      // iOS: re-assert the Playback category before every play.
      //
      // setCategory is a PROCESS-wide AVAudioSession setting, not a per-Sound
      // one. react-native-audio-recorder-player puts the session into
      // PlayAndRecord when a speak exercise records, and leaves it there. In
      // that mode iOS routes output to the receiver, so the next ayah played
      // back through this path came out of the EARPIECE, quietly, instead of
      // the speaker — for the rest of the lesson.
      //
      // The other two playback paths (preloadAudioUrls and the lazy-load
      // fallback below) already called this; this one did not, and it is the
      // path a real lesson always takes, because loadGroup preloads every
      // clip up front. Android ignores the category entirely, which is why
      // device testing there never surfaced it.
      ensurePlaybackCategory();
      preloaded.setCurrentTime(0);
      preloaded.setSpeed(currentSpeed);
      activeSound = preloaded;
      activeSoundIsPreloaded = true;
      onStart?.();
      setSystemPlaying(true);
      // react-native-sound's play() completion callback is not always
      // reliable on a reused/preloaded Sound instance — when it never fires,
      // a multi-word sequence (playUrlSequence) would hang forever after the
      // first word. Race it against the clip's own duration so playback
      // always advances even if the callback never comes.
      const durationMs = safeDurationMs(preloaded);
      await Promise.race([
        new Promise<void>(resolve => {
          preloaded.play((success: boolean) => {
            if (!success) logAudioIssue('play', url);
            if (activeSound === preloaded) {
              activeSound = null;
              activeSoundIsPreloaded = false;
            }
            resolve();
          });
        }),
        new Promise<void>(resolve => setTimeout(resolve, durationMs)),
      ]);
      setSystemPlaying(false);
    } catch (err) {
      logAudioIssue('play', url, err);
    }
    return;
  }

  // Fallback: load on demand (cache miss or preload not finished yet)
  try {
    const SoundModule = require('react-native-sound');
    const Sound = SoundModule.default ?? SoundModule;
    Sound.setCategory('Playback');
    stopActiveSound();

    await new Promise<void>(resolve => {
      const sound = new Sound(url, '', (err: Error | null) => {
        if (err) {
          logAudioIssue('load', url, err);
          resolve();
          return;
        }
        const s = sound as unknown as SoundLike;
        // The network load above is the whole reason this path can go
        // stale -- see playToken's comment. A newer playAudioUrl() call, or
        // an explicit stopAudio(), bumps the token while this was still
        // buffering. If that happened, this clip must never reach the
        // speaker: release it immediately and resolve without touching
        // activeSound or the "is audio playing" UI state at all, exactly as
        // if this call had never been made.
        if (myToken !== playToken) {
          try { s.release(); } catch { /* ignore */ }
          resolve();
          return;
        }
        s.setSpeed(currentSpeed);
        activeSound = s;
        activeSoundIsPreloaded = false;
        onStart?.();
        setSystemPlaying(true);
        let done = false;
        const finish = () => { if (!done) { done = true; setSystemPlaying(false); resolve(); } };
        s.play((success: boolean) => {
          if (!success) {
            logAudioIssue('play', url);
          }
          s.release();
          if (activeSound === s) {
            activeSound = null;
          }
          finish();
        });
        // Same safety net as the preloaded path — don't let a missed
        // completion callback stall a multi-word sequence.
        setTimeout(finish, safeDurationMs(s));
      });
    });
  } catch (err) {
    logAudioIssue('setup', url, err);
  }
}

// ── Answer feedback SFX (correct/wrong ding) ────────────────────────
// Bundled local files (android/app/src/main/assets/{correct,wrong}.wav),
// not remote URLs — this must play instantly with zero network dependency,
// unlike the exercise audio above. Loaded via the "asset:/" prefix (Android's
// raw AssetManager), NOT android/app/src/main/res/raw — AAPT2's release-build
// resource optimizer (:app:optimizeReleaseResources) silently strips res/raw
// entries that are only ever referenced by a dynamic runtime string (as
// react-native-sound does), even with a res/raw/keep.xml tools:keep entry and
// even from a from-scratch clean build. assets/ isn't processed by AAPT2 at
// all, so there's nothing for that optimizer to strip.
// Kept on separate Sound instances so it never touches activeSound/
// systemPlaying: it must not be interruptible by stopAudio() (submitAnswer
// calls that first, then this) and must not drive the exercise waveform/
// play-icon UI.
let correctSfx: SoundLike | null = null;
let wrongSfx: SoundLike | null = null;

function loadSfx(file: string): SoundLike | null {
  try {
    const SoundModule = require('react-native-sound');
    const Sound = SoundModule.default ?? SoundModule;
    Sound.setCategory('Playback');
    const source = Platform.OS === 'android' ? `asset:/${file}` : file;
    const sound = new Sound(source, Sound.MAIN_BUNDLE, (err: Error | null) => {
      if (err) logAudioIssue('load', source, err);
    });
    return sound as unknown as SoundLike;
  } catch (err) {
    logAudioIssue('setup', file, err);
    return null;
  }
}

// react-native-sound's prepare() is async natively — play() silently no-ops
// if called before it resolves. Load both eagerly at module-import time
// (well before a user can reach a lesson's first exercise) rather than
// lazily on first play, so the very first ding never gets dropped.
correctSfx = loadSfx('correct.wav');
wrongSfx = loadSfx('wrong.wav');

/** Play the short correct/wrong feedback chime. Fire-and-forget. */
export function playFeedbackSound(correct: boolean): void {
  try {
    ensurePlaybackCategory();
    const sfx = correct ? correctSfx : wrongSfx;
    sfx?.stop();
    sfx?.setCurrentTime(0);
    sfx?.play(() => {});
  } catch (err) {
    logAudioIssue('play', correct ? 'correct.wav' : 'wrong.wav', err);
  }
}

/**
 * Returns the duration (seconds) of a URL.
 * Reads from preloaded cache if available; otherwise loads briefly to inspect.
 * Returns 0 on any error.
 */
export async function getAudioDuration(url: string): Promise<number> {
  if (!url) return 0;
  const preloaded = preloadedSounds.get(url) as SoundLike | undefined;
  if (preloaded) {
    return preloaded.getDuration();
  }
  return new Promise<number>(resolve => {
    try {
      const SoundModule = require('react-native-sound');
      const Sound = SoundModule.default ?? SoundModule;
      const s = new Sound(url, '', (err: Error | null) => {
        if (err) { resolve(0); return; }
        const dur = (s as SoundLike).getDuration();
        s.release();
        resolve(dur > 0 ? dur : 0);
      });
    } catch {
      resolve(0);
    }
  });
}

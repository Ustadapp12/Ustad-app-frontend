import * as Sentry from '@sentry/react-native';

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
    try { Sentry.captureException(error, { extra: { url, phase } }); } catch { /* ignore */ }
  } else {
    try { Sentry.captureMessage(`audioPlayer ${phase} failed`, { level: 'warning', extra: { url, detail } }); } catch { /* ignore */ }
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

/** Stop any currently playing audio. */
export function stopAudio(): void {
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

  const preloaded = preloadedSounds.get(url) as SoundLike | undefined;

  if (preloaded) {
    stopActiveSound();
    try {
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

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

export async function playAudioUrl(url: string): Promise<void> {
  if (!url) return;

  const preloaded = preloadedSounds.get(url) as SoundLike | undefined;

  if (preloaded) {
    stopActiveSound();
    try {
      preloaded.setCurrentTime(0);
      preloaded.setSpeed(currentSpeed);
      activeSound = preloaded;
      activeSoundIsPreloaded = true;
      await new Promise<void>(resolve => {
        preloaded.play((success: boolean) => {
          if (!success) logAudioIssue('play', url);
          if (activeSound === preloaded) {
            activeSound = null;
            activeSoundIsPreloaded = false;
          }
          resolve();
        });
      });
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
        s.play((success: boolean) => {
          if (!success) {
            logAudioIssue('play', url);
          }
          s.release();
          if (activeSound === s) {
            activeSound = null;
          }
          resolve();
        });
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

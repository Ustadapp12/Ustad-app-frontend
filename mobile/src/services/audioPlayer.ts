import * as Sentry from '@sentry/react-native';

// Sounds pre-loaded for the active lesson — not released between steps
const preloadedSounds = new Map<string, unknown>();
let activeSoundIsPreloaded = false;
let activeSound: { stop: () => void; release: () => void; play: (cb: (s: boolean) => void) => void; setCurrentTime: (t: number) => void } | null = null;

function stopActiveSound() {
  if (!activeSound) return;
  try {
    activeSound.stop();
    // Don't release pre-loaded sounds — they're reused across steps
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
    Sentry.captureException(error, { extra: { url, phase } });
  } else {
    Sentry.captureMessage(`audioPlayer ${phase} failed`, {
      level: 'warning',
      extra: { url, detail },
    });
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

    await Promise.allSettled(
      urls
        .filter(url => url && !preloadedSounds.has(url))
        .map(
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
  } catch {
    // non-fatal — regular lazy loading is the fallback
  }
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

  const preloaded = preloadedSounds.get(url) as
    | { stop: () => void; release: () => void; play: (cb: (s: boolean) => void) => void; setCurrentTime: (t: number) => void }
    | undefined;

  if (preloaded) {
    stopActiveSound();
    try {
      preloaded.setCurrentTime(0); // rewind to start in case it was played before
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
        activeSound = sound;
        activeSoundIsPreloaded = false;
        sound.play((success: boolean) => {
          if (!success) {
            logAudioIssue('play', url);
          }
          sound.release();
          if (activeSound === sound) {
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

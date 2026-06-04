import * as Sentry from '@sentry/react-native';

let activeSound: { stop: () => void; release: () => void } | null = null;

function stopActiveSound() {
  if (!activeSound) return;
  try {
    activeSound.stop();
    activeSound.release();
  } catch {
    // ignore
  }
  activeSound = null;
}

/**
 * Play remote MP3 using react-native-sound.
 * Silently ignores errors so the UI never shows an audio error alert.
 */
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

export async function playAudioUrl(url: string): Promise<void> {
  if (!url) return;

  try {
    const SoundModule = require('react-native-sound');
    const Sound = SoundModule.default ?? SoundModule;
    Sound.setCategory('Playback');
    stopActiveSound();

    await new Promise<void>((resolve) => {
      const sound = new Sound(url, '', (err: Error | null) => {
        if (err) {
          logAudioIssue('load', url, err);
          resolve();
          return;
        }
        activeSound = sound;
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

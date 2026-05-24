import { Linking } from 'react-native';

/**
 * Play remote MP3. Tries react-native-sound if installed; otherwise opens system handler.
 * Optional: npm install react-native-sound && rebuild for in-app playback.
 */
export async function playAudioUrl(url: string): Promise<void> {
  if (!url) {
    throw new Error('No audio URL');
  }

  try {
    const SoundModule = require('react-native-sound');
    const Sound = SoundModule.default ?? SoundModule;
    Sound.setCategory('Playback');

    await new Promise<void>((resolve, reject) => {
      const sound = new Sound(url, '', (err: Error | null) => {
        if (err) {
          reject(err);
          return;
        }
        sound.play((success: boolean) => {
          sound.release();
          if (success) {
            resolve();
          } else {
            reject(new Error('Playback failed'));
          }
        });
      });
    });
    return;
  } catch {
    const can = await Linking.canOpenURL(url);
    if (!can) {
      throw new Error('Audio URL is not supported on this device');
    }
    await Linking.openURL(url);
  }
}

import { Audio } from 'expo-av';

const preloadedSounds = new Map<string, Audio.Sound>();
let activeSound: Audio.Sound | null = null;
let audioModeReady = false;

async function ensureAudioMode(): Promise<void> {
  if (audioModeReady) return;
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    staysActiveInBackground: false,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
  audioModeReady = true;
}

export async function preloadAudioUrls(urls: string[]): Promise<void> {
  if (!urls.length) return;
  try {
    await ensureAudioMode();
    const pending = urls.filter(u => u && !preloadedSounds.has(u));
    await Promise.allSettled(
      pending.map(async url => {
        try {
          const { sound } = await Audio.Sound.createAsync(
            { uri: url },
            { shouldPlay: false },
          );
          preloadedSounds.set(url, sound);
        } catch {
          // non-fatal
        }
      }),
    );
  } catch {
    // non-fatal
  }
}

export function clearPreloadedAudio(): void {
  if (activeSound) {
    void activeSound.stopAsync().catch(() => {});
    void activeSound.unloadAsync().catch(() => {});
    activeSound = null;
  }
  for (const sound of preloadedSounds.values()) {
    void sound.unloadAsync().catch(() => {});
  }
  preloadedSounds.clear();
}

export function stopAudio(): void {
  if (!activeSound) return;
  void activeSound.stopAsync().catch(() => {});
  activeSound = null;
}

export async function playAudio(url: string): Promise<void> {
  if (!url) return;
  try {
    await ensureAudioMode();
    if (activeSound) {
      await activeSound.stopAsync().catch(() => {});
      await activeSound.unloadAsync().catch(() => {});
      activeSound = null;
    }

    const preloaded = preloadedSounds.get(url);
    if (preloaded) {
      await preloaded.setPositionAsync(0);
      activeSound = preloaded;
      await new Promise<void>(resolve => {
        preloaded.setOnPlaybackStatusUpdate(status => {
          if (status.isLoaded && status.didJustFinish) {
            preloaded.setOnPlaybackStatusUpdate(null);
            if (activeSound === preloaded) activeSound = null;
            resolve();
          }
        });
        preloaded.playAsync().catch(() => { resolve(); });
      });
    } else {
      const { sound } = await Audio.Sound.createAsync({ uri: url });
      activeSound = sound;
      await new Promise<void>(resolve => {
        sound.setOnPlaybackStatusUpdate(status => {
          if (status.isLoaded && status.didJustFinish) {
            sound.setOnPlaybackStatusUpdate(null);
            void sound.unloadAsync().catch(() => {});
            if (activeSound === sound) activeSound = null;
            resolve();
          }
        });
        sound.playAsync().catch(() => {
          void sound.unloadAsync().catch(() => {});
          resolve();
        });
      });
    }
  } catch (e) {
    console.warn('[audioPlayer] playAudio failed:', e);
  }
}

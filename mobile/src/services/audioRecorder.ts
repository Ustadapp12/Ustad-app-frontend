import { Platform, PermissionsAndroid } from 'react-native';
import { setPlaybackBlocked } from './audioPlayer';

type Recorder = {
  startRecorder: (path?: string, audioSets?: Record<string, string | number>) => Promise<string>;
  stopRecorder: () => Promise<string>;
  startPlayer: (uri: string) => Promise<string>;
  stopPlayer: () => Promise<string>;
  addPlayBackListener: (cb: (e: { currentPosition: number; duration: number }) => void) => { remove: () => void };
  removePlayBackListener: () => void;
};

let _recorder: Recorder | null = null;

function getRecorder(): Recorder {
  if (!_recorder) {
    const Mod = require('react-native-audio-recorder-player');
    const Cls = Mod.default ?? Mod;
    _recorder = new Cls() as Recorder;
  }
  return _recorder;
}

export async function requestMicPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'UstadApp needs microphone access to check your recitation.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }
  // iOS — permission is requested automatically on first startRecorder call
  return true;
}

// With no audio settings the library records iOS in Apple Lossless (ALAC),
// stereo, 44.1kHz. Deepgram rejects ALAC outright ("failed to process audio:
// corrupt or unsupported data"), so every iOS recitation failed to score.
// Force mono AAC, which Deepgram accepts and which is also far smaller to
// upload. Android ignores the IOS keys and already defaults to AAC/MPEG4.
//
// Build 20047 used AAC at 16kHz mono with the library's default 128kbps
// bitrate, which AAC can't encode at that rate: iOS refused to start the
// recorder ("Could not start recording"). So the settings are now the most
// standard iOS voice-recording ones, tried in order, every one of them AAC
// (never ALAC). 44.1kHz is the iPhone mic's native rate, so no resampling is
// involved, and the bitrates are well inside AAC's range at that rate. Each
// fallback is only used if iOS refuses the one before it.
const RECORDING_SETTINGS_IOS: Record<string, string | number>[] = [
  { AVFormatIDKeyIOS: 'aac', AVNumberOfChannelsKeyIOS: 1, AVSampleRateKeyIOS: 44100, AVEncoderBitRateKeyIOS: 64000 },
  { AVFormatIDKeyIOS: 'aac', AVNumberOfChannelsKeyIOS: 1, AVSampleRateKeyIOS: 44100 },
  { AVFormatIDKeyIOS: 'aac', AVNumberOfChannelsKeyIOS: 2, AVSampleRateKeyIOS: 44100 },
];

/** Start recording. Returns the file path (used later as audioUri). */
export async function startRecording(): Promise<void> {
  // Silence and lock all reference audio before the mic opens, so a "Hear"
  // tapped just before the mic can't be recorded and scored as the
  // learner's own recitation. Unlocked again in stopRecording().
  setPlaybackBlocked(true);
  try {
    await startRecorderWithReset();
  } catch (e) {
    setPlaybackBlocked(false);
    throw e;
  }
}

async function startRecorderWithReset(): Promise<void> {
  // Android ignores the iOS keys (it records AAC/MPEG4 by default), so it
  // just gets the same settings twice: the second try is the fresh-recorder
  // retry after a stuck-recorder reset, exactly as before.
  const attempts = Platform.OS === 'ios'
    ? RECORDING_SETTINGS_IOS
    : [RECORDING_SETTINGS_IOS[0], RECORDING_SETTINGS_IOS[0]];
  let lastError: unknown;
  for (const settings of attempts) {
    try {
      await getRecorder().startRecorder(undefined, settings);
      return;
    } catch (e) {
      lastError = e;
      // The native recorder can be left thinking it's still recording after
      // an interrupted session (backing out mid-recording, a call cutting
      // in), and every later startRecorder() then throws against that same
      // stuck instance. Release it and drop it before the next try, so each
      // attempt runs against a fresh recorder (getRecorder() rebuilds it).
      console.warn('[audioRecorder] startRecorder failed, resetting and trying next settings:', e);
      const stuck = _recorder;
      _recorder = null;
      if (stuck) {
        await stuck.stopRecorder().catch(() => {});
      }
    }
  }
  throw lastError;
}

/** Stop recording. Returns the local URI of the recorded file. */
export async function stopRecording(): Promise<string> {
  try {
    return await getRecorder().stopRecorder();
  } finally {
    setPlaybackBlocked(false);
  }
}

type PlaybackUpdate = { currentPosition: number; duration: number };

/** Play back a local recording URI. Returns a cleanup function. */
export function playRecording(
  uri: string,
  onProgress: (pos: number, dur: number) => void,
  onEnd: () => void,
): () => void {
  const rec = getRecorder();
  const sub = rec.addPlayBackListener((e: PlaybackUpdate) => {
    onProgress(e.currentPosition / 1000, e.duration / 1000);
    if (e.currentPosition >= e.duration && e.duration > 0) {
      void rec.stopPlayer();
      onEnd();
    }
  });
  void rec.startPlayer(uri);
  return () => {
    sub.remove();
    void rec.stopPlayer().catch(() => {});
  };
}

export async function stopPlayback(): Promise<void> {
  await getRecorder().stopPlayer().catch(() => {});
}

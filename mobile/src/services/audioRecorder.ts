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
const RECORDING_SETTINGS = {
  AVFormatIDKeyIOS: 'aac',
  AVNumberOfChannelsKeyIOS: 1,
  AVSampleRateKeyIOS: 16000,
};

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
  try {
    await getRecorder().startRecorder(undefined, RECORDING_SETTINGS);
  } catch (e) {
    // The native recorder can be left thinking it's still recording after an
    // interrupted session (backing out mid-recording, a call/notification
    // cutting in, etc.) — every subsequent startRecorder() then throws
    // against that same stuck instance, with no in-app way to recover short
    // of a full app restart (which recreates _recorder from scratch, since
    // getRecorder() only builds one the first time it's null). Reproduce
    // that reset here instead of making the user restart the app: release
    // the stuck instance, drop it, and retry once against a fresh one.
    console.warn('[audioRecorder] startRecorder failed, resetting recorder and retrying:', e);
    const stuck = _recorder;
    _recorder = null;
    if (stuck) {
      await stuck.stopRecorder().catch(() => {});
    }
    await getRecorder().startRecorder(undefined, RECORDING_SETTINGS);
  }
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

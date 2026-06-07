import { Platform, PermissionsAndroid } from 'react-native';

type Recorder = {
  startRecorder: (path?: string) => Promise<string>;
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

/** Start recording. Returns the file path (used later as audioUri). */
export async function startRecording(): Promise<void> {
  await getRecorder().startRecorder();
}

/** Stop recording. Returns the local URI of the recorded file. */
export async function stopRecording(): Promise<string> {
  const uri = await getRecorder().stopRecorder();
  return uri;
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

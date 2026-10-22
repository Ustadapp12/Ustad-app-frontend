import { playAudioUrl, pauseAudio, resumeAudio, stopAudio, preloadAudioUrls } from '../../services/audioPlayer';
import { startRecording as startRecordingSvc, stopRecording as stopRecordingSvc } from '../../services/audioRecorder';

// ── Tour-only glow ─────────────────────────────────
// Moved to components/tour/tourGlow.ts: MainTabs, MapScreen and MapScreenV2
// all import TOUR_GLOW, and that one named import was pulling this entire
// screen into the tab bundle at splash. See that file for the full rationale.

// ── Audio helper ───────────────────────────────────────────────────
// Thin wrappers around services/audioPlayer.ts (react-native-sound) that
// preserve the call-site API (`playUrl(url, onDone)` etc.) used throughout
// this file.

// Which exercise is actually on screen right now — a plain module-level
// value, not React state, set as a direct statement during the main
// screen's render (see its own `activeExerciseId = exercise?.ex_id` line)
// rather than from an effect, so it's already correct by the time ANY
// effect (this component's own or a child exercise's) runs afterward.
//
// Reported bug: on a slow device, tapping a "Hear" button queues playback
// that hasn't started by the time the learner gives up waiting and taps
// Next — the several TouchableOpacity/useEffect call sites below have no
// concept of "is this still the exercise being shown," so a still-pending
// playUrl/playUrlSequence call just kept running and played out loud on
// whatever exercise the learner had since moved to (multiple queued taps
// cascading across several later screens). playUrl/playUrlSequence re-check
// this on every step of a sequence and bail the instant it goes stale, and
// the main screen calls stopAudio() the moment the exercise changes so
// anything already mid-playback cuts off immediately too.
//
// The comment above used to claim a staleness re-check here ("bails the
// instant it goes stale") that did not actually exist: it compared
// activeExerciseId to itself with zero async work in between capturing it
// and checking it, so it could never observe a change and was a permanent
// no-op. Removed 2026-08-28 alongside the real fix for a production
// incident this contributed to (several stalled audio loads all surfacing
// minutes later at once, well after the exercises that requested them were
// long gone) — see playToken's comment in services/audioPlayer.ts for the
// root cause and the actual fix. That fix lives at the one choke point every
// play request passes through regardless of caller, which is the only place
// it can be correct; nothing needs re-checking here.
//
// onDone must run UNCONDITIONALLY, every time, including on failure —
// several callers (e.g. HearAndSelect's startPlayback) await it via
// `new Promise(resolve => playUrl(url, resolve))` to sequence multiple
// clips, and a skipped onDone would hang that await forever, stalling the
// rest of the sequence rather than just skipping one stale clip.
let activeExerciseId: string | null = null;

/** Called by LessonSessionScreen during render with the exercise on
 * screen (was a direct assignment before the 2026-10-22 file split). */
export function setActiveExerciseId(id: string | null): void {
  activeExerciseId = id;
}

export async function playUrl(url: string | null | undefined, onDone?: () => void) {
  if (!url) return;
  try {
    await playAudioUrl(url);
  } catch (e) {
    console.warn('[audio] playUrl failed:', e);
  } finally {
    onDone?.();
  }
}

// Play a list of URLs one after another (for segment_audio_urls)
export async function playUrlSequence(urls: string[], onDone?: () => void) {
  const forExercise = activeExerciseId;
  for (const url of urls) {
    if (forExercise !== activeExerciseId) break;
    await playUrl(url);
  }
  onDone?.();
}

// Pre-loads all audio files concurrently then plays them back-to-back with
// the smallest possible gap — used for the "Hear" button in read_and_speak.
export async function playUrlSequenceFast(urls: string[], onDone?: () => void) {
  if (!urls.length) { onDone?.(); return; }
  const forExercise = activeExerciseId;
  try {
    await preloadAudioUrls(urls);
  } catch {}
  // The preload above is its own async gap — re-check here too, not just
  // inside playUrlSequence, since that function captures activeExerciseId
  // fresh at ITS OWN start and would otherwise treat "still current as of
  // right now" as "was still current when this was first requested."
  if (forExercise !== activeExerciseId) { onDone?.(); return; }
  await playUrlSequence(urls, onDone);
}


export async function pauseCurrentAudio() {
  pauseAudio();
}

export async function resumeCurrentAudio() {
  resumeAudio();
}

// ── Audio recording helpers (speak exercises) ──────────────────────
// Backed by services/audioRecorder.ts (react-native-audio-recorder-player).

/** Start recording. */
export async function startRecording(): Promise<void> {
  stopAudio();
  await startRecordingSvc();
}

/**
 * Stop the active recording and return its local file URI.
 * Returns null if nothing was being recorded or if an error occurred.
 */
export async function stopRecording(): Promise<string | null> {
  try {
    const uri = await stopRecordingSvc();
    return uri || null;
  } catch (e) {
    console.warn('[recording] stopRecording error:', e);
    return null;
  }
}

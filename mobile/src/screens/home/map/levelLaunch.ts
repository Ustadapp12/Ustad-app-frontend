import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { learningApi } from '../../../api';
import { captureError } from '../../../services/crashReporter';
import { fetchLevels } from '../../../services/bootCache';
import { loadLessonGroup } from '../../../services/cachedContent';
import type { SurahLevel } from '../../../types/api';
import type { MapNavProp } from '../../../navigation/types';
import { trustedLevels, estimateAyahRange, type Section, type SectionNode } from './mapModel';
import { sortedLevels } from './useMapData';

export type StartPrompt = {
  section: Section; node: SectionNode; groupId: string; ayahFrom: number; ayahTo: number;
} | null;

interface Ctx {
  navigation: MapNavProp;
  startPrompt: StartPrompt;
  lockedSurahPrompt: Section | null;
  setStartPrompt: Dispatch<SetStateAction<StartPrompt>>;
  setRetryNodeId: Dispatch<SetStateAction<string | null>>;
  setNotReadyTap: Dispatch<SetStateAction<{ section: Section; node: SectionNode } | null>>;
  setLockedSurahPrompt: Dispatch<SetStateAction<Section | null>>;
  setFullLevels: Dispatch<SetStateAction<Record<number, SurahLevel[]>>>;
  fetchFirstLevelNow: (surahNumber: number) => Promise<SurahLevel | null>;
  jumpToSurahStart: (surah: number, level?: { groupId: string; levelIdx: number }) => void;
  shakeLockedNode: (nodeId: string) => void;
  suppressFollowRef: MutableRefObject<boolean>;
}

// What happens when a level node on the map is tapped, and the confirm
// buttons on the cards that tap opens (start, retry, start a locked surah).
// Plain handlers, no React hooks: rebuilt each MapScreen render from the
// current state, exactly like the inline functions they were moved from.
export function createLevelLaunchHandlers(ctx: Ctx) {
  const {
    navigation, startPrompt, lockedSurahPrompt, setStartPrompt, setRetryNodeId, setNotReadyTap,
    setLockedSurahPrompt, setFullLevels, fetchFirstLevelNow, jumpToSurahStart, shakeLockedNode,
    suppressFollowRef,
  } = ctx;

  async function handleNodePress(section: Section, node: SectionNode) {
    if (node.status === 'locked') {
      // The "Start {surah}?" offer only makes sense on the surah's own
      // opening node (surahLevelIdx 0, the one the surah's name label sits
      // beside) — that's the one place "you haven't started this surah yet"
      // is actually true. Every OTHER locked node further into a surah is a
      // real sequential gate (finish the previous level first), where the
      // offer would be misleading noise on every single tap. Only the
      // former gets the prompt; plain sequential locks just shake.
      if (node.surahLevelIdx !== 0) { shakeLockedNode(node.id); return; }
      // 275ms matches shakeLockedNode's own animation duration (5 * 55ms) —
      // not exposed as a callback there since that function is shared with
      // other callers that don't want this delay.
      shakeLockedNode(node.id);
      setTimeout(() => setLockedSurahPrompt(section), 275);
      return;
    }
    if (node.status === 'completed') {
      // Always warm the lesson-content cache the instant a completed node is
      // tapped (loadLessonGroup is cache-first over disk — see
      // cachedContent.ts), so if the user does confirm "Retry", LessonSession
      // hits a warm cache instead of the network.
      void loadLessonGroup(node.id).catch(() => {});
      if (!node.resolved) {
        // Assumed-completed (the enrichedSections heuristic guessed this from
        // the surah's first level, with no real per-group data) — verify
        // before trusting it. A surah can be genuinely finished (show the
        // retry prompt) or only partially done and skipped past (this
        // specific node is actually the real next 'available' level) — in
        // that case skip the prompt and start it directly instead.
        try {
          suppressFollowRef.current = true;
          const levels = await learningApi.levels(section.surahNum);
          const sorted = sortedLevels(levels);
          setFullLevels(prev => ({ ...prev, [section.surahNum]: sorted }));
          // node.levelNum is a group index, not an array position — review
          // levels interleave (one after every 2 normal levels), so a later
          // normal level's own levelNum no longer matches its position in
          // the full sequence. Use surahLevelIdx instead of re-deriving a
          // position via section.nodes.findIndex: that array is only this
          // CHAPTER's slice of the surah (a surah can split across a chapter
          // boundary), so its index stopped lining up with sorted/full past
          // the split — surahLevelIdx is computed once from the surah's own
          // complete sequence and survives that split correctly. Routed
          // through trustedLevels first — if sorted's length doesn't match
          // what SECTIONS_DEF expects, surahLevelIdx isn't safe to trust
          // either, so this falls through to "stay put" below instead of
          // navigating to a guessed-wrong group.
          const trustedSorted = trustedLevels(section.surahNum, sorted);
          const real = trustedSorted?.[node.surahLevelIdx];
          if (real && real.status !== 'completed') {
            navigation.navigate('LessonSession', { groupId: real.lesson_group_id, surahName: section.name, surahNumber: section.surahNum, isSpecial: node.isSpecial });
            return;
          }
          if (!real) {
            // trustedLevels rejected this fetch (length mismatch) or this
            // surahLevelIdx simply isn't in it — no real per-node data
            // resolved, so there's no pending id-change for the follow-effect
            // to consume. Un-arm now, same as the catch block below, or this
            // stays armed and silently eats some later, unrelated auto-scroll
            // instead of the one it was actually meant for.
            suppressFollowRef.current = false;
          }
        } catch (e) {
          // Fetch failed — setFullLevels above never ran, so there's no
          // pending id-change for the follow-effect to suppress. Un-arm it
          // now rather than leaving it to silently swallow some later,
          // genuinely unrelated auto-scroll.
          suppressFollowRef.current = false;
          console.warn('[MapScreen] completed-node status verify failed:', e);
          // Fall through and treat it as completed per the heuristic —
          // start_session() already allows (re)starting a "completed" group,
          // so worst case here is just a misleading "Retry" label.
        }
      }
      // Already done — tapping it is just Browse, not intent to redo the
      // lesson. Surface the retry prompt on the map instead of immediately
      // navigating (tap again to dismiss). The node stays 'completed' the
      // whole time; only handleRetryConfirm below actually navigates.
      setNotReadyTap(null);
      setStartPrompt(null);
      setRetryNodeId(prev => (prev === node.id ? null : node.id));
      return;
    }
    setRetryNodeId(null);
    setNotReadyTap(null);
    // Tapping the node whose "start" card is already open closes it. Keyed
    // by surah+levelNum rather than node.id — a 'pending' node's id is a
    // placeholder that gets swapped for the real lesson_group_id the moment
    // fetchFirstLevelNow below resolves it, so node.id itself isn't stable
    // across the two taps a close-by-retapping needs to compare.
    if (startPrompt?.section.surahNum === section.surahNum && startPrompt?.node.levelNum === node.levelNum) {
      setStartPrompt(null);
      return;
    }
    if (node.status === 'pending') {
      suppressFollowRef.current = true;
      const lvl = await fetchFirstLevelNow(section.surahNum);
      if (!lvl) {
        // Nothing resolved, so nothing to suppress. Two things land here: an
        // ordinary network failure, and a surah whose content the backend
        // can't serve yet. They're indistinguishable from the tap's point of
        // view and the honest message is the same either way, so say that
        // instead of leaving the tap looking dead. Needs no list of what's
        // ready: a surah that opens, opens.
        suppressFollowRef.current = false;
        setNotReadyTap({ section, node });
        return;
      }
      setStartPrompt({ section, node, groupId: lvl.lesson_group_id, ayahFrom: lvl.start_ayah, ayahTo: lvl.end_ayah });
      return;
    }
    // Unresolved non-first node — enrichedSections marked this 'available'
    // from the surah's first level alone, so `node.id` here is still the
    // static placeholder, NOT a lesson_group_id the backend would recognise.
    // Resolve the real group before offering to start it. This also settles
    // the status honestly: the level may well already be completed, in which
    // case the retry prompt is the right thing to show, not a start card.
    if (!node.resolved) {
      let real: SurahLevel | undefined;
      try {
        suppressFollowRef.current = true;
        const levels = await fetchLevels(section.surahNum);
        const sorted = sortedLevels(levels);
        setFullLevels(prev => ({ ...prev, [section.surahNum]: sorted }));
        // surahLevelIdx, not levelNum or a section.nodes array position:
        // review levels interleave (levelNum stops matching the full
        // sequence's index), and section.nodes is only this chapter's slice
        // of the surah once it's split across a chapter boundary — see
        // SectionNode.surahLevelIdx, which is computed from the surah's own
        // complete sequence and stays correct in both cases. Routed through
        // trustedLevels first — an untrusted (wrong-length) array makes
        // surahLevelIdx unsafe too, so `real` stays undefined and the
        // no-real-group branch below ("stay put") takes over instead of
        // starting a possibly-wrong lesson.
        real = trustedLevels(section.surahNum, sorted)?.[node.surahLevelIdx];
      } catch (e) {
        // Fetch failed — setFullLevels above never ran, nothing pending to
        // suppress. Un-arm now rather than swallowing a later unrelated scroll.
        suppressFollowRef.current = false;
        console.warn('[MapScreen] start-tap level resolve failed:', e);
      }
      // No real group (fetch failed, or the backend has fewer groups than the
      // static layout drew). Never navigate on a groupId that doesn't exist —
      // say so instead, same as the pending branch above.
      if (!real) {
        // The try block may have succeeded (no exception, so the catch above
        // never ran) while still leaving `real` undefined — e.g. trustedLevels
        // rejecting a length mismatch. suppressFollowRef is still armed from
        // above in that case, with no pending id-change for the follow-effect
        // to consume it against — left set, it silently eats some later,
        // unrelated auto-scroll instead of this (non-)navigation. Un-arm
        // unconditionally here rather than only in the catch block.
        suppressFollowRef.current = false;
        captureError(`handleNodePress: no real group for surah ${section.surahNum} idx ${node.surahLevelIdx}`, {
          surahNumber: section.surahNum, surahLevelIdx: node.surahLevelIdx, path: 'trustedLevels_rejected',
        });
        setNotReadyTap({ section, node });
        return;
      }
      if (real.status === 'locked') { shakeLockedNode(node.id); return; }
      if (real.status === 'completed') { setRetryNodeId(real.lesson_group_id); return; }
      setStartPrompt({
        section, node, groupId: real.lesson_group_id,
        ayahFrom: real.start_ayah, ayahTo: real.end_ayah,
      });
      return;
    }
    const estimated = estimateAyahRange(node.levelNum ?? 1, section.ayahCount, node.isSpecial);
    const ayahFrom = node.startAyah ?? estimated.from;
    const ayahTo = node.endAyah ?? estimated.to;
    setStartPrompt({ section, node, groupId: node.id, ayahFrom, ayahTo });
  }

  // Only reached by the "start" card's confirm button — same shape as
  // handleRetryConfirm below, just for the not-yet-completed path.
  function handleStartConfirm() {
    if (!startPrompt) return;
    const { section, groupId, node } = startPrompt;
    setStartPrompt(null);
    navigation.navigate('LessonSession', { groupId, surahName: section.name, surahNumber: section.surahNum, isSpecial: node.isSpecial });
  }

  // Only reached by the retry-prompt's "Retry" button — the one place a
  // completed node's tap actually navigates (and pays for the exercise fetch).
  function handleRetryConfirm(section: Section, node: SectionNode) {
    setRetryNodeId(null);
    navigation.navigate('LessonSession', { groupId: node.id, surahName: section.name, surahNumber: section.surahNum, isSpecial: node.isSpecial });
  }

  // Only reached by lockedSurahPrompt's "Start Surah" button.
  function handleLockedSurahConfirm() {
    if (!lockedSurahPrompt) return;
    const surah = lockedSurahPrompt.surahNum;
    setLockedSurahPrompt(null);
    jumpToSurahStart(surah);
  }

  return { handleNodePress, handleStartConfirm, handleRetryConfirm, handleLockedSurahConfirm };
}

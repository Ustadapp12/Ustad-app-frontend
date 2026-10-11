import { useCallback, useEffect, useRef, type Dispatch, type MutableRefObject, type RefObject, type SetStateAction } from 'react';
import type { ScrollView } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import type { RecommendedNext, SurahLevel } from '../../../types/api';
import type { MapNavProp, TabParamList } from '../../../navigation/types';
import { SURAH_TO_CHAPTER, SURAH_TO_SEASON, chapterForLevel, trustedLevels, type SectionNode } from './mapModel';

export type PendingJump = { surah: number; groupId?: string | null; levelIdx?: number } | null;
type EnrichedNode = SectionNode & { surahNum: number };

interface Args {
  navigation: MapNavProp;
  recommended: RecommendedNext | null;
  fullLevels: Record<number, SurahLevel[]>;
  chapterIdx: number;
  setChapterIdx: Dispatch<SetStateAction<number>>;
  setChapterResolved: Dispatch<SetStateAction<boolean>>;
  firstActiveNode: EnrichedNode | undefined;
  allEnrichedNodes: EnrichedNode[];
  height: number;
  MAP_H: number;
  loadingPaths: boolean;
  returnedFromLevelTick: number;
  fetchPhase: (phaseIdx: number, currentSurah: number | null) => Promise<void>;
  currentSurahNumRef: MutableRefObject<number | null>;
  scrollRef: RefObject<ScrollView | null>;
  pendingJump: PendingJump;
  setPendingJump: Dispatch<SetStateAction<PendingJump>>;
  appliedRecSurahRef: MutableRefObject<number | null>;
  appliedRecChapterRef: MutableRefObject<number | null>;
  manualChapterRef: MutableRefObject<boolean>;
  pendingRecommendedJumpRef: MutableRefObject<boolean>;
  chapterJumpRef: MutableRefObject<'top' | 'bottom' | null>;
  suppressFollowRef: MutableRefObject<boolean>;
  autoScrolledNodeIdRef: MutableRefObject<string | null>;
}

// Everything that moves the viewport to where the learner should be: the
// recommended level (Home tab press, returning from a lesson, cold start,
// deferred until that surah's levels load), a search pick, and landing after
// a chapter switch. Moved verbatim out of MapScreen, which still owns the
// shared chapter state and refs and passes them in; the effects keep their
// original order relative to each other.
export function useRecommendedJump(args: Args) {
  const {
    navigation, recommended, fullLevels, chapterIdx, setChapterIdx, setChapterResolved,
    firstActiveNode, allEnrichedNodes, height, MAP_H, loadingPaths, returnedFromLevelTick,
    fetchPhase, currentSurahNumRef, scrollRef, pendingJump, setPendingJump, appliedRecSurahRef,
    appliedRecChapterRef, manualChapterRef, pendingRecommendedJumpRef, chapterJumpRef,
    suppressFollowRef, autoScrolledNodeIdRef,
  } = args;

  // Manually triggered "go to the recommended level" jump — same destination
  // the cold-start effects further down settle on (see appliedRecSurahRef/
  // autoScrolledNodeIdRef below), but callable on demand instead of only
  // once per distinct recommendation. Wired to the Home tab's own tabPress
  // below so every tap lands here, even a re-tap while already on this
  // screen — clearing manualChapterRef is what lets it override a chapter
  // the user paged to by hand, which the passive cold-start effects
  // deliberately never do on their own.
  // Which chapter the recommendation actually sits in. The recommendation is a
  // lesson_group_id, and where that group falls inside its surah is only
  // knowable once that surah's levels have been fetched — until then all we
  // can say is "somewhere in this surah", so fall back to the surah's opening
  // chapter. Getting this right matters now that a surah routinely spans
  // several chapters: someone 100 levels into Al-Baqarah must land on the
  // chapter holding level 100, not the one holding level 1.
  const chapterForRecommended = useCallback((surah: number, groupId?: string | null): number => {
    const levels = trustedLevels(surah, fullLevels[surah]);
    const idx = groupId ? (levels?.findIndex(l => l.lesson_group_id === groupId) ?? -1) : -1;
    return idx >= 0 ? chapterForLevel(surah, idx) : (SURAH_TO_CHAPTER[surah] ?? 0);
  }, [fullLevels]);

  const jumpToRecommended = useCallback(() => {
    const surah = recommended?.surah_number;
    const groupId = recommended?.lesson_group_id;
    if (surah == null) return;
    // Whether this surah's real per-level positions are actually known yet.
    // chapterForRecommended silently falls back to the surah's OPENING
    // chapter when they aren't (trustedLevels(surah, fullLevels[surah]) is
    // undefined, or the recommended groupId isn't in it), which is exactly
    // right for "show me this surah" but frequently wrong for "show me this
    // specific level" once a surah spans several chapters. Landing there
    // anyway — as this used to — is what made a deliberate tab-press jump
    // land somewhere different almost every time: whether fullLevels[surah]
    // happened to already be warm in memory at the moment of the tap is
    // unpredictable, so some taps got the real answer and others got the
    // fallback's wrong one, with nothing to reconcile the two once shown.
    const levels = trustedLevels(surah, fullLevels[surah]);
    const idx = groupId ? (levels?.findIndex(l => l.lesson_group_id === groupId) ?? -1) : -1;
    if (!levels || idx < 0) {
      // Don't guess. surahsNeedingFullLevels (above) already guarantees a
      // fetch for this exact surah is in flight whenever it's the
      // recommendation, so just queue the jump to fire for real the moment
      // that data lands (see the effect right after jumpToRecommendedRef)
      // instead of moving the viewport now and hoping something later
      // corrects it.
      pendingRecommendedJumpRef.current = true;
      return;
    }
    pendingRecommendedJumpRef.current = false;
    manualChapterRef.current = false;
    const target = chapterForLevel(surah, idx);
    appliedRecSurahRef.current = surah;
    appliedRecChapterRef.current = target;
    if (target !== chapterIdx) {
      // Cross-chapter: hand off to the pending-jump effect below, which
      // finishes the scroll onto the node itself once the new chapter has
      // laid out. This used to land at the new chapter's top and stop there,
      // which was near enough when the whole curriculum was four chapters —
      // across 159 it usually leaves the recommended node off-screen.
      suppressFollowRef.current = true;
      autoScrolledNodeIdRef.current = null;
      setPendingJump({ surah, groupId });
      setChapterIdx(target);
      return;
    }
    if (!firstActiveNode) return;
    autoScrolledNodeIdRef.current = firstActiveNode.id;
    const targetY = Math.max(0, firstActiveNode.y - height / 2);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: targetY, animated: true });
    });
  }, [recommended?.surah_number, recommended?.lesson_group_id, fullLevels, chapterIdx, firstActiveNode, height,
    // Stable (refs and state setters passed in from MapScreen); listed only so
    // lint can see them, they never change identity.
    appliedRecChapterRef, appliedRecSurahRef, autoScrolledNodeIdRef, manualChapterRef,
    pendingRecommendedJumpRef, scrollRef, setChapterIdx, setPendingJump, suppressFollowRef]);

  // Stable handle on the latest jumpToRecommended, for effects below that
  // must fire ONLY on their own real trigger (a tab press, a level actually
  // ending) — not on every render. jumpToRecommended's own identity churns
  // on nearly every render (firstActiveNode/chapterIdx are both in its
  // deps, and firstActiveNode is a brand-new object every render since
  // enrichedSections/allEnrichedNodes are never memoized), so an effect
  // that lists jumpToRecommended itself as a dependency re-runs constantly
  // rather than on the tick/tabPress it's actually meant to react to. Each
  // such re-run calls jumpToRecommended(), whose first line unconditionally
  // clears manualChapterRef — this was the root cause of chapter arrows (and
  // any other node tap) getting silently snapped back to the recommended
  // node's chapter. Routing through a ref keeps the effects' dependency
  // arrays to just their real trigger while still always calling the
  // latest closure.
  const jumpToRecommendedRef = useRef(jumpToRecommended);
  useEffect(() => { jumpToRecommendedRef.current = jumpToRecommended; }, [jumpToRecommended]);

  // Replays a jump that jumpToRecommended deferred because the recommended
  // surah's real levels hadn't loaded yet (see pendingRecommendedJumpRef's
  // own comment above). Fires once that surah's fullLevels entry actually
  // becomes trusted — jumpToRecommendedRef.current() re-checks everything
  // itself and is a no-op if the flag is already clear, so this is safe to
  // run on every fullLevels change rather than trying to predict the exact
  // one that resolves it.
  useEffect(() => {
    if (!pendingRecommendedJumpRef.current) return;
    jumpToRecommendedRef.current();
  }, [fullLevels, pendingRecommendedJumpRef]);

  // react-navigation fires 'tabPress' every time this tab's own button is
  // pressed, including a re-press while it's already focused — unlike
  // useFocusEffect, which only fires when navigating IN from another tab.
  // That's the behavior asked for: tapping Home always jumps to the
  // recommended level, whether you're switching tabs in or already here.
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      jumpToRecommendedRef.current();
    });
    return unsubscribe;
  }, [navigation]);

  // Re-scroll to the recommended node every time a level session ends, full
  // stop — see returnedFromLevelTick's own comment above for why the
  // id-change-only scroll-follow effect further below isn't enough on its
  // own. Skips tick 0 (the state's initial value, never an actual return).
  // jumpToRecommended is safe to call unconditionally here: it already no-ops
  // when there's no recommended surah, and already handles the cross-chapter
  // case (finishing a chapter's last level) the same way a manual Home-tab
  // tap does. Depends ONLY on the tick — see jumpToRecommendedRef's own
  // comment above for why jumpToRecommended itself can't sit in this array.
  useEffect(() => {
    if (returnedFromLevelTick === 0) return;
    jumpToRecommendedRef.current();
  }, [returnedFromLevelTick]);

  // Jump to a surah's opening level and put it on screen — shared by the
  // search-confirm flow (below) AND by confirming "Start {surah}?" after
  // tapping a locked node on the map itself (see lockedSurahPrompt/
  // handleLockedSurahConfirm). One function, one behavior, regardless of
  // where the surah was picked from. Nothing to unlock any more — every
  // surah is open — so this is purely "put that surah's opening level on
  // screen," plus a prefetch of its season so the node resolves a real
  // status rather than sitting on the pending placeholder.
  function jumpToSurahStart(surah: number, level?: { groupId: string; levelIdx: number }) {
    void fetchPhase(SURAH_TO_SEASON[surah] ?? 0, currentSurahNumRef.current);
    manualChapterRef.current = true;
    pendingRecommendedJumpRef.current = false;
    suppressFollowRef.current = true;
    autoScrolledNodeIdRef.current = null;
    const target = chapterForLevel(surah, level?.levelIdx ?? 0);
    setChapterIdx(prev => (prev === target ? prev : target));
    // No groupId: the target is whichever node is this surah's first level.
    setPendingJump({ surah, groupId: level?.groupId ?? null, levelIdx: level?.levelIdx });
  }

  // Search-jump: land on a surah picked from SearchSurahsScreen.
  // route.params.jumpToSurah is set once by that screen's confirm (see
  // navigation/types.ts, TabParamList.Map) and cleared here immediately so it
  // never re-fires on a later focus.
  const mapRoute = useRoute<RouteProp<TabParamList, 'Map'>>();
  useEffect(() => {
    const surah = mapRoute.params?.jumpToSurah;
    if (surah == null) return;
    const groupId = mapRoute.params?.jumpToGroupId;
    const levelIdx = mapRoute.params?.jumpToLevelIdx;
    navigation.setParams({ jumpToSurah: undefined, jumpToGroupId: undefined, jumpToLevelIdx: undefined });
    jumpToSurahStart(surah, groupId != null && levelIdx != null ? { groupId, levelIdx } : undefined);
  }, [mapRoute.params?.jumpToSurah]);

  // Finishes whichever jump is pending (search, or a cross-chapter
  // recommendation) once its target node actually exists. Both the chapter
  // switch and the fetch that resolves a node's real id are async, so rather
  // than guessing when they've landed this simply re-checks until the node is
  // there — the node's own presence is the readiness test, since it can only
  // exist once the right chapter has laid out. Cheap: allEnrichedNodes is
  // already recomputed every render.
  useEffect(() => {
    if (!pendingJump) return;
    const { surah, groupId, levelIdx } = pendingJump;
    // A recommendation targets one specific group; a search targets the
    // surah's opening level. The fallback also covers a group whose real id
    // hasn't resolved yet: by position when known, so a jump to a later
    // level doesn't fall back to (and settle on) the surah's first node.
    const node = (groupId ? allEnrichedNodes.find(n => n.id === groupId) : undefined)
      ?? allEnrichedNodes.find(n => n.surahNum === surah && n.surahLevelIdx === (levelIdx ?? 0));
    if (!node) return;
    setPendingJump(null);
    autoScrolledNodeIdRef.current = node.id;
    const targetY = Math.max(0, node.y - height / 2);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: targetY, animated: true });
    });
  }, [pendingJump, allEnrichedNodes, height, autoScrolledNodeIdRef, scrollRef, setPendingJump]);

  // Keep the viewport following the recommended node (formerly framed as
  // "following Lumo" — Lumo no longer stands beside it, but the
  // scroll-to-reveal behavior is unchanged):
  // on first load (opening the map fresh)
  // and again any time firstActiveNode moves to a different node (finishing
  // a level advances the recommendation to N+1, a pull-to-refresh may also
  // reveal a new node), scroll so that node is in view instead of leaving
  // the user to hunt for it starting from the very top of the map.
  useEffect(() => {
    if (loadingPaths || !firstActiveNode) return;
    // A chapter switch owns the scroll position for this commit — the jump
    // effect below is about to send the viewport to the top or bottom, and
    // paging into the chapter Lumo happens to stand in shouldn't fight it.
    // Recording the node as already-handled means a later genuine change
    // (finishing a level) still scrolls normally.
    if (chapterJumpRef.current) {
      autoScrolledNodeIdRef.current = firstActiveNode.id;
      return;
    }
    // Same idea, for id changes caused by a fetch resolving a node's real
    // data rather than by the recommendation itself advancing — see
    // suppressFollowRef's own comment for the full list of triggers.
    if (suppressFollowRef.current) {
      suppressFollowRef.current = false;
      autoScrolledNodeIdRef.current = firstActiveNode.id;
      return;
    }
    if (autoScrolledNodeIdRef.current === firstActiveNode.id) return;
    autoScrolledNodeIdRef.current = firstActiveNode.id;
    const targetY = Math.max(0, firstActiveNode.y - height / 2);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: targetY, animated: true });
    });
  }, [firstActiveNode?.id, loadingPaths, height, autoScrolledNodeIdRef, chapterJumpRef, scrollRef, suppressFollowRef]);

  // Land the viewport after a chapter switch. Runs after the new chapter has
  // laid out, so MAP_H is already the new chapter's height.
  // Not animated: this is a change of place, not a move within one.
  useEffect(() => {
    const land = chapterJumpRef.current;
    if (!land) return;
    chapterJumpRef.current = null;
    const targetY = land === 'top' ? 0 : Math.max(0, MAP_H - height);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: targetY, animated: false });
    });
  }, [chapterIdx, MAP_H, height, chapterJumpRef, scrollRef]);

  // Follow the backend's recommended-next into its chapter. Covers the cold
  // start (the useState seed above had no cached recommendation to read) and
  // the moment finishing a chapter's last level advances the recommendation
  // into the next one. Never overrides a chapter the user paged to by hand —
  // at that point where they are is their choice.
  //
  // Keyed on the resolved CHAPTER as well as the surah, not the surah alone.
  // On a cold start that surah's levels usually haven't arrived yet, so the
  // first answer available is only "somewhere in this surah" (its opening
  // chapter); once they land, a recommendation partway through a long surah
  // resolves to its real chapter and has to be corrected. Keyed on the surah
  // alone, that correction never happened — which across 159 chapters could
  // leave someone dozens of chapters from where they actually left off.
  const recommendedChapter = recommended?.surah_number != null
    ? chapterForRecommended(recommended.surah_number, recommended.lesson_group_id)
    : null;
  useEffect(() => {
    const surah = recommended?.surah_number;
    if (loadingPaths) return;
    if (surah == null) { setChapterResolved(true); return; }
    const target = recommendedChapter ?? 0;
    if (appliedRecSurahRef.current === surah && appliedRecChapterRef.current === target) {
      setChapterResolved(true);
      return;
    }
    appliedRecSurahRef.current = surah;
    appliedRecChapterRef.current = target;
    if (!manualChapterRef.current) {
      setChapterIdx(prev => (prev === target ? prev : target));
    }
    setChapterResolved(true);
  }, [recommended?.surah_number, recommendedChapter, loadingPaths,
    appliedRecChapterRef, appliedRecSurahRef, manualChapterRef, setChapterIdx, setChapterResolved]);

  return { jumpToSurahStart };
}

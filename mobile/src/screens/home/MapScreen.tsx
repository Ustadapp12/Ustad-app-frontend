import React, { useRef, useEffect, useState, useMemo, useCallback, useReducer } from 'react';
import { View, Text, Animated, useWindowDimensions, Image, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoadingRing } from '../../components/LoadingSpinner';
import LoadingStatusText from '../../components/LoadingStatusText';
import { useAuthStore } from '../../store/authStore';
import { setCrashContext, addBreadcrumb, captureError } from '../../services/crashReporter';
import { levelStars } from '../../utils/stars';
import StreakFrozenModal from '../../components/StreakFrozenModal';
import AuthRequiredModal from '../../components/AuthRequiredModal';
import StartSurahModal from '../../components/StartSurahModal';
import { isGuest } from '../../utils/guest';
import { getCachedRecommended, subscribeRecommended, fetchLevels } from '../../services/bootCache';
import { setTourOffered, wasTourOffered } from '../../utils/storage';
import { useTourStore } from '../../store/tourStore';
import TourOfferModal from '../../components/tour/TourOfferModal';
import type { MapNavProp } from '../../navigation/types';
import { GRASS_FALLBACK, type NodeStatus, type SectionNode, type Section, CHAPTER_COUNT, SURAH_TO_CHAPTER, trustedLevels, CHAPTER_SEASON_INDICES, stageToNodeStatus, formatAyahRange, estimateAyahRange, type TagPlacement, buildMapModel } from './map/mapModel';
import { makeStyles } from './map/mapStyles';
import { SurahLabel } from './map/components/SurahLabel';
import { MapNode } from './map/components/MapNode';
import { LevelActionCard } from './map/components/LevelActionCard';
import { LumaFloat } from './map/components/LumaFloat';
import { PullRefreshIndicator } from './map/components/PullRefreshIndicator';
import { LoadingBar } from './map/components/LoadingBar';
import MapBackground from './map/components/MapBackground';
import MapHud from './map/components/MapHud';
import MapChapterEnd from './map/components/MapChapterEnd';
import FeedbackButton from './map/components/FeedbackButton';
import { useMapData, sortedLevels } from './map/useMapData';
import { useRecommendedJump } from './map/useRecommendedJump';
import { createLevelLaunchHandlers } from './map/levelLaunch';
import { useStreakFrozenPopup } from './map/useStreakFrozenPopup';
import { useFocusedLoop } from '../../hooks/useFocusedLoop';

interface Props { navigation: MapNavProp }

// ── Main screen ───────────────────────────────────────────────────
export default function MapScreen({ navigation }: Props) {
  // Per-mount-unique so SVG pattern ids below never collide with a previous
  // mount's — react-native-svg mis-resolves url(#id) refs when the same id
  // exists more than once at once, which happens on remount (leave the map,
  // come back) since tileIdx alone always restarts at 0. Random rather than
  // an incrementing counter: a counter only guards against collisions within
  // one JS engine lifetime — if the JS context itself ever gets recreated
  // while stale native SVG views haven't fully torn down yet (more of a risk
  // under real-device memory pressure than in an emulator), a counter would
  // restart at 1 and collide with the app's own earlier mount. Random has no
  // such reset point.
  const mapInstanceId = useRef(Math.random().toString(36).slice(2)).current;
  const insets = useSafeAreaInsets();
  // Three narrow selectors, not the whole store: a whole-store subscription
  // re-rendered this (the heaviest screen) on every unrelated auth change.
  const user = useAuthStore(s => s.user);
  const learning = useAuthStore(s => s.learning);
  const refreshLearning = useAuthStore(s => s.refreshLearning);
  // Never earned any XP yet = never actually completed a level (guests
  // included — their XP is computed the same way, just unbanked). Drives
  // "Begin here" vs "Continue here" on the recommended node's tag below.
  const hasAnyProgress = (learning?.xp_total ?? 0) > 0;
  // Guest streak/XP are never banked (see utils/guest.ts) — the HUD pills
  // show dashes instead of the backend's computed-but-not-saved numbers, and
  // tapping either pitches account creation instead of opening the real
  // Streak page.
  const isGuestUser = isGuest(user);
  const [guestPromptVisible, setGuestPromptVisible] = useState(false);
  // Stable so the memoized MapHud doesn't re-render on every MapScreen render.
  const showGuestPrompt = useCallback(() => setGuestPromptVisible(true), []);
  // Stable handle for the memoized MapChapterEnd: always calls the latest
  // goToChapter (a plain function redeclared every render) without changing
  // identity, so the chapter-end signs don't re-render on every map render.
  const goToChapterRef = useRef(goToChapter);
  goToChapterRef.current = goToChapter;
  const goToChapterStable = useCallback(
    (next: number, land: 'top' | 'bottom') => goToChapterRef.current(next, land), [],
  );
  const { width, height } = useWindowDimensions();
  // Forces a re-render when prefetchAll()'s recommendedNext() resolves in the
  // background (it's fire-and-forget, so nothing else triggers one) — without
  // this, Lumo's position can go stale until some unrelated state change
  // happens to re-render the screen.
  const [, forceRecommendedTick] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeRecommended(() => forceRecommendedTick()), []);
  const [frozenPopupVisible, setFrozenPopupVisible] = useStreakFrozenPopup(learning);
  // ── Which chapter (3-season slice) is laid out right now ──────────
  // Seeded from the boot cache so a warm start renders the right chapter on
  // the very first frame; corrected by the resolve effect below when the
  // recommendation only lands after a network round-trip. Paging with the
  // signs at the top/bottom of the map sets it directly.
  const [chapterIdx, setChapterIdx] = useState(() => {
    const surah = getCachedRecommended()?.surah_number;
    return surah != null ? (SURAH_TO_CHAPTER[surah] ?? 0) : 0;
  });
  // False only across a cold start where the recommendation wasn't cached
  // yet when chapterIdx was seeded above — set true once the resolve effect
  // below has confirmed (or corrected) which chapter that recommendation
  // actually lands in. Keeps the loading overlay up until then, so a
  // cold-start correction jumps chapters behind the scrim instead of
  // flashing the wrong chapter's map first.
  const [chapterResolved, setChapterResolved] = useState(() => getCachedRecommended() != null);
  // Last recommended surah the chapter was auto-moved for — so a changing
  // recommendation (finishing the last level of a chapter) follows the user
  // forward exactly once per change, rather than on every re-render.
  const appliedRecSurahRef = useRef<number | null>(null);
  // Alongside it: the chapter that recommendation resolved to when it was
  // applied. A mid-surah recommendation's chapter is only knowable once that
  // surah's levels land, so the same surah can legitimately resolve to a
  // different chapter a moment later and need re-applying.
  const appliedRecChapterRef = useRef<number | null>(null);
  // Set once the user pages by hand. From then on the map stays where they
  // put it for the rest of the session instead of being yanked back to the
  // recommendation — a fresh launch re-seeds from the cache above, which is
  // what makes "open the app, land where I am" still true.
  const manualChapterRef = useRef(false);
  // Set by jumpToRecommended when it's asked to jump before the recommended
  // surah's real per-level positions are known (fullLevels[surah] not yet
  // trusted) — see jumpToRecommended's own comment for why it now refuses to
  // guess in that case. The effect right after jumpToRecommendedRef watches
  // for that data landing and replays the jump for real once it does, so a
  // tab-press during the loading window still ends up somewhere, just not
  // somewhere wrong.
  const pendingRecommendedJumpRef = useRef(false);
  // Where a chapter switch should land the viewport, consumed by the
  // chapter-jump effect. Forward reads as continuing the journey, so it opens
  // at the top; back returns you to the end of the chapter you came from.
  const chapterJumpRef = useRef<'top' | 'bottom' | null>(null);
  const M = useMemo(() => buildMapModel(width, height, chapterIdx), [width, height, chapterIdx]);
  const styles = useMemo(() => makeStyles(M), [M]);
  const { S, SL, SB } = styles;
  const {
    MAP_W, MAP_H, sc, NODE_SIZE, TOP_MARGIN, BASE_SECTIONS, comingSoonY, AYAH_PILLS, SURAH_LABELS,
    ACTION_CARD_W, ACTION_CARD_H, NODE_TAG_W,
  } = M;
  // Beside the node — level with it (not above, like the old retry bubble),
  // on whichever side of the road actually has room. "Parallel to the node"
  // always: same vertical center as the node, never stacked over it. The
  // card's fixed height means this centers exactly, not an approximation.
  function actionCardPosition(node: SectionNode): { left: number; top: number } {
    const margin = sc(14);
    const spaceRight = MAP_W - (node.x + NODE_SIZE + margin + ACTION_CARD_W);
    const left = spaceRight >= 0
      ? node.x + NODE_SIZE + margin
      : Math.max(sc(8), Math.min(MAP_W - ACTION_CARD_W - sc(8), node.x - margin - ACTION_CARD_W));
    const top = node.y + NODE_SIZE / 2 - ACTION_CARD_H / 2;
    return { left, top };
  }

  // Where the "Begin/Continue here" tag goes — always centered directly
  // above the node (2026-09-03: "the continue button should be above the
  // node, dont change distance between the nodes"). Node layout/spacing is
  // untouched; this only repositions the tag relative to its own node.
  //
  // This used to prefer beside-the-node (right, then left) and only fall
  // back to above when a surah-name scroll blocked both sides — the sc(14)
  // gap nodeTagWrapAbove reserves above the node already clears that
  // scroll's own top edge (sc(8) above the node) in every case, which is
  // exactly why "above" was safe to use as that fallback; going there
  // unconditionally now carries the same guarantee, so the label-collision
  // math the beside-based version needed no longer applies.
  function nodeTagPlacement(): TagPlacement {
    return { left: Math.round((NODE_SIZE - NODE_TAG_W) / 2), alignItems: 'center', above: true };
  }

  // ── Guided tour ──────────────────────────────────────────────────
  // Offered once, on a first-time user's first sight of the map. Declining
  // leaves them here with Level 1 already in reach, which is the point of
  // asking rather than imposing.
  // Lives in the tour store, not local state: the overlay that can re-open
  // this offer (hardware back on step 1) is hosted in MainTabs now, since
  // only a sibling of Tab.Navigator can paint over the tab bar.
  const tourOfferVisible = useTourStore(s => s.offerVisible);
  const setTourOfferVisible = useTourStore(s => s.setOfferVisible);
  const startTour = useTourStore(s => s.start);

  function handleAcceptTour() {
    setTourOfferVisible(false);
    void setTourOffered();
    // TourOfferModal is a native Android dialog and is still tearing itself
    // down for a beat after `visible` flips to false, during which it keeps
    // eating touches meant for whatever comes next. Waiting out its close
    // animation before starting the tour avoids that overlap. (The tour
    // overlay itself is no longer a Modal, but this offer still is.)
    setTimeout(() => {
      startTour();
    }, 350);
  }

  function handleDeclineTour() {
    setTourOfferVisible(false);
    void setTourOffered();
  }

  const {
    fullLevels, setFullLevels, firstLevel, loadingPaths, fetchingSurah, refreshing,
    handleRefresh, fetchPhase, fetchFirstLevelNow,
    currentSurahNumRef, returnedFromLevelTick,
  } = useMapData(learning);
  // Gates the map visibility: true only when we know which chapter to show
  // AND the initial node data has loaded (preventing SVG from appearing before nodes are ready).
  const nodesReady = chapterResolved && !loadingPaths;
  // The node whose "couldn't open that" message is currently showing (null =
  // none) — set when a tap fails to resolve a real lesson to open.
  const [notReadyTap, setNotReadyTap] = useState<{ section: Section; node: SectionNode } | null>(null);
  // "Start {surah}?" confirm after tapping a LOCKED node on the map itself —
  // same offer and same jumpToSurahStart() destination as picking that surah
  // from search, just reached from the map directly instead of requiring a
  // detour through the search screen. A locked node only ever means "not
  // this level yet, but the surah itself is open" (every surah is open from
  // the start — see jumpToSurahStart's own comment), so redirecting to that
  // surah's real opening level is always a valid, honest offer rather than a
  // dead-end shake.
  const [lockedSurahPrompt, setLockedSurahPrompt] = useState<Section | null>(null);
  // A jump waiting on a chapter switch to finish. groupId targets one specific
  // level (the recommendation); null means the surah's opening level (search).
  // Consumed by the pending-jump effect further down, which does the scroll
  // once the target node exists.
  const [pendingJump, setPendingJump] = useState<{ surah: number; groupId?: string | null; levelIdx?: number } | null>(null);
  // Which completed node's "retry?" prompt is currently showing on the map
  // (null = none). Tapping a completed node no longer navigates straight
  // into LessonSession — that's what triggers the expensive exercise-build
  // fetch — it just surfaces this prompt; only confirming pays that cost.
  const [retryNodeId, setRetryNodeId] = useState<string | null>(null);
  // "Start a new level" prompt for a fresh (non-completed) node tap — the
  // counterpart to retryNodeId above. Carries the real lesson_group_id and
  // ayah range resolved at tap time rather than read back off `node` at
  // render time, because a 'pending' node's own fields are still empty until
  // fetchFirstLevelNow resolves them (see handleNodePress).
  const [startPrompt, setStartPrompt] = useState<{
    section: Section; node: SectionNode; groupId: string; ayahFrom: number; ayahTo: number;
  } | null>(null);
  // Scrolling the map means you're done with an open level card — it's
  // anchored to a node you're now scrolling away from, and the ✕ was its
  // only way out. Tapping a different node already swaps cards (see
  // handleNodePress), so this only covers the drag case. Both setters are
  // no-ops when nothing is open: useState bails out on an unchanged value,
  // so this costs nothing on an ordinary scroll.
  const dismissActionCards = useCallback(() => {
    setRetryNodeId(null);
    setStartPrompt(null);
    setNotReadyTap(null);
  }, []);
  // Pull-to-refresh state, and the scroll handle + last-auto-scrolled node id
  // used to keep the viewport following wherever Lumo currently stands.
  const scrollRef = useRef<ScrollView>(null);
  const autoScrolledNodeIdRef = useRef<string | null>(null);
  // Set right before any fetch that resolves a node's real id/status from a
  // placeholder (tapping an unresolved node, checking a season gate's
  // eligibility, confirming a season unlock, paging into a new chapter) —
  // every one of those can incidentally change firstActiveNode's resolved
  // id as a side effect of data that just became real, which is NOT the
  // same thing as the backend's recommendation actually advancing. Without
  // this, the follow-effect below treated any id change as "go there now,"
  // so tapping an ordinary node (or unlocking a season, or paging chapters)
  // could yank the viewport back to the recommended node mid-tap — reported
  // 2026-09-03 as "every button on the map takes me to recommended_next."
  // Consumed (reset to false) the first time the follow-effect actually
  // sees an id change, same one-shot pattern chapterJumpRef already uses.
  const suppressFollowRef = useRef(false);

  // Gated on the map having actually finished loading, not just on mount:
  // the offer used to appear while the first levels fetch was still in
  // flight, so accepting it started the tour over S.loadingOverlay rather
  // than over the real map. That overlay is opaque enough on its own that
  // the tour's dim on top of it read as a flat black screen with no map in
  // it. loadingPaths only ever goes true→false, so this still fires once.
  useEffect(() => {
    if (loadingPaths) return;
    void (async () => {
      if (await wasTourOffered()) return;
      setTourOfferVisible(true);
    })();
  }, [loadingPaths, setTourOfferVisible]);

  // If learning is still null when this screen becomes active (hydrate's
  // retries exhausted, or a stale session), nudge one refresh rather than
  // leaving the HUD stuck on the "not loaded" placeholder indefinitely.
  // Self-limiting: learning is only ever nulled at logout.
  useEffect(() => {
    if (!learning) void refreshLearning({ force: true });
  }, [learning, refreshLearning]);


  // Immersive mode is now applied app-wide from RootNavigator (once, at
  // mount) rather than toggled per-screen here — see that file. Map no
  // longer needs its own focus/blur toggle.


  // Enrich base layout with live backend statuses and real ayah ranges
  const enrichedSections = BASE_SECTIONS.map(section => {
    const full = trustedLevels(section.surahNum, fullLevels[section.surahNum]);
    const first = firstLevel[section.surahNum];
    return {
      ...section,
      nodes: section.nodes.map((node) => {
        // Index by the node's stable per-surah position, NOT its position in
        // this chapter-local nodes array — a surah split across a chapter
        // boundary (see SectionNode.surahLevelIdx) means that array position
        // no longer lines up with full's real backend order past the split.
        const group = full?.[node.surahLevelIdx];
        if (group) {
          return { ...node, id: group.lesson_group_id, status: stageToNodeStatus(group.status), stars: levelStars(group), startAyah: group.start_ayah, endAyah: group.end_ayah, isSpecial: group.is_special, resolved: true };
        }
        if (node.surahLevelIdx === 0 && first) {
          return { ...node, id: first.lesson_group_id, status: stageToNodeStatus(first.status), stars: levelStars(first), startAyah: first.start_ayah, endAyah: first.end_ayah, isSpecial: first.is_special, resolved: true };
        }
        if (node.surahLevelIdx === 0) {
          // First level of a surah is never actually locked server-side —
          // just not confirmed yet. Tappable; see handleNodePress.
          return { ...node, status: 'pending' as NodeStatus, resolved: false };
        }
        // Later levels of a surah whose first level reads 'completed' but
        // whose full levels haven't arrived yet (surahsNeedingFullLevels'
        // backfill below is fetching them). Shown as 'available': open,
        // tappable, no gold, no stars.
        //
        // This used to guess 'completed' with a flat 3 stars, and that guess
        // is not allowed to exist. The map is the user's record of their own
        // work, and a node claiming three gold stars for a level they never
        // played misjudges them — the one failure mode here that isn't
        // merely cosmetic. 'available' can only ever be wrong in the
        // harmless direction: it offers a level the user may have already
        // finished, it never credits them with one they haven't.
        //
        // resolved:false marks it as unconfirmed either way, and
        // handleNodePress resolves the real group (id AND status) from the
        // backend before it will navigate — which is also what keeps this
        // safe, since an unresolved node's `id` is still the static
        // placeholder (`${surahNum}_${n}`), not a real lesson_group_id.
        if (first?.status === 'completed') {
          return { ...node, status: 'available' as NodeStatus, stars: 0, resolved: false };
        }
        return { ...node, resolved: false }; // stays computeLayout's default 'locked' — a real gate
      }),
    };
  });

  // NOTE: seasons no longer gate anything. Every surah on the map is open from
  // the start; the sequential unlock seasons used to enforce stopped being a
  // real barrier once search could jump to any surah on demand, so keeping it
  // only meant friction for people who hadn't found search. The one genuine
  // lock left is per-level progress WITHIN a surah (the backend's own 'locked'
  // status). Season signs, slots and chapter rhythm are untouched — the signs
  // are just scenery now.
  // Page to another chapter. Purely a change of which slice of the journey is
  // laid out — it unlocks nothing and gates nothing, so it's allowed in both
  // directions at any time. Any open on-map prompt is dismissed first, since
  // it belongs to a node that's about to stop existing.
  function goToChapter(next: number, land: 'top' | 'bottom') {
    if (next < 0 || next >= CHAPTER_COUNT || next === chapterIdx) return;
    manualChapterRef.current = true;
    // A deferred "jump to recommended" (see jumpToRecommended/
    // pendingRecommendedJumpRef) auto-replays itself the moment the
    // recommended surah's data lands, with no further tap needed — right
    // when the tab was pressed, but wrong once the user has since paged away
    // by hand, which would otherwise get silently overridden a moment later.
    pendingRecommendedJumpRef.current = false;
    chapterJumpRef.current = land;
    // chapterJumpRef only covers the follow-effect's very next run (it's
    // cleared by the landing effect once the new chapter's top/bottom scroll
    // fires, which happens before the fetchPhase calls below have actually
    // resolved). Without this, a node's real id/status landing a moment
    // later still counted as "the recommendation moved" and yanked the
    // viewport straight back to it — the reported "Next Stage always takes
    // me to Continue here" bug. This flag stays armed until that real
    // resolution lands, whenever that turns out to be.
    suppressFollowRef.current = true;
    setNotReadyTap(null);
    setRetryNodeId(null);
    setStartPrompt(null);
    setChapterIdx(next);
    // Pull the first levels for the seasons we're paging into so their nodes
    // resolve real ids/statuses instead of sitting 'pending'. fetchPhase
    // de-dupes against fetchedPhasesRef, so re-entering a chapter is free.
    for (const seasonIdx of CHAPTER_SEASON_INDICES[next] ?? []) {
      void fetchPhase(seasonIdx, currentSurahNumRef.current);
    }
  }

  // Nothing overrides a node's own status any more. Season gating used to live
  // here, then a content-readiness gate replaced it; both are gone. Every
  // surah of the Quran is reachable and openable, and the only thing that
  // locks a node is the backend's own per-level progression within its surah.
  //
  // Readiness is handled where it can be answered truthfully — at the tap, off
  // what the backend actually returns (see handleNodePress) — rather than
  // predicted here from a list. That way the map needs no change as content
  // lands: a surah that opens, opens.
  const gatedSections = enrichedSections;

  const allEnrichedNodes = gatedSections.flatMap(s => s.nodes.map(n => ({ ...n, surahNum: s.surahNum })));
  // Multiple surahs' first levels can be simultaneously unlocked (no
  // cross-surah gate), so more than one node can read 'current'/'available'
  // at once — trust the backend's own "start here" answer instead of
  // scanning node statuses, which previously landed Luma on whichever
  // already-fetched surah happened to be last in array order rather than
  // the actual next-up level.
  const recommended = getCachedRecommended();
  let firstActiveNode: (typeof allEnrichedNodes)[number] | undefined =
    recommended ? allEnrichedNodes.find(n => n.id === recommended.lesson_group_id) : undefined;
  if (!firstActiveNode && recommended) {
    // Fallback for when that surah's real per-group ids haven't landed yet
    // (only its first level has, so every other node still carries a static
    // placeholder id). This used to take the surah's FIRST node outright,
    // which put "Continue here" on an already-golden completed node — the
    // one place the tag must never point. Take the first node that's
    // actually startable instead, and only fall back to a completed one if
    // the whole surah reads done.
    const inSurah = allEnrichedNodes.filter(n => n.surahNum === recommended.surah_number);
    firstActiveNode =
      inSurah.find(n => n.status === 'current' || n.status === 'available' || n.status === 'pending')
      ?? inSurah.find(n => n.status !== 'completed')
      ?? inSurah[0];
  }

  // The mount effect above resolves `currentSurah` from getCachedRecommended(),
  // which is still null whenever MapScreen mounts before boot's deliberately
  // un-awaited prefetchAll() has landed the recommendation — a plain race, and
  // the one that produced the reported "levels 7 and 8 are done but 9 never
  // opened" map. In that race the mount effect full-fetches the levels of the
  // WRONG surah (mvp_surah_numbers[0]) and nothing ever corrects it:
  // subscribeRecommended only forces a re-render, it re-runs no fetch. The
  // surah actually on screen is then left with only its first level, and
  // enrichedSections' no-full-data heuristic takes over — which fakes EVERY
  // later normal node as completed with a flat 3 stars (hence a node showing
  // gold ★★★ the user had never played) while leaving every review node at
  // its baseline 'locked' (hence the next level never opening).
  //
  // Same heuristic, same symptom, for any other already-finished surah in the
  // visible chapter. So: pull real levels for the recommended surah and for
  // every visible surah whose first level reads 'completed', replacing the
  // guesses with backend truth. fetchLevels() is cache-first with in-flight
  // dedup (and writes through to the disk cache), so a surah already loaded
  // by any other path costs nothing here.
  const recommendedSurah = recommended?.surah_number ?? null;
  const surahsNeedingFullLevels = BASE_SECTIONS
    .map(sec => sec.surahNum)
    .filter(n => !fullLevels[n] && (n === recommendedSurah || firstLevel[n]?.status === 'completed'))
    .join(',');
  useEffect(() => {
    if (!surahsNeedingFullLevels) return;
    let cancelled = false;
    void (async () => {
      for (const surahNum of surahsNeedingFullLevels.split(',').map(Number)) {
        try {
          const levels = await fetchLevels(surahNum);
          if (cancelled) return;
          setFullLevels(prev => ({ ...prev, [surahNum]: sortedLevels(levels) }));
        } catch (e) {
          // Leave the heuristic in place for this surah and stop retrying it
          // this pass — the key below is unchanged by a failure, so this
          // effect won't re-fire in a loop over it.
          console.warn(`[MapScreen] full-levels backfill failed for surah ${surahNum}:`, e);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [surahsNeedingFullLevels, setFullLevels]);


  const goldAnim  = useRef(new Animated.Value(0)).current;
  // One shared value (mirrors goldAnim above) driving a shake on
  // whichever locked node was just tapped — the tap itself is a no-op
  // otherwise, which reads as the app ignoring you rather than as "locked."
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const [shakingNodeId, setShakingNodeId] = useState<string | null>(null);
  function shakeLockedNode(nodeId: string) {
    setShakingNodeId(nodeId);
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 1, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 1, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start(() => setShakingNodeId(null));
  }
  const scrollY   = useRef(new Animated.Value(0)).current;
  // Last scroll position breadcrumbed, so the listener below only logs on a
  // meaningful move rather than every pixel — see its own comment for why
  // breadcrumbing scroll position matters here (the still-unsymbolicated
  // libc.so SIGABRT, whose only lead so far is scroll position at crash time).
  const lastBreadcrumbYRef = useRef(0);
  // See the scroll listener below for why bounce is conditional rather than
  // simply off. Starts true so pull-to-refresh works on a freshly opened map,
  // which always begins at the top.
  const [bouncesEnabled, setBouncesEnabled] = useState(true);
  const bouncesRef = useRef(true);

  const onScroll  = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (e: any) => {
        // Reported crash: the app closes while scrolling the map — no JS
        // exception ever reaches ErrorUtils for that, because the failure
        // mode documented above (a native bitmap allocation over Canvas's
        // ~100MB ceiling) aborts the process straight from native code. This
        // whole listener is therefore wrapped, and scroll position is
        // breadcrumbed (throttled to a real move, not every pixel), so that
        // WHEN it crashes again, Crashlytics has the exact scroll position
        // and map size that preceded it, sitting right next to the
        // now-symbolicated native stack (see the Gradle
        // nativeSymbolUploadEnabled change) instead of a bare offset with no
        // lead-up context.
        try {
          const y = e.nativeEvent.contentOffset.y as number;
          // Bottom overscroll is what exposes a strip of non-map content
          // below the grass. The map should simply not travel past its end.
          // Plain `bounces={false}` would do that, but on iOS it kills the
          // TOP bounce too — and the top bounce is pull-to-refresh here
          // (RefreshControl plus PullRefreshIndicator, which is driven by
          // scrollY going negative). So bounce is allowed only while the
          // view is near the top, where refresh lives, and switched off
          // once scrolled away, which covers everywhere the bottom edge is
          // reachable. Ref-guarded so this flips at most twice per gesture
          // rather than calling setState on every scroll frame.
          const nearTop = y < sc(80);
          if (nearTop !== bouncesRef.current) {
            bouncesRef.current = nearTop;
            setBouncesEnabled(nearTop);
          }
          if (Math.abs(y - lastBreadcrumbYRef.current) < height / 2) return;
          lastBreadcrumbYRef.current = y;
          addBreadcrumb('map: scrolled', { scrollY: Math.round(y), MAP_H: Math.round(MAP_H), chapterIdx });
        } catch (err) {
          captureError(err, { where: 'MapScreen.onScroll', chapterIdx, MAP_H: Math.round(MAP_H) });
        }
      },
    },
  );

  // The completed-node gold pulse, running only while the map is on screen
  // (see useFocusedLoop for why it must stop on blur).
  useFocusedLoop(goldAnim, 1400);

  const { jumpToSurahStart } = useRecommendedJump({
    navigation, recommended, fullLevels, chapterIdx, setChapterIdx, setChapterResolved,
    firstActiveNode, allEnrichedNodes, height, MAP_H, loadingPaths, returnedFromLevelTick,
    fetchPhase, currentSurahNumRef, scrollRef, pendingJump, setPendingJump, appliedRecSurahRef,
    appliedRecChapterRef, manualChapterRef, pendingRecommendedJumpRef, chapterJumpRef,
    suppressFollowRef, autoScrolledNodeIdRef,
  });

  // Built after useRecommendedJump: the confirms need its jumpToSurahStart.
  const { handleNodePress, handleStartConfirm, handleRetryConfirm, handleLockedSurahConfirm } = createLevelLaunchHandlers({
    navigation, startPrompt, lockedSurahPrompt, setStartPrompt, setRetryNodeId, setNotReadyTap,
    setLockedSurahPrompt, setFullLevels, fetchFirstLevelNow, jumpToSurahStart, shakeLockedNode,
    suppressFollowRef,
  });

  // Crash context, not app behavior — this screen had none of the
  // breadcrumb/context wiring the rest of the app relies on (see
  // authStore/lessonStore/api/client.ts), despite being the one screen
  // reported to crash the app on scroll. `setCrashContext` tags every crash
  // report from here on with which chapter/surah was open and how tall its
  // map is (tile-mount OOM is a known failure mode for a tall MAP_H — see
  // the comment above the tiled Svg render below), so a crash report shows
  // that context even if it happens before the user does anything else.
  useEffect(() => {
    if (!chapterResolved) return;
    setCrashContext({ screen: 'Map', surah_id: recommended?.surah_number });
    addBreadcrumb('map: chapter shown', { chapterIdx, MAP_H: Math.round(MAP_H), nodeCount: allEnrichedNodes.length });
  }, [chapterResolved, chapterIdx, MAP_H, recommended?.surah_number, allEnrichedNodes.length]);


  return (
    <View style={S.container}>
      <MapHud
        S={S}
        sc={sc}
        topInset={insets.top}
        learning={learning}
        isGuestUser={isGuestUser}
        onGuestPress={showGuestPrompt}
        navigation={navigation}
      />

      {(!nodesReady || refreshing) && <LoadingBar nodesReady={nodesReady} />}
      {(!nodesReady || refreshing) && (
        // Gate on nodesReady (chapterResolved + firstLevel data for current chapter) to prevent
        // the SVG background from appearing before nodes finish loading. Kept translucent for
        // pull-to-refresh, where the already-correct map underneath is meant to stay visible
        // while it re-fetches.
        <View style={[S.loadingOverlay, !nodesReady && S.loadingOverlaySolid]} pointerEvents="none">
          <Image
            source={require('../../../assets/images/lumo_transparent.png')}
            style={S.loadingOverlayLumo}
            resizeMode="contain"
          />
          <LoadingRing size={64} color="#F5F7FA" />
          <LoadingStatusText
            messages={['Loading your map…', 'Almost there…']}
            style={S.loadingOverlayText}
          />
        </View>
      )}

      {/* Pull-to-refresh's overscroll bounce translates the ScrollView's
          content DOWN, briefly exposing a sliver at the very top of the
          ScrollView's own frame (container's y=0 downward — HUD is an
          absolute overlay, so the ScrollView's frame really does start at
          the true top of the screen) that the content normally fully
          covers. Since the ScrollView itself has no background, that
          sliver showed S.container's flat colors.mapBg (green) sitting
          directly above the sky gradient's blue, a jarring seam reported
          2026-09-03 as "a green gradient leaking" when pulling down. This
          strip sits behind the ScrollView (earlier in the tree = lower
          z-order), pinned to that same top region and colored to match the
          sky gradient's own topmost color, so the reveal blends into the
          sky instead of clashing with it — invisible the rest of the time
          since the ScrollView's own content paints over it at every normal
          scroll position. Height is a fixed generous buffer, not tied to
          the actual bounce distance (iOS doesn't expose that), sized well
          past any real pull-to-refresh travel. */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: sc(200), backgroundColor: '#4FB3E8' }} />
      {/* Same seam, opposite edge: scrolling past the very end of the map (iOS
          rubber-band bounce, no pull-to-refresh-style gesture needed here —
          just normal overscroll) translates the content UP, briefly exposing
          a sliver below the ScrollView's actual bottom edge.
          Reported 2026-09-05 as "the gradient is showing as a leak", and
          again 2026-10-03 as "the green gradient is leaking" at the bottom.
          The 09-05 fix set this strip to colors.mapBg on the reasoning that
          it matches the map gradient's bottom-most stop. That reasoning is
          true but matches the wrong layer: the gradient's bottom is entirely
          covered by the grass, so the visible thing at MAP_H's edge is
          grass.jpg, not the gradient. mapBg is #2A8C5A (a blue-green) while
          grass.jpg's dominant colour is #88C808 (a bright yellow-green) —
          about 148 apart in RGB, a hue shift rather than a shade difference,
          which is exactly why it reads as a dark band leaking in under the
          grass rather than as a subtle seam.
          Matched to the grass instead. Still a flat colour against a texture,
          so a faint seam can remain on a long overscroll; if that matters,
          the next step is tiling GRASS_SRC here, which needs the same
          iOS-repeat platform branch the map's own grass already uses. */}
      <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: sc(200), backgroundColor: GRASS_FALLBACK }} />
      <PullRefreshIndicator scrollY={scrollY} refreshing={refreshing} />
      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        // iOS rubber-band, gated to the top so pull-to-refresh survives.
        bounces={bouncesEnabled}
        // Android's own equivalent (glow/stretch past the end). Unlike iOS
        // this one is safe to disable outright: Android's RefreshControl
        // drives its own pull gesture and does not depend on overscroll.
        overScrollMode="never"
        onScroll={onScroll}
        onScrollBeginDrag={dismissActionCards}
        scrollEventThrottle={16}
        refreshControl={
          // Spinner suppressed as far as each platform allows —
          // PullRefreshIndicator above (Lumo + rainbow) is the only visible
          // pull-to-refresh feedback now; RefreshControl itself stays purely
          // for its native pull-threshold/release detection.
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="transparent"
            colors={['transparent']}
            progressBackgroundColor="transparent"
          />
        }
      >
        {/* Map canvas — height computed from layout, not hardcoded */}
        <View style={{ width: MAP_W, height: MAP_H, position: 'relative', overflow: 'hidden' }}>

          <MapBackground M={M} mapInstanceId={mapInstanceId} />

          {/* Season signs — rendered like a node: centered on the path (see
              the on-path x/y computed in buildMapModel), sitting right before
              the new season's first level. Purely a milestone marker now, not
              a gate: they unlock nothing and aren't tappable, since every
              surah is open from the start. Pre-engraved art only exists for
              the season-1 sign, so every sign reuses it as a placeholder
              until per-season art is ready. */}
          {/* Disabled per request (2026-09-20) — commented out, not removed,
              so the underlying DECORATIONS.seasonGates data/layout stays
              intact if this comes back.
          {DECORATIONS.seasonGates.map((g, i) => (
            <Image
              key={`gate${i}`}
              source={SEASON_SIGN_SRCS[g.unlocksSeasonIdx + 1] ?? SEASON_SIGN_SRCS[1]}
              resizeMode="contain"
              style={{ position: 'absolute', left: g.x, top: g.y, width: g.w, height: g.h }}
            />
          ))}
          */}

          {/* Surah labels — scroll art, positioned a real derived distance
              from each section's first node (mirrors lumaLeft's formula) */}
          {enrichedSections.map(section => {
            const box = SURAH_LABELS[section.surahNum];
            if (!box) return null;
            return (
              <SurahLabel key={`label-${section.surahNum}`} name={section.name} box={box} sc={sc} SL={SL} />
            );
          })}

          {/* Lesson nodes + ayah-range pills — globally numbered across all surahs */}
          {(() => {
            let globalIdx = 0;
            return gatedSections.map(section =>
              section.nodes.map((node, nodeIdx) => {
                // Review ("R") nodes don't consume a number in the sequence —
                // only advance the counter for normal, numbered nodes.
                if (!node.isSpecial) globalIdx++;
                const idx = globalIdx;
                const pill = AYAH_PILLS[`${section.surahNum}_${nodeIdx}`];
                const nodeEstimate = estimateAyahRange(node.levelNum ?? 1, section.ayahCount, node.isSpecial);
                const ayahFrom = node.startAyah ?? nodeEstimate.from;
                const ayahTo = node.endAyah ?? nodeEstimate.to;
                const rangeLabel = formatAyahRange(ayahFrom, ayahTo);
                return (
                  <React.Fragment key={node.id}>
                    <Animated.View
                      style={[
                        { position: 'absolute', left: node.x, top: node.y },
                        shakingNodeId === node.id && {
                          transform: [{
                            translateX: shakeAnim.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] }),
                          }],
                        },
                      ]}
                    >
                    <TouchableOpacity
                      activeOpacity={node.status === 'locked' ? 1 : 0.85}
                      onPress={() => void handleNodePress(section, node)}
                    >
                      <MapNode
                        status={node.status}
                        stars={node.stars}
                        goldAnim={goldAnim}
                        levelNum={idx}
                        isFetching={node.status === 'pending' && fetchingSurah === section.surahNum}
                        isSpecial={node.isSpecial}
                        tagLabel={node.id === firstActiveNode?.id ? (hasAnyProgress ? 'Continue here' : 'Begin here') : undefined}
                        tagPlacement={node.id === firstActiveNode?.id ? nodeTagPlacement() : undefined}
                        S={S}
                      />
                    </TouchableOpacity>
                    </Animated.View>
                    {pill && (
                      <View pointerEvents="none" style={[S.ayahPill, { position: 'absolute', left: pill.x, top: pill.y, width: pill.w, height: pill.h }]}>
                        <Text style={S.ayahPillText} numberOfLines={1} adjustsFontSizeToFit>{rangeLabel}</Text>
                      </View>
                    )}
                  </React.Fragment>
                );
              })
            );
          })()}

          {/* Shown when a tap couldn't resolve a real lesson to open — either
              the network failed or the backend has nothing for that surah yet.
              Worded to be true of both, since the tap can't tell them apart,
              and never claims the surah is unavailable (it may simply be a
              dropped request). Beats a dead tap, and beats navigating into a
              session for a group that doesn't exist. */}
          {notReadyTap != null && (() => {
            const { left, top } = actionCardPosition(notReadyTap.node);
            return (
              <View style={{ position: 'absolute', left, top, zIndex: 5, alignItems: 'center' }}>
                <LumaFloat
                  speech={`Couldn't open ${notReadyTap.section.name} just now. Please try again!`}
                  S={S}
                  SB={SB}
                  sc={sc}
                />
                <TouchableOpacity style={S.unlockDismiss} onPress={() => setNotReadyTap(null)}>
                  <Text style={S.unlockDismissText}>OK</Text>
                </TouchableOpacity>
              </View>
            );
          })()}

          {/* Completed-node "repeat the lesson" card — the on-map popout
              described in the perf fix: tapping a gold/completed node no
              longer jumps straight into LessonSession (that's the expensive
              exercise-build fetch). It just shows this, positioned beside the
              tapped node; only its button pays that cost. */}
          {retryNodeId != null && (() => {
            let target: { section: Section; node: SectionNode } | null = null;
            for (const s of gatedSections) {
              const n = s.nodes.find(nn => nn.id === retryNodeId);
              if (n) { target = { section: s, node: n }; break; }
            }
            if (!target) return null;
            const { section, node } = target;
            const targetEstimate = estimateAyahRange(node.levelNum ?? 1, section.ayahCount, node.isSpecial);
            const ayahFrom = node.startAyah ?? targetEstimate.from;
            const ayahTo = node.endAyah ?? targetEstimate.to;
            const { left, top } = actionCardPosition(node);
            return (
              <View style={{ position: 'absolute', left, top, zIndex: 5 }}>
                <LevelActionCard
                  variant="repeat"
                  surahName={section.name}
                  ayahFrom={ayahFrom}
                  ayahTo={ayahTo}
                  isSpecial={node.isSpecial}
                  onConfirm={() => handleRetryConfirm(section, node)}
                  onDismiss={() => setRetryNodeId(null)}
                  S={S}
                />
              </View>
            );
          })()}

          {/* "Start a new level" card — the non-completed-node counterpart
              above. Position/ayah data was already resolved into startPrompt
              at tap time (see handleNodePress), so this just renders it. */}
          {startPrompt != null && (() => {
            const { section, node, ayahFrom, ayahTo } = startPrompt;
            const { left, top } = actionCardPosition(node);
            return (
              <View style={{ position: 'absolute', left, top, zIndex: 5 }}>
                <LevelActionCard
                  variant="start"
                  surahName={section.name}
                  ayahFrom={ayahFrom}
                  ayahTo={ayahTo}
                  isSpecial={node.isSpecial}
                  onConfirm={handleStartConfirm}
                  onDismiss={() => setStartPrompt(null)}
                  S={S}
                />
              </View>
            );
          })()}

          <MapChapterEnd
            S={S}
            sc={sc}
            mapH={MAP_H}
            viewportH={height}
            comingSoonY={comingSoonY}
            chapterIdx={chapterIdx}
            scrollY={scrollY}
            onGoToChapter={goToChapterStable}
          />
        </View>
      </Animated.ScrollView>

      <FeedbackButton S={S} sc={sc} screenWidth={width} navigation={navigation} />

      <TourOfferModal
        visible={tourOfferVisible}
        onAccept={handleAcceptTour}
        onDecline={handleDeclineTour}
      />

      {frozenPopupVisible && (
        <StreakFrozenModal
          currentStreak={learning?.current_streak ?? 0}
          freezeDaysRemaining={learning?.freeze_days_remaining ?? 0}
          repairRequired={learning?.repair_levels_required ?? 0}
          repairCompleted={learning?.repair_levels_completed ?? 0}
          onDismiss={() => setFrozenPopupVisible(false)}
        />
      )}

      <AuthRequiredModal
        visible={guestPromptVisible}
        title="Create an account"
        body="Guest streak and XP aren't saved. Create a free account to start banking them for real."
        ctaLabel="Create account"
        dismissLabel="Not now"
        onContinue={() => { setGuestPromptVisible(false); navigation.navigate('SignUp'); }}
        onDismiss={() => setGuestPromptVisible(false)}
      />

      <StartSurahModal
        visible={!!lockedSurahPrompt}
        nameEn={lockedSurahPrompt?.name}
        nameAr={lockedSurahPrompt?.arabicName}
        ayahCount={lockedSurahPrompt?.ayahCount}
        onConfirm={handleLockedSurahConfirm}
        onCancel={() => setLockedSurahPrompt(null)}
      />
    </View>
  );
}


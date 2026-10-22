import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  Animated, FlatList, InteractionManager, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions,
  type CellRendererProps, type ViewToken, type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import LumoLoader from '../../../components/LumoLoader';
import WorldLoading from '../../../components/worldLoading/WorldLoading';
import { MAP_MESSAGES, MAP_MESSAGE_MS } from '../../../components/worldLoading/messages';
import { useSlowLoading } from '../../../hooks/useSlowLoading';
import StreakFrozenModal from '../../../components/StreakFrozenModal';
import AuthRequiredModal from '../../../components/AuthRequiredModal';
import StartSurahModal from '../../../components/StartSurahModal';
import { useAuthStore } from '../../../store/authStore';
import { useTourStore } from '../../../store/tourStore';
import { isGuest } from '../../../utils/guest';
import { setTourOffered, wasTourOffered } from '../../../utils/storage';
import TourOfferModal from '../../../components/tour/TourOfferModal';
import { getLastRecommended, subscribeRecommended } from '../../../services/bootCache';
import { addBreadcrumb, setCrashContext } from '../../../services/crashReporter';
import type { MapNavProp, TabParamList } from '../../../navigation/types';
import { SURAH_TO_SEASON, buildMapModel, estimateAyahRange, type Section, type SectionNode } from '../map/mapModel';
import { makeStyles as makeLegacyStyles } from '../map/mapStyles';
import { useMapData } from '../map/useMapData';
import { createLevelLaunchHandlers, type StartPrompt } from '../map/levelLaunch';
import { useStreakFrozenPopup } from '../map/useStreakFrozenPopup';
import { LevelActionCard } from '../map/components/LevelActionCard';
import { LumaFloat } from '../map/components/LumaFloat';
import { LoadingBar } from '../map/components/LoadingBar';
import { SKY_HILL_H } from './art/SkyHillArt';
import { FIGMA_W } from './map2Theme';
import { SLOT_OF, SLOT_SURAH, bandOfY, bandSlotRange, buildMap2Layout, type Map2NodeData } from './map2Model';
import { useEnrichedSections } from './useEnrichedSections';
import { useMap2Jump } from './useMap2Jump';
import { makeMap2Styles } from './styles';
import Map2Header from './components/Map2Header';
import Map2Band from './components/Map2Band';
import Map2BottomBar, { BOTTOM_BAR_H, bottomBarClearance, type BottomBarKey } from './components/Map2BottomBar';
import Map2FeedbackButton from './components/Map2FeedbackButton';
import BackToLevelButton, { BACK_TO_LEVEL_H, BACK_TO_LEVEL_W } from './components/BackToLevelButton';

interface Props { navigation: MapNavProp }

const VIEWABILITY = { itemVisiblePercentThreshold: 1 };

// The Home tab: the Figma day map. One continuous scroll over every level of
// the Quran: the list only builds the bands near the screen, and a surah's
// level data is fetched as it scrolls into view. Level launching reuses the
// shared handlers in ../map.
export default function Map2Screen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const s = width / FIGMA_W;
  const S = useMemo(() => makeMap2Styles(s), [s]);
  // The level start/repeat card and the "couldn't open" bubble are the current
  // map's own components, styled by its style sheet.
  const legacy = useMemo(() => {
    const M = buildMapModel(width, height, 0);
    return { M, ...makeLegacyStyles(M) };
  }, [width, height]);
  const headerH = insets.top + SKY_HILL_H * s;
  const bottomClearance = bottomBarClearance(insets.bottom);
  const bottomBarH = BOTTOM_BAR_H * s + bottomClearance;

  const user = useAuthStore(st => st.user);
  const learning = useAuthStore(st => st.learning);
  const refreshLearning = useAuthStore(st => st.refreshLearning);
  const isGuestUser = isGuest(user);
  const [guestPromptVisible, setGuestPromptVisible] = useState(false);
  const [, forceRecommendedTick] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeRecommended(() => forceRecommendedTick()), []);
  const [frozenPopupVisible, setFrozenPopupVisible] = useStreakFrozenPopup(learning);
  useEffect(() => {
    if (!learning) void refreshLearning({ force: true });
  }, [learning, refreshLearning]);

  const [notReadyTap, setNotReadyTap] = useState<{ section: Section; node: SectionNode } | null>(null);
  const [lockedSurahPrompt, setLockedSurahPrompt] = useState<Section | null>(null);
  const [retryNodeId, setRetryNodeId] = useState<string | null>(null);
  const [startPrompt, setStartPrompt] = useState<StartPrompt>(null);
  const dismissActionCards = useCallback(() => {
    setRetryNodeId(null);
    setStartPrompt(null);
    setNotReadyTap(null);
  }, []);
  const suppressFollowRef = useRef(false);
  const listRef = useRef<FlatList<number>>(null);

  const {
    fullLevels, setFullLevels, firstLevel, loadingPaths, fetchingSurah, reloading,
    fetchPhase, fetchFirstLevelNow, currentSurahNumRef, returnedFromLevelTick, returnedFromSurahRef,
  } = useMapData(learning);

  // ── Guided tour ──────────────────────────────────────────────────
  // Offered once, on a first-time user's first sight of the map. Ported from
  // MapScreen.tsx (now unrouted) when Map2Screen became Home 2026-10-16 —
  // this wiring was missed in that switch, so the tour was never offered to
  // any real user since (2026-10-19, user: "i didnt see it"). Gated on
  // loadingPaths having actually finished, not just on mount: accepting the
  // offer while the first levels fetch is still in flight would start the
  // tour over the loading state instead of the real map.
  const tourOfferVisible = useTourStore(s => s.offerVisible);
  const setTourOfferVisible = useTourStore(s => s.setOfferVisible);
  const startTour = useTourStore(s => s.start);
  useEffect(() => {
    if (loadingPaths) return;
    void (async () => {
      if (await wasTourOffered()) return;
      setTourOfferVisible(true);
    })();
  }, [loadingPaths, setTourOfferVisible]);
  function handleAcceptTour() {
    setTourOfferVisible(false);
    void setTourOffered();
    // TourOfferModal is a native Android dialog and is still tearing itself
    // down for a beat after `visible` flips to false, during which it keeps
    // eating touches meant for whatever comes next. Waiting out its close
    // animation before starting the tour avoids that overlap.
    setTimeout(() => { startTour(); }, 350);
  }
  function handleDeclineTour() {
    setTourOfferVisible(false);
    void setTourOffered();
  }

  // Last known, not TTL-gated: see getLastRecommended().
  const recommended = getLastRecommended();
  const [visibleSurahs, setVisibleSurahs] = useState('');
  const { sections, nodesBySlot, activeSlot } = useEnrichedSections(fullLevels, firstLevel, setFullLevels, recommended, visibleSurahs);
  const activeId = activeSlot != null ? nodesBySlot[activeSlot]?.node.id ?? null : null;

  const layout = useMemo(
    () => buildMap2Layout({ width, headerH, bottomBarH, activeSlot }),
    [width, headerH, bottomBarH, activeSlot],
  );
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const bands = useMemo(() => Array.from({ length: layout.bandCount }, (_, i) => i), [layout.bandCount]);
  // Open on the recommended surah if the boot cache already knows it, else at
  // the very start (An-Nas, bottom of the map). The jump hook then lands exactly.
  const [initialBand] = useState(() => {
    const rec = getLastRecommended();
    const slot = rec ? SLOT_OF[`${rec.surah_number}:0`] ?? 0 : 0;
    return bandOfY(layout, layout.cy[slot]);
  });

  const nodesReady = !loadingPaths;
  const slowLoading = useSlowLoading(!nodesReady);
  // After a lesson: that surah's next unfinished level, or its last one if
  // it's all done. Read from the map's own nodes, so it is whatever the map
  // is showing. Null (land on the active level) when no surah is known.
  const nodesBySlotRef = useRef(nodesBySlot);
  nodesBySlotRef.current = nodesBySlot;
  const returnSlot = useCallback((): number | null => {
    const surah = returnedFromSurahRef.current;
    if (surah == null) return null;
    let last: number | null = null;
    for (let idx = 0; ; idx++) {
      const slot = SLOT_OF[`${surah}:${idx}`];
      if (slot == null) return last;
      if (nodesBySlotRef.current[slot]?.node.status !== 'completed') return slot;
      last = slot;
    }
  }, [returnedFromSurahRef]);
  const { scrollToSlot, jumpToActive, jumpToSurahStart } = useMap2Jump({
    listRef, layout, height, activeSlot, activeId, loading: loadingPaths, returnedFromLevelTick,
    fetchPhase, currentSurahNumRef, suppressFollowRef, returnSlot,
  });

  // "Back to my level" arrow: checked when a scroll comes to rest (no
  // per-frame work), pointing toward the active level when it's out of sight.
  const [arrowDir, setArrowDir] = useState<'up' | 'down' | null>(null);
  const activeSlotRef = useRef(activeSlot);
  activeSlotRef.current = activeSlot;
  const updateArrow = useCallback((offset: number) => {
    const slot = activeSlotRef.current;
    if (slot == null) { setArrowDir(null); return; }
    const y = layoutRef.current.cy[slot];
    const top = offset + headerH + 20 * s;
    const bottom = offset + height - bottomBarH - 20 * s;
    setArrowDir(y > bottom ? 'down' : y < top ? 'up' : null);
  }, [headerH, height, bottomBarH, s]);
  const onScrollSettled = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => updateArrow(e.nativeEvent.contentOffset.y),
    [updateArrow],
  );
  const backToLevel = useCallback(() => { setArrowDir(null); jumpToActive(); }, [jumpToActive]);
  // While the back button shows, Feedback slides up by exactly its height plus
  // a 12pt gap (one short slide, not a loop), and back down when it hides.
  const showBackTo = arrowDir != null && nodesReady;
  const feedbackLiftBy = (BACK_TO_LEVEL_H + 12) * s;
  const feedbackLift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(feedbackLift, { toValue: showBackTo ? -feedbackLiftBy : 0, duration: 180, useNativeDriver: true }).start();
  }, [showBackTo, feedbackLiftBy, feedbackLift]);
  // The jump hook also brings the view back on these; the arrow follows.
  useEffect(() => { setArrowDir(null); }, [activeId]);
  // After a lesson the view may land on another surah than the learner's
  // level (see returnSlot), so the arrow is worked out for where it lands.
  useEffect(() => {
    if (returnedFromLevelTick === 0) return;
    const slot = returnSlot();
    if (slot == null) { setArrowDir(null); return; }
    updateArrow(Math.max(0, layoutRef.current.cy[slot] - height / 2));
  }, [returnedFromLevelTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Home pressed from another tab: back to the learner's level.
  useEffect(() => navigation.addListener('tabPress', () => backToLevel()), [navigation, backToLevel]);

  // A surah picked in Search Surahs or Surah Progress arrives as params: jump
  // there once, then clear them so it never re-fires.
  const route = useRoute<RouteProp<TabParamList, 'Map'>>();
  const jumpSurah = route.params?.jumpToSurah;
  // Bug (2026-10-22, "jump here from Search goes to the map but stays at my
  // level"): index.js turns on react-native-screens' enableFreeze, so this
  // whole tab is frozen and hidden while Search sits on top of it. The
  // params land as it unfreezes, and a scroll fired a frame later reached a
  // list that hadn't been laid out again yet, so it was dropped. Waiting for
  // the navigation transition to finish first means the list is back.
  // Likely cause, not reproduced on a device. Kept in a ref, not this
  // effect's cleanup: clearing the params below re-runs the effect, and a
  // cleanup would cancel the very jump it just scheduled.
  const jumpTaskRef = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);
  useEffect(() => () => jumpTaskRef.current?.cancel(), []);
  useEffect(() => {
    if (jumpSurah == null) return;
    const groupId = route.params?.jumpToGroupId;
    const levelIdx = route.params?.jumpToLevelIdx;
    navigation.setParams({ jumpToSurah: undefined, jumpToGroupId: undefined, jumpToLevelIdx: undefined });
    jumpTaskRef.current?.cancel();
    jumpTaskRef.current = InteractionManager.runAfterInteractions(() => {
      jumpToSurahStart(jumpSurah, groupId != null && levelIdx != null ? { groupId, levelIdx } : undefined);
      // Lands on that surah's first level (its JUMP HERE? tag) or the given level;
      // the arrow then points back to the learner's own level if it's off screen.
      const slot = SLOT_OF[`${jumpSurah}:${levelIdx ?? 0}`];
      if (slot != null) updateArrow(Math.max(0, layoutRef.current.cy[slot] - height / 2));
    });
  }, [jumpSurah]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch first-level status for surahs as their bands come on screen.
  const fetchPhaseRef = useRef(fetchPhase);
  fetchPhaseRef.current = fetchPhase;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const L = layoutRef.current;
    const surahs = new Set<number>();
    for (const v of viewableItems) {
      const [from, to] = bandSlotRange(L, v.item as number);
      for (let slot = from; slot <= to; slot++) surahs.add(SLOT_SURAH[slot]);
    }
    for (const surah of surahs) void fetchPhaseRef.current(SURAH_TO_SEASON[surah] ?? 0, currentSurahNumRef.current);
    const key = Array.from(surahs).sort((a, b) => a - b).join(',');
    setVisibleSurahs(prev => (prev === key ? prev : key));
  }).current;

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

  const { handleNodePress, handleStartConfirm, handleRetryConfirm, handleLockedSurahConfirm } = createLevelLaunchHandlers({
    navigation, startPrompt, lockedSurahPrompt, setStartPrompt, setRetryNodeId, setNotReadyTap,
    setLockedSurahPrompt, setFullLevels, fetchFirstLevelNow, jumpToSurahStart, shakeLockedNode,
    suppressFollowRef,
  });
  const handleNodePressRef = useRef(handleNodePress);
  handleNodePressRef.current = handleNodePress;
  // "JUMP HERE?" (a surah's first level): bring it to the middle of the screen,
  // then offer to start it like any node.
  const onNodePress = useCallback((section: Section, node: SectionNode) => {
    if (node.surahLevelIdx === 0 && node.status !== 'completed') {
      const slot = (node as Map2NodeData).slot;
      scrollToSlot(slot, true);
      updateArrow(Math.max(0, layoutRef.current.cy[slot] - height / 2));
    }
    void handleNodePressRef.current(section, node);
  }, [scrollToSlot, updateArrow, height]);

  const onStreak = useCallback(() => (isGuestUser ? setGuestPromptVisible(true) : navigation.navigate('Streak')), [isGuestUser, navigation]);
  const onXp = useCallback(() => (isGuestUser ? setGuestPromptVisible(true) : navigation.navigate('XP')), [isGuestUser, navigation]);
  // Explainer pages, not account data — open for guests too, unlike Streak/XP.
  const onHearts = useCallback(() => navigation.navigate('Hearts'), [navigation]);
  const onGems = useCallback(() => navigation.navigate('Gems'), [navigation]);
  const onSearch = useCallback(() => navigation.navigate('SearchSurahs'), [navigation]);
  const onProgress = useCallback(() => navigation.navigate('SurahProgress'), [navigation]);
  const onJourney = useCallback(() => navigation.navigate('ComingSoon', { title: 'Journey' }), [navigation]);
  const onReview = useCallback(() => navigation.navigate('ComingSoon', { title: 'Review' }), [navigation]);
  const onFeedback = useCallback(() => navigation.navigate('Feedback'), [navigation]);
  const onBottomBar = useCallback((key: BottomBarKey) => {
    if (key === 'home') backToLevel();
    else if (key === 'chest') navigation.navigate('DailyQuest');
    else if (key === 'star') navigation.navigate('Building');
    else if (key === 'trophy') navigation.navigate('Leaderboard');
    else navigation.navigate('Profile');
  }, [backToLevel, navigation]);

  useEffect(() => {
    if (!nodesReady) return;
    setCrashContext({ screen: 'Map', surah_id: recommended?.surah_number });
    addBreadcrumb('map2: ready', { contentH: Math.round(layout.contentH), bands: layout.bandCount, activeSlot });
  }, [nodesReady, recommended?.surah_number, layout.contentH, layout.bandCount, activeSlot]);

  // The open level card, drawn inside the band that holds its node.
  const retryTarget = useMemo(() => {
    if (retryNodeId == null) return null;
    for (const sec of sections) {
      const node = sec.nodes.find(n => n.id === retryNodeId);
      if (node) return { section: sec, node };
    }
    return null;
  }, [retryNodeId, sections]);
  const cardSlot = startPrompt ? (startPrompt.node as Map2NodeData).slot
    : retryTarget ? retryTarget.node.slot
    : notReadyTap ? (notReadyTap.node as Map2NodeData).slot
    : null;
  const overlayBand = cardSlot != null ? bandOfY(layout, layout.cy[cardSlot]) : null;
  let overlay: React.ReactNode = null;
  if (cardSlot != null && overlayBand != null) {
    const { ACTION_CARD_W: cw, ACTION_CARD_H: ch } = legacy.M;
    const nx = layout.cx[cardSlot];
    const hMargin = 8 * s;
    const vMargin = 14 * s;
    // Centered over the node horizontally, clamped to stay on screen.
    const left = Math.max(hMargin, Math.min(width - cw - hMargin, nx - cw / 2));
    // Always placed in the empty space above the node (bottom edge of the
    // card sits vMargin above the node's own top edge), never parallel to
    // or overlapping it — falls back to below the node only when there
    // isn't room above within this band (e.g. the node is the first thing
    // in it).
    const nodeCenterYInBand = layout.cy[cardSlot] - overlayBand * layout.bandH;
    const nodeTopInBand = nodeCenterYInBand - layout.nodeFaceH / 2;
    const nodeBottomInBand = nodeCenterYInBand + layout.nodeFaceH / 2;
    const fitsAbove = nodeTopInBand - vMargin - ch >= 0;
    const top = fitsAbove ? nodeTopInBand - vMargin - ch : nodeBottomInBand + vMargin;
    if (startPrompt) {
      overlay = (
        <View style={{ position: 'absolute', left, top, zIndex: 5 }}>
          <LevelActionCard
            variant="start"
            surahName={startPrompt.section.name}
            ayahFrom={startPrompt.ayahFrom}
            ayahTo={startPrompt.ayahTo}
            isSpecial={startPrompt.node.isSpecial}
            onConfirm={handleStartConfirm}
            S={legacy.S}
          />
        </View>
      );
    } else if (retryTarget) {
      const { section, node } = retryTarget;
      const estimate = estimateAyahRange(node.levelNum ?? 1, section.ayahCount, node.isSpecial);
      overlay = (
        <View style={{ position: 'absolute', left, top, zIndex: 5 }}>
          <LevelActionCard
            variant="repeat"
            surahName={section.name}
            ayahFrom={node.startAyah ?? estimate.from}
            ayahTo={node.endAyah ?? estimate.to}
            isSpecial={node.isSpecial}
            onConfirm={() => handleRetryConfirm(section, node)}
            S={legacy.S}
          />
        </View>
      );
    } else if (notReadyTap) {
      overlay = (
        <View style={{ position: 'absolute', left, top, zIndex: 5, alignItems: 'center' }}>
          <LumaFloat
            speech={`Couldn't open ${notReadyTap.section.name} just now. Please try again!`}
            S={legacy.S}
            SB={legacy.SB}
            sc={legacy.M.sc}
          />
          <TouchableOpacity style={legacy.S.unlockDismiss} onPress={() => setNotReadyTap(null)}>
            <Text style={legacy.S.unlockDismissText}>OK</Text>
          </TouchableOpacity>
        </View>
      );
    }
  }

  // The band holding an open card draws above its neighbours, so a card that
  // hangs past the band's edge isn't covered by the next band.
  const overlayBandRef = useRef(overlayBand);
  overlayBandRef.current = overlayBand;
  const CellRenderer = useCallback(
    ({ index, style, onLayout, children }: CellRendererProps<number>) => (
      <View style={[style, index === overlayBandRef.current ? { zIndex: 2, elevation: 2 } : null]} onLayout={onLayout}>
        {children}
      </View>
    ),
    [],
  );

  const renderBand = useCallback(({ item }: ListRenderItemInfo<number>) => (
    <Map2Band
      S={S}
      layout={layout}
      band={item}
      nodesBySlot={nodesBySlot}
      activeSlot={activeSlot}
      shakingNodeId={shakingNodeId}
      shakeAnim={shakeAnim}
      fetchingSurah={fetchingSurah}
      onNodePress={onNodePress}
      overlay={item === overlayBand ? overlay : undefined}
      onBackgroundPress={item === overlayBand ? dismissActionCards : undefined}
    />
  ), [S, layout, nodesBySlot, activeSlot, shakingNodeId, shakeAnim, fetchingSurah, onNodePress, overlayBand, overlay, dismissActionCards]);

  const getItemLayout = useCallback((_: ArrayLike<number> | null | undefined, index: number) => ({
    length: Math.min(layout.bandH, layout.contentH - index * layout.bandH),
    offset: index * layout.bandH,
    index,
  }), [layout]);

  return (
    <View style={S.container}>
      <FlatList
        ref={listRef}
        style={S.scroll}
        data={bands}
        keyExtractor={String}
        renderItem={renderBand}
        extraData={renderBand}
        getItemLayout={getItemLayout}
        initialScrollIndex={initialBand}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={5}
        removeClippedSubviews={false}
        CellRendererComponent={CellRenderer}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={VIEWABILITY}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        onScrollBeginDrag={dismissActionCards}
        onScrollEndDrag={onScrollSettled}
        onMomentumScrollEnd={onScrollSettled}
      />

      <Map2Header
        S={S}
        s={s}
        topInset={insets.top}
        learning={learning}
        isGuestUser={isGuestUser}
        onStreak={onStreak}
        onHearts={onHearts}
        onGems={onGems}
        onXp={onXp}
        onSearch={onSearch}
        onProgress={onProgress}
        onJourney={onJourney}
        onReview={onReview}
      />
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: feedbackLift }] }]} pointerEvents="box-none">
        <Map2FeedbackButton S={S} s={s} bottom={bottomBarH + 21 * s} onPress={onFeedback} />
      </Animated.View>
      {showBackTo && arrowDir != null && (
        // In Feedback's own spot, centred under it (Feedback is 60.7pt wide).
        <BackToLevelButton s={s} right={(23 + (60.7 - BACK_TO_LEVEL_W) / 2) * s} bottom={bottomBarH + 21 * s} direction={arrowDir} onPress={backToLevel} />
      )}
      <Map2BottomBar S={S} s={s} bottomClearance={bottomClearance} active="home" onPress={onBottomBar} />

      {(!nodesReady || reloading) && <LoadingBar nodesReady={nodesReady} />}
      {/* While the map is being created: the same "Creating your world…"
          screen as the splash. The sad Lumo loader only when the connection
          is slow (no network, server not answering, or still loading after
          SLOW_LOAD_MS); user, 2026-10-22. */}
      {!nodesReady && (
        <View style={S.overlay} pointerEvents="none">
          {slowLoading
            ? <LumoLoader label="Slow connection, still loading your map…" />
            : <WorldLoading insetTop={insets.top} messages={MAP_MESSAGES} intervalMs={MAP_MESSAGE_MS} loop />}
        </View>
      )}

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
      <TourOfferModal
        visible={tourOfferVisible}
        onAccept={handleAcceptTour}
        onDecline={handleDeclineTour}
      />
    </View>
  );
}

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  Animated, FlatList, Platform, Text, TouchableOpacity, View, useWindowDimensions,
  type CellRendererProps, type ViewToken, type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import LumoLoader from '../../../components/LumoLoader';
import StreakFrozenModal from '../../../components/StreakFrozenModal';
import AuthRequiredModal from '../../../components/AuthRequiredModal';
import StartSurahModal from '../../../components/StartSurahModal';
import { useAuthStore } from '../../../store/authStore';
import { isGuest } from '../../../utils/guest';
import { getCachedRecommended, subscribeRecommended } from '../../../services/bootCache';
import { addBreadcrumb, setCrashContext } from '../../../services/crashReporter';
import type { MapNavProp, TabParamList } from '../../../navigation/types';
import { SURAH_TO_SEASON, buildMapModel, estimateAyahRange, trustedLevels, type Section, type SectionNode } from '../map/mapModel';
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
import Map2BottomBar, { BOTTOM_BAR_H, type BottomBarKey } from './components/Map2BottomBar';
import Map2FeedbackButton from './components/Map2FeedbackButton';
import BackToLevelButton from './components/BackToLevelButton';

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
  const bottomClearance = Platform.OS === 'ios' ? Math.round(insets.bottom * 0.55) : 0;
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
    fetchPhase, fetchFirstLevelNow, currentSurahNumRef, returnedFromLevelTick,
  } = useMapData(learning);
  const recommended = getCachedRecommended();
  const [visibleSurahs, setVisibleSurahs] = useState('');
  const { sections, nodesBySlot, activeSlot } = useEnrichedSections(fullLevels, firstLevel, setFullLevels, recommended, visibleSurahs);
  const activeId = activeSlot != null ? nodesBySlot[activeSlot]?.node.id ?? null : null;
  const activeSectionIdx = activeSlot == null ? -1 : sections.findIndex(sec => sec.surahNum === SLOT_SURAH[activeSlot]);
  // Share of the current surah's levels completed, from backend data only.
  const activeSurah = activeSectionIdx >= 0 ? sections[activeSectionIdx].surahNum : null;
  const ringProgress = useMemo(() => {
    if (activeSurah == null) return 0;
    const levels = trustedLevels(activeSurah, fullLevels[activeSurah]);
    if (!levels?.length) return 0;
    return levels.filter(l => l.status === 'completed').length / levels.length;
  }, [activeSurah, fullLevels]);

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
    const rec = getCachedRecommended();
    const slot = rec ? SLOT_OF[`${rec.surah_number}:0`] ?? 0 : 0;
    return bandOfY(layout, layout.cy[slot]);
  });

  const nodesReady = !loadingPaths;
  const { scrollToSlot, jumpToActive, jumpToSurahStart } = useMap2Jump({
    listRef, layout, height, activeSlot, activeId, loading: loadingPaths, returnedFromLevelTick,
    fetchPhase, currentSurahNumRef, suppressFollowRef,
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
  // The jump hook also brings the view back on these; the arrow follows.
  useEffect(() => { setArrowDir(null); }, [activeId, returnedFromLevelTick]);

  // Home pressed from another tab: back to the learner's level.
  useEffect(() => navigation.addListener('tabPress', () => backToLevel()), [navigation, backToLevel]);

  // A surah picked in Search Surahs or Surah Progress arrives as params: jump
  // there once, then clear them so it never re-fires.
  const route = useRoute<RouteProp<TabParamList, 'Map'>>();
  const jumpSurah = route.params?.jumpToSurah;
  useEffect(() => {
    if (jumpSurah == null) return;
    const groupId = route.params?.jumpToGroupId;
    const levelIdx = route.params?.jumpToLevelIdx;
    navigation.setParams({ jumpToSurah: undefined, jumpToGroupId: undefined, jumpToLevelIdx: undefined });
    setArrowDir(null);
    jumpToSurahStart(jumpSurah, groupId != null && levelIdx != null ? { groupId, levelIdx } : undefined);
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
    const margin = 14 * s;
    const right = nx + layout.nodeW / 2 + margin;
    const left = right + cw <= width ? right : Math.max(8 * s, Math.min(width - cw - 8 * s, nx - layout.nodeW / 2 - margin - cw));
    const top = layout.cy[cardSlot] - overlayBand * layout.bandH - ch / 2;
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
            onDismiss={() => setStartPrompt(null)}
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
            onDismiss={() => setRetryNodeId(null)}
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
      ringProgress={ringProgress}
      shakingNodeId={shakingNodeId}
      shakeAnim={shakeAnim}
      fetchingSurah={fetchingSurah}
      onNodePress={onNodePress}
      overlay={item === overlayBand ? overlay : undefined}
    />
  ), [S, layout, nodesBySlot, activeSlot, ringProgress, shakingNodeId, shakeAnim, fetchingSurah, onNodePress, overlayBand, overlay]);

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
        onXp={onXp}
        onSearch={onSearch}
        onProgress={onProgress}
        onJourney={onJourney}
        onReview={onReview}
      />
      <Map2FeedbackButton S={S} s={s} bottom={bottomBarH + 21 * s} onPress={onFeedback} />
      {arrowDir != null && nodesReady && (
        <BackToLevelButton s={s} bottom={bottomBarH + 21 * s} direction={arrowDir} onPress={backToLevel} />
      )}
      <Map2BottomBar S={S} s={s} bottomClearance={bottomClearance} active="home" onPress={onBottomBar} />

      {(!nodesReady || reloading) && <LoadingBar nodesReady={nodesReady} />}
      {!nodesReady && (
        <View style={S.overlay} pointerEvents="none">
          <LumoLoader />
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
    </View>
  );
}

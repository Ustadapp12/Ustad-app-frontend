import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet, SectionList,
  ActivityIndicator, RefreshControl, Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { useResponsiveScale, safeBottomInset } from '../../utils/responsive';
import type { RootNavProp } from '../../navigation/types';
import ShieldIcon from '../../components/ShieldIcon';
import { fetchAllSurahProgress, type SurahProgress } from '../../utils/surahProgress';

interface Props { navigation: RootNavProp }

type Scale = (n: number) => number;

// Real progress should never read as 0%, and unfinished work never as 100%.
function pctLabel(fraction: number): string {
  if (fraction > 0 && fraction < 0.01) return '<1%';
  if (fraction < 1 && fraction > 0.99) return '99%';
  return `${Math.round(fraction * 100)}%`;
}

function ProgressBar({ fraction, color, sc }: { fraction: number; color: string; sc: Scale }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: fraction, duration: 600, useNativeDriver: false }).start();
  }, [anim, fraction]);
  return (
    <View style={{ height: sc(8), borderRadius: sc(4), backgroundColor: colors.border, overflow: 'hidden' }}>
      <Animated.View
        style={{
          height: '100%', borderRadius: sc(4), backgroundColor: color,
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}

export default function SurahProgressScreen({ navigation }: Props) {
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  const sc = useResponsiveScale();
  const styles = useMemo(() => makeStyles(sc), [sc]);

  const [progress, setProgress] = useState<SurahProgress[] | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (asRefresh: boolean) => {
    if (asRefresh) setRefreshing(true);
    try {
      setProgress(await fetchAllSurahProgress());
      setError(false);
    } catch (e) {
      console.warn('[SurahProgressScreen] progress fetch failed:', e);
      setError(true);
    } finally {
      if (asRefresh) setRefreshing(false);
    }
  }, []);

  // Refetch on every focus so coming back from a lesson shows the new level.
  useFocusEffect(useCallback(() => { void load(false); }, [load]));

  const sections = useMemo(() => {
    if (!progress) return [];
    const pct = (p: SurahProgress) => (p.total ? p.completed / p.total : 0);
    const inProgress = progress
      .filter(p => p.state === 'in_progress' || p.state === 'unavailable')
      .sort((a, b) => pct(b) - pct(a) || b.surah.surah_number - a.surah.surah_number);
    const done = progress.filter(p => p.state === 'completed')
      .sort((a, b) => b.surah.surah_number - a.surah.surah_number);
    const notStarted = progress.filter(p => p.state === 'not_started')
      .sort((a, b) => b.surah.surah_number - a.surah.surah_number);
    return [
      { title: 'In progress', data: inProgress },
      { title: 'Completed', data: done },
      { title: 'Not started', data: notStarted },
    ].filter(s => s.data.length > 0);
  }, [progress]);

  const summary = useMemo(() => {
    if (!progress) return null;
    const known = progress.filter(p => p.state !== 'unavailable');
    const levelsDone = known.reduce((n, p) => n + p.completed, 0);
    const levelsTotal = known.reduce((n, p) => n + p.total, 0);
    return {
      surahsDone: progress.filter(p => p.state === 'completed').length,
      levelsDone,
      fraction: levelsTotal ? levelsDone / levelsTotal : 0,
    };
  }, [progress]);

  function openOnMap(p: SurahProgress) {
    navigation.navigate('MainTabs', {
      screen: 'Map',
      params: p.state === 'in_progress' && p.nextGroupId != null && p.nextLevelIdx != null
        ? { jumpToSurah: p.surah.surah_number, jumpToGroupId: p.nextGroupId, jumpToLevelIdx: p.nextLevelIdx }
        : { jumpToSurah: p.surah.surah_number },
    });
  }

  function renderRow({ item: p }: { item: SurahProgress }) {
    const fraction = p.total ? p.completed / p.total : 0;
    const isDone = p.state === 'completed';
    const isUnavailable = p.state === 'unavailable';
    const barColor = isDone ? colors.success : colors.gold;
    let meta: string;
    if (isUnavailable) meta = 'Progress unavailable right now';
    else if (p.state === 'not_started') meta = `Not started · ${p.total} levels`;
    else meta = `${p.completed} of ${p.total} levels`;
    return (
      <TouchableOpacity
        style={[styles.row, isDone && styles.rowDone]}
        activeOpacity={0.7}
        onPress={() => openOnMap(p)}
        accessibilityLabel={`${p.surah.name_en}, ${meta}`}
      >
        <View style={styles.rowTop}>
          <View style={[styles.numBadge, isDone && { backgroundColor: colors.successBg }]}>
            <Text style={[styles.numBadgeText, isDone && { color: colors.success }]}>{p.surah.surah_number}</Text>
          </View>
          <View style={styles.rowMid}>
            <Text style={styles.rowNameEn} numberOfLines={1}>{p.surah.name_en}</Text>
            <Text style={styles.rowMeta} numberOfLines={1}>{meta}</Text>
          </View>
          <View style={styles.rowRight}>
            <Text style={styles.rowNameAr} numberOfLines={1}>{p.surah.name_ar}</Text>
            {!isUnavailable && (
              <Text style={[styles.rowPct, isDone && { color: colors.success }]}>{pctLabel(fraction)}</Text>
            )}
          </View>
        </View>
        {!isUnavailable && <ProgressBar fraction={fraction} color={barColor} sc={sc} />}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Back"
        >
          <Image source={require('../../../assets/back_arrow.png')} style={styles.backIcon} resizeMode="contain" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Progress</Text>
        <View style={styles.backBtn} />
      </View>

      {!progress && !error && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.centerText}>Loading your progress</Text>
        </View>
      )}

      {!progress && error && (
        <View style={styles.center}>
          <Text style={styles.centerText}>Couldn't load your progress.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => void load(false)}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      {progress && summary && (
        <SectionList
          sections={sections}
          keyExtractor={p => String(p.surah.surah_number)}
          renderItem={renderRow}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionTitle}>{section.title} ({section.data.length})</Text>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: sc(24) + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.primary} colors={[colors.primary]} />}
          ListHeaderComponent={
            <View style={styles.summaryCard}>
              <ShieldIcon size={sc(44)} />
              <View style={styles.summaryText}>
                <Text style={styles.summaryTitle}>{summary.surahsDone} of 114 surahs complete</Text>
                <Text style={styles.summaryMeta}>
                  {summary.levelsDone} {summary.levelsDone === 1 ? 'level' : 'levels'} done · {pctLabel(summary.fraction)} of the Quran
                </Text>
                <View style={{ marginTop: sc(8) }}>
                  <ProgressBar fraction={summary.fraction} color={colors.primary} sc={sc} />
                </View>
              </View>
            </View>
          }
        />
      )}
    </View>
  );
}

function makeStyles(sc: Scale) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: sc(12), paddingBottom: sc(8),
    },
    backBtn: { width: sc(36), height: sc(36), borderRadius: sc(18), alignItems: 'center', justifyContent: 'center' },
    backIcon: { width: sc(20), height: sc(20), tintColor: colors.darkText },
    headerTitle: { fontFamily: 'Nunito-Bold', fontSize: sc(18), color: colors.darkText },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: sc(10), paddingHorizontal: sc(24) },
    centerText: { fontFamily: 'Nunito-Regular', fontSize: sc(14), color: colors.mutedText, textAlign: 'center' },
    retryBtn: { backgroundColor: colors.primary, borderRadius: sc(12), paddingHorizontal: sc(20), paddingVertical: sc(10) },
    retryText: { fontFamily: 'Nunito-Bold', fontSize: sc(14), color: colors.white },
    listContent: { paddingHorizontal: sc(16) },
    summaryCard: {
      flexDirection: 'row', alignItems: 'center', gap: sc(12),
      backgroundColor: colors.primaryBg, borderRadius: sc(16), padding: sc(14), marginBottom: sc(8),
      borderWidth: 1.5, borderColor: colors.primaryLight,
    },
    summaryText: { flex: 1 },
    summaryTitle: { fontFamily: 'Nunito-Bold', fontSize: sc(16), color: colors.darkText },
    summaryMeta: { fontFamily: 'Nunito-Regular', fontSize: sc(12), color: colors.mutedText, marginTop: 2 },
    sectionTitle: {
      fontFamily: 'Nunito-Bold', fontSize: sc(12), color: colors.mutedText,
      textTransform: 'uppercase', letterSpacing: 0.8, marginTop: sc(14), marginBottom: sc(8),
    },
    row: {
      backgroundColor: colors.white, borderRadius: sc(14), gap: sc(8),
      paddingHorizontal: sc(12), paddingVertical: sc(10), marginBottom: sc(8),
      borderWidth: 1.5, borderColor: colors.border,
    },
    rowDone: { borderColor: colors.success, backgroundColor: colors.successBg },
    rowTop: { flexDirection: 'row', alignItems: 'center', gap: sc(10) },
    numBadge: {
      width: sc(30), height: sc(30), borderRadius: sc(15),
      backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center',
    },
    numBadgeText: { fontFamily: 'Nunito-Bold', fontSize: sc(12), color: colors.primary },
    rowMid: { flex: 1 },
    rowNameEn: { fontFamily: 'Nunito-Bold', fontSize: sc(14), color: colors.darkText },
    rowMeta: { fontFamily: 'Nunito-Regular', fontSize: sc(11), color: colors.mutedText, marginTop: 2 },
    rowRight: { alignItems: 'flex-end' },
    rowNameAr: { fontFamily: 'Nunito-Bold', fontSize: sc(15), color: colors.darkText },
    rowPct: { fontFamily: 'Nunito-Bold', fontSize: sc(12), color: colors.goldDark, marginTop: 2 },
  });
}

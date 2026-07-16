import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { leaderboardApi } from '../../api';
import { colors } from '../../theme/colors';
import { useResponsiveScale } from '../../utils/responsive';
import type { LeaderboardEntry } from '../../types/api';

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
const MEDAL_COLOR: Record<number, string> = {
  1: '#F0C040', 2: '#B0B8C8', 3: '#C87840',
};
// Same emoji convention as OnboardGenderScreen's male/female picker, so a
// learner's leaderboard avatar matches the gender they picked during
// onboarding. Gender is only known for verified accounts (see backend
// leaderboard/service.py) and may still be unset even then — falls back to
// a neutral avatar in that case.
const AVATAR_NEUTRAL = '🧑';
function avatarForGender(gender: string | null | undefined): string {
  if (gender === 'female') return '👧';
  if (gender === 'male') return '👦';
  return AVATAR_NEUTRAL;
}
// Above this, center a phone-proportioned column instead of stretching the
// podium/rows edge-to-edge (or leaving bare whitespace on the sides) on
// tablets/wide screens — a no-op on phones, which never exceed this width.
const MAX_CONTENT_W = 520;

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const sc = useResponsiveScale();
  const styles = useMemo(() => makeStyles(sc, insets), [sc, insets]);

  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(false);
    try {
      const data = await leaderboardApi.top();
      setEntries(data.entries);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  // Cheap 60s cache-free refresh on focus — the backend itself caches for
  // 60s (see leaderboard/router.py), so this never over-fetches in practice.
  useFocusEffect(useCallback(() => { void load({ silent: true }); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load({ silent: true });
    setRefreshing(false);
  };

  const floatAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: 1, duration: 1300, useNativeDriver: true }),
      Animated.timing(floatAnim, { toValue: 0, duration: 1300, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  const lumaY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -9] });

  // "Me" is identified by display_name match — the backend response carries
  // no user_id/is_me flag (see leaderboard/schemas.py). This misfires if two
  // users share a display name, and if the user isn't in the top 13 they
  // simply won't be highlighted anywhere in this list.
  const myName = user?.name;
  const podium = entries?.slice(0, 3) ?? [];
  const rest = entries?.slice(3) ?? [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>🏆 TOP LEARNERS</Text>
          <Text style={styles.headerTitle}>Leaderboard</Text>
        </View>
        <Animated.Image
          source={require('../../../assets/images/lumo_transparent.png')}
          style={[styles.lumaImg, { transform: [{ translateY: lumaY }] }]}
          resizeMode="contain"
        />
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>Couldn't load the leaderboard.</Text>
          <Text style={styles.errorRetry} onPress={() => void load()}>Tap to retry</Text>
        </View>
      ) : !entries?.length ? (
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>No rankings yet — be the first to earn XP!</Text>
        </View>
      ) : (
        <View style={styles.contentWrap}>
          {/* Top 3 podium — only rendered for however many entries actually exist */}
          {podium.length > 0 && (
            <View style={styles.podium}>
              {podium[1] && (
                <View style={[styles.podiumItem, { marginTop: sc(18) }]}>
                  <Text style={styles.podiumAvatar}>{avatarForGender(podium[1].gender)}</Text>
                  <View style={[styles.podiumBadge, { backgroundColor: MEDAL_COLOR[2] }]}>
                    <Text style={styles.podiumRankText}>2</Text>
                  </View>
                  <Text style={styles.podiumName} numberOfLines={1}>{podium[1].display_name.split(' ')[0]}</Text>
                  <Text style={styles.podiumXP}>{podium[1].xp.toLocaleString()} XP</Text>
                </View>
              )}
              {podium[0] && (
                <View style={[styles.podiumItem, { marginBottom: sc(10) }]}>
                  <Text style={styles.podiumAvatarLarge}>{avatarForGender(podium[0].gender)}</Text>
                  <View style={[styles.podiumBadge, styles.podiumBadgeLarge, { backgroundColor: MEDAL_COLOR[1] }]}>
                    <Text style={styles.podiumRankTextLarge}>1</Text>
                  </View>
                  <Text style={styles.podiumName} numberOfLines={1}>{podium[0].display_name.split(' ')[0]}</Text>
                  <Text style={[styles.podiumXP, { color: colors.gold }]}>{podium[0].xp.toLocaleString()} XP</Text>
                </View>
              )}
              {podium[2] && (
                <View style={[styles.podiumItem, { marginTop: sc(26) }]}>
                  <Text style={styles.podiumAvatar}>{avatarForGender(podium[2].gender)}</Text>
                  <View style={[styles.podiumBadge, { backgroundColor: MEDAL_COLOR[3] }]}>
                    <Text style={styles.podiumRankText}>3</Text>
                  </View>
                  <Text style={styles.podiumName} numberOfLines={1}>{podium[2].display_name.split(' ')[0]}</Text>
                  <Text style={styles.podiumXP}>{podium[2].xp.toLocaleString()} XP</Text>
                </View>
              )}
            </View>
          )}

          {/* List */}
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          >
            {rest.map(p => {
              const isMe = !!myName && p.display_name === myName;
              return (
                <View key={p.rank} style={[styles.row, isMe && styles.rowMe]}>
                  <Text style={[styles.rowRank, isMe && { color: colors.primary }]}>#{p.rank}</Text>
                  <View style={styles.rowAvatar}><Text style={{ fontSize: 18 }}>{avatarForGender(p.gender)}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, isMe && { color: colors.primary }]} numberOfLines={1} ellipsizeMode="tail">{isMe ? `${p.display_name} (You)` : p.display_name}</Text>
                  </View>
                  <Text style={[styles.rowXP, isMe && { color: colors.primary }]}>{p.xp.toLocaleString()} XP</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function makeStyles(sc: (n: number) => number, insets: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.lightBg },
    contentWrap: { flex: 1, width: '100%', maxWidth: MAX_CONTENT_W, alignSelf: 'center' },
    centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: sc(32), gap: sc(10) },
    errorText: { fontFamily: 'Nunito_700Bold', fontSize: sc(14), color: colors.mutedText, textAlign: 'center' },
    errorRetry: { fontFamily: 'Nunito_700Bold', fontSize: sc(13), color: colors.primary },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: sc(22), paddingBottom: sc(4),
    },
    headerLabel: { fontFamily: 'Nunito_700Bold', fontSize: sc(10), color: colors.mutedText, letterSpacing: 1.5 },
    headerTitle: { fontFamily: 'Nunito_700Bold', fontSize: sc(22), color: colors.darkText },
    lumaImg: { width: sc(62), height: sc(62) },
    podium: {
      flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end',
      paddingHorizontal: sc(20), paddingVertical: sc(14),
      backgroundColor: 'white', marginHorizontal: sc(16), borderRadius: sc(20), marginBottom: sc(12),
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    },
    podiumItem: { flex: 1, alignItems: 'center', gap: 3 },
    podiumAvatar: { fontSize: sc(28) },
    podiumAvatarLarge: { fontSize: sc(36) },
    podiumBadge: {
      width: sc(22), height: sc(22), borderRadius: sc(11), alignItems: 'center', justifyContent: 'center', marginTop: -6,
    },
    podiumBadgeLarge: { width: sc(28), height: sc(28), borderRadius: sc(14) },
    podiumRankText: { fontFamily: 'Nunito_700Bold', fontSize: sc(11), color: 'white' },
    podiumRankTextLarge: { fontFamily: 'Nunito_700Bold', fontSize: sc(14), color: 'white' },
    podiumName: { fontFamily: 'Nunito_700Bold', fontSize: sc(11), color: colors.darkText, textAlign: 'center', marginTop: 4 },
    podiumXP: { fontFamily: 'Nunito_700Bold', fontSize: sc(10), color: colors.mutedText },
    scroll: { paddingHorizontal: sc(16), paddingBottom: sc(30) + insets.bottom },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: sc(12),
      backgroundColor: colors.white, borderRadius: sc(14), paddingHorizontal: sc(14), paddingVertical: sc(12), marginBottom: sc(8),
      borderWidth: 1.5, borderColor: colors.border,
    },
    rowMe: { borderColor: colors.primary, backgroundColor: '#F0FAF5' },
    rowRank: { fontFamily: 'Nunito_700Bold', fontSize: sc(14), color: colors.mutedText, width: sc(28), textAlign: 'center' },
    rowAvatar: {
      width: sc(38), height: sc(38), borderRadius: sc(19), backgroundColor: colors.lightBg,
      alignItems: 'center', justifyContent: 'center',
    },
    rowName: { fontFamily: 'Nunito_700Bold', fontSize: sc(13), color: colors.darkText },
    rowXP: { fontFamily: 'Nunito_700Bold', fontSize: sc(13), color: colors.mutedText },
  });
}

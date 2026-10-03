import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { leaderboardApi } from '../../api';
import { colors } from '../../theme/colors';
import { useResponsiveScale, safeBottomInset } from '../../utils/responsive';
import { isGuest } from '../../utils/guest';
import GuestGate from '../../components/GuestGate';
import MascotShadow from '../../components/MascotShadow';
import LumoInfoModal from '../../components/LumoInfoModal';
import LoadingStatusText from '../../components/LoadingStatusText';
import type { LeaderboardEntry } from '../../types/api';

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
const MEDAL_COLOR: Record<number, string> = {
  1: '#F0C040', 2: '#B0B8C8', 3: '#C87840',
};
// Leaderboard-only character art — distinct from utils/avatar.ts's
// male1/male2/female1/female2 (the user's own Welcome/Profile avatar, keyed
// by user id + their explicit variant pick). LeaderboardEntry carries no
// user id, only display_name/gender, so there's no way to reconcile a row
// here with the same person's actual profile avatar — this is a separate,
// name-hashed identity that's merely stable across reloads, not a match to
// what they see on their own profile.
const MALE_LEADERBOARD_AVATARS = [
  require('../../../assets/characters/leaderboard/lb_male_1.png'),
  require('../../../assets/characters/leaderboard/lb_male_2.png'),
];
const FEMALE_LEADERBOARD_AVATARS = [
  require('../../../assets/characters/leaderboard/lb_female_1.png'),
  require('../../../assets/characters/leaderboard/lb_female_2.png'),
  require('../../../assets/characters/leaderboard/lb_female_3.png'),
];
// Gender unset/unknown (still common — see backend leaderboard/service.py)
// draws from the full 5-character pool rather than a dedicated neutral
// asset, per request — same stable-per-name mechanism as everyone else.
const ALL_LEADERBOARD_AVATARS = [...MALE_LEADERBOARD_AVATARS, ...FEMALE_LEADERBOARD_AVATARS];

/** Same hashing approach as utils/avatar.ts's stablePickIndex, keyed on
 * display_name (the only per-row identity the leaderboard API exposes)
 * instead of user id. Same input always lands on the same character. */
function stableIndexForName(name: string, length: number): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % length;
}

function avatarForEntry(p: { display_name: string; gender?: string | null }) {
  const pool =
    p.gender === 'male' ? MALE_LEADERBOARD_AVATARS
    : p.gender === 'female' ? FEMALE_LEADERBOARD_AVATARS
    : ALL_LEADERBOARD_AVATARS;
  return pool[stableIndexForName(p.display_name, pool.length)];
}
// Above this, center a phone-proportioned column instead of stretching the
// podium/rows edge-to-edge (or leaving bare whitespace on the sides) on
// tablets/wide screens — a no-op on phones, which never exceed this width.
const MAX_CONTENT_W = 520;

export default function LeaderboardScreen() {
  const user = useAuthStore(s => s.user);
  // Split in two so the guard sits above every hook in the real screen —
  // an early return inside LeaderboardContent would change hook order.
  if (isGuest(user)) return <GuestGate feature="The leaderboard" />;
  return <LeaderboardContent />;
}

function LeaderboardContent() {
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  const { user } = useAuthStore();
  const sc = useResponsiveScale();
  const styles = useMemo(() => makeStyles(sc, insets), [sc, insets]);

  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);

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
  // Focus-scoped, not mount-scoped. This is a tab screen, so it stays
  // mounted for the life of the app and the unmount cleanup effectively
  // never ran — the bob kept driving frames the whole time the user was
  // on another tab. useFocusEffect stops it the moment the tab is left.
  useFocusEffect(
    useCallback(() => {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 1300, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1300, useNativeDriver: true }),
      ]));
      loop.start();
      return () => {
        loop.stop();
        floatAnim.setValue(0);
      };
    }, [floatAnim]),
  );
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
          <Text style={styles.headerSubtitle}>Ranked by XP earned</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Animated.Image
            source={require('../../../assets/images/lumo_transparent.png')}
            style={[styles.lumaImg, { transform: [{ translateY: lumaY }] }]}
            resizeMode="contain"
          />
          <MascotShadow width={sc(100)} style={{ position: 'relative', marginTop: -sc(10) }} />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={colors.primary} />
          <LoadingStatusText />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>Couldn't load the leaderboard.</Text>
          <Text style={styles.errorRetry} onPress={() => void load()}>Tap to retry</Text>
          <Text style={styles.feedbackLink} onPress={() => setFeedbackVisible(true)}>Give feedback</Text>
        </View>
      ) : !entries?.length ? (
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>No rankings yet, be the first to earn XP!</Text>
        </View>
      ) : (
        <View style={styles.contentWrap}>
          {/* Top 3 podium — only rendered for however many entries actually exist */}
          {podium.length > 0 && (
            <View style={styles.podium}>
              {podium[1] && (
                <View style={[styles.podiumItem, { marginTop: sc(18) }]}>
                  <View style={styles.podiumAvatarWrap}>
                    <Image source={avatarForEntry(podium[1])} style={styles.podiumAvatarImg} resizeMode="cover" />
                  </View>
                  <View style={[styles.podiumBadge, { backgroundColor: MEDAL_COLOR[2] }]}>
                    <Text style={styles.podiumRankText}>2</Text>
                  </View>
                  <Text style={styles.podiumName} numberOfLines={1}>{podium[1].display_name.split(' ')[0]}</Text>
                  <Text style={styles.podiumXP}>{podium[1].xp.toLocaleString()} XP</Text>
                </View>
              )}
              {podium[0] && (
                <View style={[styles.podiumItem, { marginBottom: sc(10) }]}>
                  <Text style={styles.podiumCrown}>👑</Text>
                  <View style={[styles.podiumAvatarWrap, styles.podiumAvatarWrapLarge]}>
                    <Image source={avatarForEntry(podium[0])} style={styles.podiumAvatarImg} resizeMode="cover" />
                  </View>
                  <View style={[styles.podiumBadge, styles.podiumBadgeLarge, { backgroundColor: MEDAL_COLOR[1] }]}>
                    <Text style={styles.podiumRankTextLarge}>1</Text>
                  </View>
                  <Text style={styles.podiumName} numberOfLines={1}>{podium[0].display_name.split(' ')[0]}</Text>
                  <Text style={[styles.podiumXP, { color: colors.gold }]}>{podium[0].xp.toLocaleString()} XP</Text>
                </View>
              )}
              {podium[2] && (
                <View style={[styles.podiumItem, { marginTop: sc(26) }]}>
                  <View style={styles.podiumAvatarWrap}>
                    <Image source={avatarForEntry(podium[2])} style={styles.podiumAvatarImg} resizeMode="cover" />
                  </View>
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
                  <Image source={avatarForEntry(p)} style={styles.rowAvatar} resizeMode="cover" />
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

      <LumoInfoModal
        visible={feedbackVisible}
        onClose={() => setFeedbackVisible(false)}
        title="Still stuck?"
        message="Email us and we'll sort it out."
        contactEmail="helo.ustadapp@gmail.com"
      />
    </View>
  );
}

function makeStyles(sc: (n: number) => number, insets: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.lightBg },
    contentWrap: { flex: 1, width: '100%', maxWidth: MAX_CONTENT_W, alignSelf: 'center' },
    centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: sc(32), gap: sc(10) },
    errorText: { fontFamily: 'Nunito-Bold', fontSize: sc(14), color: colors.mutedText, textAlign: 'center' },
    errorRetry: { fontFamily: 'Nunito-Bold', fontSize: sc(13), color: colors.primary },
    feedbackLink: { fontFamily: 'Nunito-Regular', fontSize: sc(12), color: colors.mutedText, marginTop: sc(4) },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: sc(22), paddingBottom: sc(4),
    },
    headerLabel: { fontFamily: 'Nunito-Bold', fontSize: sc(10), color: colors.mutedText, letterSpacing: 1.5 },
    headerTitle: { fontFamily: 'Nunito-Bold', fontSize: sc(22), color: colors.darkText },
    headerSubtitle: { fontFamily: 'Nunito-Regular', fontSize: sc(12), color: colors.mutedText, marginTop: sc(2) },
    lumaImg: { width: sc(100), height: sc(100) },
    podium: {
      flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end',
      paddingHorizontal: sc(20), paddingVertical: sc(14),
      backgroundColor: '#F5F7FA', marginHorizontal: sc(16), borderRadius: sc(20), marginBottom: sc(12),
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    },
    podiumItem: { flex: 1, alignItems: 'center', gap: 3 },
    podiumAvatarWrap: {
      width: sc(46), height: sc(46), borderRadius: sc(23),
      backgroundColor: colors.lightBg, overflow: 'hidden',
    },
    podiumAvatarWrapLarge: { width: sc(58), height: sc(58), borderRadius: sc(29) },
    podiumAvatarImg: { width: '100%', height: '100%' },
    podiumCrown: {
      fontSize: sc(26),
      textShadowColor: '#FFD700',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 12,
    },
    podiumBadge: {
      width: sc(22), height: sc(22), borderRadius: sc(11), alignItems: 'center', justifyContent: 'center', marginTop: -6,
    },
    podiumBadgeLarge: { width: sc(28), height: sc(28), borderRadius: sc(14) },
    podiumRankText: { fontFamily: 'Nunito-Bold', fontSize: sc(11), color: '#F5F7FA' },
    podiumRankTextLarge: { fontFamily: 'Nunito-Bold', fontSize: sc(14), color: '#F5F7FA' },
    podiumName: { fontFamily: 'Nunito-Bold', fontSize: sc(11), color: colors.darkText, textAlign: 'center', marginTop: 4 },
    podiumXP: { fontFamily: 'Nunito-Bold', fontSize: sc(10), color: colors.mutedText },
    scroll: { paddingHorizontal: sc(16), paddingBottom: sc(30) + insets.bottom },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: sc(12),
      backgroundColor: colors.white, borderRadius: sc(14), paddingHorizontal: sc(14), paddingVertical: sc(12), marginBottom: sc(8),
      borderWidth: 1.5, borderColor: colors.border,
    },
    rowMe: { borderColor: colors.primary, backgroundColor: '#F0FAF5' },
    rowRank: { fontFamily: 'Nunito-Bold', fontSize: sc(14), color: colors.mutedText, width: sc(28), textAlign: 'center' },
    rowAvatar: {
      width: sc(38), height: sc(38), borderRadius: sc(19), backgroundColor: colors.lightBg,
    },
    rowName: { fontFamily: 'Nunito-Bold', fontSize: sc(13), color: colors.darkText },
    rowXP: { fontFamily: 'Nunito-Bold', fontSize: sc(13), color: colors.mutedText },
  });
}

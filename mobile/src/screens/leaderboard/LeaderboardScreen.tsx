import React, { useMemo,useRef, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme';
import { useResponsiveScale, safeBottomInset } from '../../utils/responsive';
import { isGuest } from '../../utils/guest';
import { avatarForLeaderboardEntry, characterSrcFor } from '../../utils/avatar';
import { formatHijriDate } from '../../utils/hijri';
import GuestGate from '../../components/GuestGate';
import LumoInfoModal from '../../components/LumoInfoModal';
import LoadingStatusText from '../../components/LoadingStatusText';
import MascotShadow from '../../components/MascotShadow';
import { useFocusedLoop } from '../../hooks/useFocusedLoop';
import LeaderboardRow from './LeaderboardRow';
import { makeStyles, designScale } from './styles';
import type { LeaderboardEntry } from '../../types/api';
import { MASCOT } from '../../assets';
import { useLeaderboard } from '../../hooks/api';

// The Figma design's "Bronze League" title and mic badge card are left out
// for now (2026-10-11, user: that feature "isn't for now"); one Lumo sits in
// their place and the list starts higher.

export default function LeaderboardScreen() {
  const user = useAuthStore(s => s.user);
  // Split in two so the guard sits above every hook in the real screen —
  // an early return inside LeaderboardContent would change hook order.
  if (isGuest(user)) return <GuestGate feature="The leaderboard" />;
  return <LeaderboardContent />;
}

function LeaderboardContent() {
  const insets = useSafeAreaInsets();
  const bottomInset = safeBottomInset(insets.bottom);
  const user = useAuthStore(s => s.user);
  const profile = useAuthStore(s => s.profile);
  const sc = useResponsiveScale();
  const d = useMemo(() => designScale(sc), [sc]);
  const styles = useMemo(() => makeStyles(sc, bottomInset), [sc, bottomInset]);

  const { entries, me, loading, error, load } = useLeaderboard();
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  // Recomputed on each focus so the date rolls over if the app stays open
  // past midnight on this tab.
  const [hijriDate, setHijriDate] = useState(() => formatHijriDate());


  // The one load path, first open included. A separate mount useEffect used
  // to fire the same request alongside this on the first focus (review 5.7).
  // `loading` already starts true, so a silent first load still shows the
  // spinner until the list arrives. The backend caches for 60s (see
  // leaderboard/router.py), so refreshing on every focus never over-fetches.
  useFocusEffect(useCallback(() => {
    void load({ silent: true });
    setHijriDate(formatHijriDate());
  }, [load]));

  const floatAnim = useRef(new Animated.Value(0)).current;
  useFocusedLoop(floatAnim, 1300);
  const lumoY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -d(9)] });

  const onRefresh = async () => {
    setRefreshing(true);
    await load({ silent: true });
    setRefreshing(false);
  };

  // The gold row is always the user, and the user is always ranked. The
  // backend flags their row with is_me (matched by user id, so shared
  // display names can't misfire) and always sends their standing as `me`;
  // when they are outside the top entries, that row is shown after the list.
  // Name matching is only the fallback for an older backend without `me`.
  const hasMe = !!me;
  const myName = user?.name;
  const isMeEntry = (p: LeaderboardEntry) =>
    hasMe ? !!p.is_me : !!myName && p.display_name === myName;
  const meOutsideList = hasMe && !entries?.some(p => p.is_me) ? me : null;
  // Your own row always uses the exact avatar Profile shows, saved pick or
  // not, rather than trusting the (up to 60s cached) leaderboard response.
  const myAvatar = characterSrcFor(user?.id ?? '', profile?.gender, profile?.avatar_variant);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.contentWrap}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Leaderboard</Text>
          </View>
          <Text style={styles.date}>{hijriDate}</Text>
        </View>

        <View style={styles.lumoWrap}>
          <Animated.Image
            source={MASCOT.lumoTransparent}
            style={[styles.lumo, { transform: [{ translateY: lumoY }] }]}
            resizeMode="contain"
          />
          <MascotShadow width={d(104)} />
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
          <ScrollView
            style={styles.scrollFill}
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          >
            {entries.map(p => {
              const isMe = isMeEntry(p);
              return (
                <LeaderboardRow
                  key={p.rank}
                  sc={sc}
                  rank={p.rank}
                  name={p.display_name}
                  xp={p.xp}
                  avatar={isMe ? myAvatar : avatarForLeaderboardEntry(p)}
                  isMe={isMe}
                />
              );
            })}
            {meOutsideList && (
              <>
                <Text style={styles.gapDots}>• • •</Text>
                <LeaderboardRow
                  sc={sc}
                  rank={meOutsideList.rank}
                  name={meOutsideList.display_name}
                  xp={meOutsideList.xp}
                  avatar={myAvatar}
                  isMe
                />
              </>
            )}
          </ScrollView>
        )}
      </View>

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

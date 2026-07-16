import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { useResponsiveScale } from '../../utils/responsive';

const MOCK_PLAYERS = [
  { rank: 1, name: 'Aisha Rahman', xp: 4820, avatar: '🧕', isMe: false },
  { rank: 2, name: 'Omar Abdullah', xp: 4150, avatar: '🧔', isMe: false },
  { rank: 3, name: 'Fatima Al-Zahra', xp: 3890, avatar: '👩', isMe: false },
  { rank: 4, name: 'You', xp: 2340, avatar: '🙋', isMe: true },
  { rank: 5, name: 'Yusuf Ibrahim', xp: 2200, avatar: '👦', isMe: false },
  { rank: 6, name: 'Maryam Hassan', xp: 1950, avatar: '👩‍🦱', isMe: false },
  { rank: 7, name: 'Ali Al-Rashid', xp: 1740, avatar: '👨', isMe: false },
  { rank: 8, name: 'Khadijah Nur', xp: 1620, avatar: '👩‍🦳', isMe: false },
  { rank: 9, name: 'Ibrahim Saad', xp: 1480, avatar: '👴', isMe: false },
  { rank: 10, name: 'Zainab Malik', xp: 1200, avatar: '👩‍🦰', isMe: false },
];

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
const MEDAL_COLOR: Record<number, string> = {
  1: '#F0C040', 2: '#B0B8C8', 3: '#C87840',
};

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const sc = useResponsiveScale();
  const styles = useMemo(() => makeStyles(sc), [sc]);

  const floatAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: 1, duration: 1300, useNativeDriver: true }),
      Animated.timing(floatAnim, { toValue: 0, duration: 1300, useNativeDriver: true }),
    ])).start();
  }, []);
  const lumaY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -9] });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>🏆 THIS WEEK</Text>
          <Text style={styles.headerTitle}>Leaderboard</Text>
        </View>
        <Animated.Image
          source={require('../../../assets/images/lumo_transparent.png')}
          style={[styles.lumaImg, { transform: [{ translateY: lumaY }] }]}
          resizeMode="contain"
        />
        <View style={styles.weekBadge}><Text style={styles.weekText}>Week 24</Text></View>
      </View>

      {/* Top 3 podium */}
      <View style={styles.podium}>
        {/* 2nd */}
        <View style={[styles.podiumItem, { marginTop: 18 }]}>
          <Text style={styles.podiumAvatar}>{MOCK_PLAYERS[1].avatar}</Text>
          <View style={[styles.podiumBadge, { backgroundColor: MEDAL_COLOR[2] }]}>
            <Text style={styles.podiumRankText}>2</Text>
          </View>
          <Text style={styles.podiumName} numberOfLines={1}>{MOCK_PLAYERS[1].name.split(' ')[0]}</Text>
          <Text style={styles.podiumXP}>{(MOCK_PLAYERS[1].xp / 1000).toFixed(1)}k XP</Text>
        </View>
        {/* 1st */}
        <View style={[styles.podiumItem, { marginBottom: 10 }]}>
          <Text style={styles.podiumAvatarLarge}>{MOCK_PLAYERS[0].avatar}</Text>
          <View style={[styles.podiumBadge, styles.podiumBadgeLarge, { backgroundColor: MEDAL_COLOR[1] }]}>
            <Text style={styles.podiumRankTextLarge}>1</Text>
          </View>
          <Text style={styles.podiumName} numberOfLines={1}>{MOCK_PLAYERS[0].name.split(' ')[0]}</Text>
          <Text style={[styles.podiumXP, { color: colors.gold }]}>{(MOCK_PLAYERS[0].xp / 1000).toFixed(1)}k XP</Text>
        </View>
        {/* 3rd */}
        <View style={[styles.podiumItem, { marginTop: 26 }]}>
          <Text style={styles.podiumAvatar}>{MOCK_PLAYERS[2].avatar}</Text>
          <View style={[styles.podiumBadge, { backgroundColor: MEDAL_COLOR[3] }]}>
            <Text style={styles.podiumRankText}>3</Text>
          </View>
          <Text style={styles.podiumName} numberOfLines={1}>{MOCK_PLAYERS[2].name.split(' ')[0]}</Text>
          <Text style={styles.podiumXP}>{(MOCK_PLAYERS[2].xp / 1000).toFixed(1)}k XP</Text>
        </View>
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {MOCK_PLAYERS.slice(3).map(p => (
          <View key={p.rank} style={[styles.row, p.isMe && styles.rowMe]}>
            <Text style={[styles.rowRank, p.isMe && { color: colors.primary }]}>#{p.rank}</Text>
            <View style={styles.rowAvatar}><Text style={{ fontSize: 18 }}>{p.avatar}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowName, p.isMe && { color: colors.primary }]}>{p.isMe ? `${user?.name ?? 'You'} (You)` : p.name}</Text>
            </View>
            <Text style={[styles.rowXP, p.isMe && { color: colors.primary }]}>{p.xp.toLocaleString()} XP</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function makeStyles(sc: (n: number) => number) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.lightBg },
    statusBar: { paddingHorizontal: sc(24), paddingVertical: sc(6) },
    time: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: colors.darkText },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: sc(22), paddingBottom: sc(4),
    },
    headerLabel: { fontFamily: 'Nunito_700Bold', fontSize: 10, color: colors.mutedText, letterSpacing: 1.5 },
    headerTitle: { fontFamily: 'Nunito_700Bold', fontSize: 22, color: colors.darkText },
    lumaImg: { width: 62, height: 62 },
    weekBadge: { backgroundColor: colors.primaryBg, borderRadius: 12, paddingHorizontal: sc(12), paddingVertical: sc(6) },
    weekText: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: colors.primary },
    podium: {
      flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end',
      paddingHorizontal: sc(20), paddingVertical: sc(14),
      backgroundColor: 'white', marginHorizontal: sc(16), borderRadius: 20, marginBottom: sc(12),
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    },
    podiumItem: { flex: 1, alignItems: 'center', gap: 3 },
    podiumAvatar: { fontSize: 28 },
    podiumAvatarLarge: { fontSize: 36 },
    podiumBadge: {
      width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: -6,
    },
    podiumBadgeLarge: { width: 28, height: 28, borderRadius: 14 },
    podiumRankText: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: 'white' },
    podiumRankTextLarge: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: 'white' },
    podiumName: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: colors.darkText, textAlign: 'center', marginTop: 4 },
    podiumXP: { fontFamily: 'Nunito_700Bold', fontSize: 10, color: colors.mutedText },
    scroll: { paddingHorizontal: sc(16), paddingBottom: sc(30) },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: colors.white, borderRadius: 14, paddingHorizontal: sc(14), paddingVertical: sc(12), marginBottom: sc(8),
      borderWidth: 1.5, borderColor: colors.border,
    },
    rowMe: { borderColor: colors.primary, backgroundColor: '#F0FAF5' },
    rowRank: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.mutedText, width: 28, textAlign: 'center' },
    rowAvatar: {
      width: 38, height: 38, borderRadius: 19, backgroundColor: colors.lightBg,
      alignItems: 'center', justifyContent: 'center',
    },
    rowName: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.darkText },
    rowXP: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.mutedText },
  });
}


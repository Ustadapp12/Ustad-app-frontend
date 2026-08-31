import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { isGuest } from '../../utils/guest';
import MascotShadow from '../../components/MascotShadow';
import { colors } from '../../theme/colors';
import { safeBottomInset } from '../../utils/responsive';
import type { RootNavProp } from '../../navigation/types';

interface Props {
  navigation: RootNavProp;
}

const HOW_TO_EARN = [
  { emoji: '✏️', label: 'Answer exercises', body: 'Every correct answer inside a lesson earns you XP right away.' },
  { emoji: '🎯', label: 'Complete a level', body: 'Finishing a level tops up your XP with a completion bonus.' },
  { emoji: '🔥', label: 'Keep your streak going', body: 'Each day your streak continues adds bonus XP, with bigger rewards at streak milestones.' },
];

export default function XPScreen({ navigation }: Props) {
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  const { learning, user } = useAuthStore();
  const guestUser = isGuest(user);
  const xpTotal = guestUser ? null : (learning?.xp_total ?? 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>XP</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={{ width: 110, height: 110, marginBottom: 4 }}>
          <Image
            source={require('../../../assets/images/lumo_xp.png')}
            style={styles.luma}
            resizeMode="contain"
          />
          <MascotShadow width={110} />
        </View>

        <View style={styles.xpBadge}>
          <Text style={styles.xpNumber}>{xpTotal ?? '—'}</Text>
          <Text style={styles.xpLabel}>Total XP</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>What is XP</Text>
          <Text style={styles.cardBody}>
            XP stands for experience points. It is the number that tracks how much you have practiced and
            learned in the app. Every lesson you work through adds to your total, so it only ever grows as
            you keep coming back.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>How to earn XP</Text>
          {HOW_TO_EARN.map(item => (
            <View key={item.label} style={styles.earnRow}>
              <Text style={styles.earnEmoji}>{item.emoji}</Text>
              <View style={styles.earnText}>
                <Text style={styles.earnLabel}>{item.label}</Text>
                <Text style={styles.earnBody}>{item.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.comingSoonCard}>
          <Text style={styles.comingSoonEmoji}>🚧</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.comingSoonTitle}>Coming soon</Text>
            <Text style={styles.comingSoonBody}>
              Daily quests are on the way, giving you even more ways to earn XP.
            </Text>
          </View>
        </View>

        <View style={{ height: insets.bottom + 16 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.goldBg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  closeBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.midText },
  headerTitle: { fontFamily: 'Nunito_700Bold', fontSize: 17, color: colors.darkText },
  headerSpacer: { width: 38, height: 38 },
  scroll: { alignItems: 'center', paddingHorizontal: 22, paddingBottom: 16 },
  luma: { width: 110, height: 110, marginBottom: 0 },
  xpBadge: {
    alignItems: 'center', backgroundColor: colors.white, borderRadius: 20,
    paddingHorizontal: 28, paddingVertical: 14, marginBottom: 20,
    borderWidth: 2, borderColor: colors.goldBorder,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  xpNumber: { fontFamily: 'Nunito_700Bold', fontSize: 48, color: colors.gold, lineHeight: 52 },
  xpLabel: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.mutedText, letterSpacing: 0.3, marginTop: 2 },
  card: {
    width: '100%', backgroundColor: colors.white, borderRadius: 18, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: colors.darkText, marginBottom: 8 },
  cardBody: { fontFamily: 'Nunito_400Regular', fontSize: 13.5, color: colors.mutedText, lineHeight: 20 },
  earnRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border,
  },
  earnEmoji: { fontSize: 20, marginTop: 1 },
  earnText: { flex: 1 },
  earnLabel: { fontFamily: 'Nunito_700Bold', fontSize: 13.5, color: colors.darkText, marginBottom: 2 },
  earnBody: { fontFamily: 'Nunito_400Regular', fontSize: 12.5, color: colors.mutedText, lineHeight: 18 },
  comingSoonCard: {
    width: '100%', backgroundColor: colors.goldBg, borderRadius: 16, padding: 14, marginTop: 4,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: colors.goldBorder,
  },
  comingSoonEmoji: { fontSize: 22 },
  comingSoonTitle: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.darkText, marginBottom: 2 },
  comingSoonBody: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: colors.mutedText, lineHeight: 17 },
});

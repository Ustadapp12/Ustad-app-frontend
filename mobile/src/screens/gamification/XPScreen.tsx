import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import MascotShadow from '../../components/MascotShadow';
import { safeBottomInset } from '../../utils/responsive';
import type { RootNavProp } from '../../navigation/types';
import { selectIsGuest, selectXpTotal } from '../../store/selectors/auth';
import { styles } from './XPScreen.styles';
import { MASCOT } from '../../assets';

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
  // Exact values only (store/selectors/auth.ts), never the whole store.
  const guestUser = useAuthStore(selectIsGuest);
  const storedXp = useAuthStore(selectXpTotal);
  const xpTotal = guestUser ? null : (storedXp ?? 0);

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
            source={MASCOT.lumoXp}
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

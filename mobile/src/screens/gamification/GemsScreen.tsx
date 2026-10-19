import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { safeBottomInset } from '../../utils/responsive';
import type { RootNavProp } from '../../navigation/types';

interface Props {
  navigation: RootNavProp;
}

// Gems aren't live yet (see Map2Header.tsx), so this is purely an explainer —
// no balance to show, just what they're for. The hero is the same gem icon
// the map HUD's own Gems pill uses (MAP2_IMAGES.gems), not a generic mascot,
// so this page reads as "more about that pill" rather than a different thing.
export default function GemsScreen({ navigation }: Props) {
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gems</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Image
          source={require('../../../assets/map2_assets/stat_gems.png')}
          style={styles.gemHero}
          resizeMode="contain"
        />

        <View style={styles.gemBadge}>
          <Text style={styles.gemLabel}>Not live yet</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>What are Gems</Text>
          <Text style={styles.cardBody}>
            Gems are a separate currency from XP. Where XP tracks how much you've practiced, Gems will be
            something you spend, for example to buy extra XP. They aren't live yet, this page will grow once
            they are.
          </Text>
        </View>

        <View style={{ height: insets.bottom + 16 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.blueBg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  closeBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontFamily: 'Nunito-Bold', fontSize: 14, color: colors.midText },
  headerTitle: { fontFamily: 'Nunito-Bold', fontSize: 17, color: colors.darkText },
  headerSpacer: { width: 38, height: 38 },
  scroll: { alignItems: 'center', paddingHorizontal: 22, paddingBottom: 16 },
  gemHero: { width: 110, height: 110, marginBottom: 4 },
  gemBadge: {
    alignItems: 'center', backgroundColor: colors.white, borderRadius: 16,
    paddingHorizontal: 20, paddingVertical: 10, marginBottom: 20,
    borderWidth: 2, borderColor: colors.blueBorder,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  gemLabel: { fontFamily: 'Nunito-Bold', fontSize: 13, color: colors.mutedText, letterSpacing: 0.3 },
  card: {
    width: '100%', backgroundColor: colors.white, borderRadius: 18, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontFamily: 'Nunito-Bold', fontSize: 15, color: colors.darkText, marginBottom: 8 },
  cardBody: { fontFamily: 'Nunito-Regular', fontSize: 13.5, color: colors.mutedText, lineHeight: 20 },
});

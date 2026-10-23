import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { safeBottomInset } from '../../utils/responsive';
import type { RootNavProp } from '../../navigation/types';
import { styles } from './GemsScreen.styles';
import { HOME_IMAGES } from '../../assets';

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
          source={HOME_IMAGES.statGems}
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

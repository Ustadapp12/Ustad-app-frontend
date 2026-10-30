import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MascotShadow from '../../components/MascotShadow';
import { safeBottomInset } from '../../utils/responsive';
import type { RootNavProp } from '../../navigation/types';
import { styles } from './HeartsScreen.styles';
import { GAMIFICATION_IMAGES, MASCOT } from '../../assets';

interface Props {
  navigation: RootNavProp;
}

// Same three images LessonHeader actually uses for its heart row (see
// MAX_HEARTS/MAX_MISTAKES there) — the visualization below is the real
// full -> half -> empty states, not a redrawn approximation of them.
const HEART_FULL = GAMIFICATION_IMAGES.redh;
const HEART_HALF = GAMIFICATION_IMAGES.halfh;
const HEART_EMPTY = GAMIFICATION_IMAGES.whiteh;

export default function HeartsScreen({ navigation }: Props) {
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hearts</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.mascotBox}>
          <Image
            source={MASCOT.lumoTransparent}
            style={styles.luma}
            resizeMode="contain"
          />
          <MascotShadow width={110} />
        </View>

        <View style={styles.heartBadge}>
          <Text style={styles.heartNumber}>5</Text>
          <Text style={styles.heartLabel}>Hearts per level</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>What are Hearts</Text>
          <Text style={styles.cardBody}>
            Hearts track how many mistakes you can make in a level before it ends. Every level starts fresh
            with 5 hearts, and each wrong answer only costs half a heart, so you really get 10 chances. Run
            out and the level ends, but nothing is lost, you can start it again straight away.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>How a heart drops</Text>
          <View style={styles.vizRow}>
            <Image source={HEART_FULL} style={styles.vizHeart} resizeMode="contain" />
            <Text style={styles.vizArrow}>→</Text>
            <Image source={HEART_HALF} style={styles.vizHeart} resizeMode="contain" />
            <Text style={styles.vizArrow}>→</Text>
            <Image source={HEART_EMPTY} style={styles.vizHeart} resizeMode="contain" />
          </View>
          <Text style={styles.vizCaption}>Full → one mistake → half → one more mistake → gone</Text>
        </View>

        <View style={{ height: insets.bottom + 16 }} />
      </ScrollView>
    </View>
  );
}

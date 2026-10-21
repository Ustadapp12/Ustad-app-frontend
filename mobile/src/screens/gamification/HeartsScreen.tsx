import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MascotShadow from '../../components/MascotShadow';
import { colors } from '../../theme/colors';
import { safeBottomInset } from '../../utils/responsive';
import type { RootNavProp } from '../../navigation/types';

interface Props {
  navigation: RootNavProp;
}

// Same three images LessonHeader actually uses for its heart row (see
// MAX_HEARTS/MAX_MISTAKES there) — the visualization below is the real
// full -> half -> empty states, not a redrawn approximation of them.
const HEART_FULL = require('../../../assets/screens/gamification/redh.png');
const HEART_HALF = require('../../../assets/screens/gamification/halfh.png');
const HEART_EMPTY = require('../../../assets/screens/gamification/whiteh.png');

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
        <View style={{ width: 110, height: 110, marginBottom: 4 }}>
          <Image
            source={require('../../../assets/shared/mascot/lumo_transparent.png')}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.redBg },
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
  luma: { width: 110, height: 110, marginBottom: 0 },
  heartBadge: {
    alignItems: 'center', backgroundColor: colors.white, borderRadius: 20,
    paddingHorizontal: 28, paddingVertical: 14, marginBottom: 20,
    borderWidth: 2, borderColor: colors.redBorder,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  heartNumber: { fontFamily: 'Nunito-Bold', fontSize: 48, color: colors.red, lineHeight: 52 },
  heartLabel: { fontFamily: 'Nunito-Bold', fontSize: 13, color: colors.mutedText, letterSpacing: 0.3, marginTop: 2 },
  card: {
    width: '100%', backgroundColor: colors.white, borderRadius: 18, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontFamily: 'Nunito-Bold', fontSize: 15, color: colors.darkText, marginBottom: 8 },
  cardBody: { fontFamily: 'Nunito-Regular', fontSize: 13.5, color: colors.mutedText, lineHeight: 20 },
  vizRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4, marginBottom: 10 },
  vizHeart: { width: 40, height: 36 },
  vizArrow: { fontFamily: 'Nunito-Bold', fontSize: 18, color: colors.mutedText },
  vizCaption: { fontFamily: 'Nunito-Regular', fontSize: 12, color: colors.mutedText, textAlign: 'center' },
});

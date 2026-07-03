import React, { useEffect } from 'react';
import { View } from 'react-native';
import type { RootNavProp } from '../../navigation/types';

interface Props {
  navigation: RootNavProp;
  route: { params: { groupId: string; surahName: string; surahNumber: number } };
}

// Lesson preview screen commented out for now — navigate directly to LessonSession.
// To restore: uncomment the original content below.
export default function LessonStartScreen({ navigation, route }: Props) {
  const { surahName, surahNumber, groupId } = route.params;

  useEffect(() => {
    navigation.replace('LessonSession', { groupId, surahName, surahNumber });
  }, []);

  return <View style={{ flex: 1 }} />;
}

/*
import { Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';

const PRACTICE_ITEMS = [
  { emoji: '🎧', label: 'Listen to each ayah' },
  { emoji: '📝', label: 'Fill in the blanks' },
  { emoji: '🔀', label: 'Order the verses' },
  { emoji: '✅', label: 'Multiple choice recall' },
];

function LessonStartScreenFull({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { surahName, surahNumber, groupId } = route.params;

  const floatAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: 1, duration: 1300, useNativeDriver: true }),
      Animated.timing(floatAnim, { toValue: 0, duration: 1300, useNativeDriver: true }),
    ])).start();
  }, []);

  const lumaY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

  return (
    <LinearGradient colors={['#0D3B26', '#1A5C3A', '#0D2B1C']} style={styles.container}>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lesson Preview</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.surahBadge, { opacity: fadeAnim }]}>
          <Text style={styles.surahNum}>{surahNumber}</Text>
          <Text style={styles.surahArabic}>سورة {surahName}</Text>
          <Text style={styles.surahName}>Surah {surahName}</Text>
        </Animated.View>

        <View style={styles.lumaRow}>
          <View style={styles.speechBubble}>
            <Text style={styles.speechText}>
              Bismillah! Let's memorise{'\n'}Surah {surahName} together! 🌟
            </Text>
            <View style={styles.speechTail} />
          </View>
          <Animated.Image
            source={require('../../../assets/images/lumo_transparent.png')}
            style={[styles.lumaImg, { transform: [{ translateY: lumaY }] }]}
            resizeMode="contain"
          />
        </View>

        <View style={styles.practiceCard}>
          <Text style={styles.practiceTitle}>What You'll Practice</Text>
          {PRACTICE_ITEMS.map((item, i) => (
            <View key={i} style={styles.practiceRow}>
              <View style={styles.practiceIcon}><Text style={{ fontSize: 18 }}>{item.emoji}</Text></View>
              <Text style={styles.practiceLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.rewardRow}>
          <View style={styles.rewardBadge}><Text style={{ fontSize: 14 }}>⚡</Text><Text style={styles.rewardText}>+20 XP for completing</Text></View>
          <View style={styles.rewardBadge}><Text style={{ fontSize: 14 }}>❤️</Text><Text style={styles.rewardText}>5 hearts</Text></View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => navigation.navigate('LessonSession', { groupId, surahName, surahNumber })}
          activeOpacity={0.9}
        >
          <Text style={styles.startBtnText}>Start Lesson  →</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  backText: { fontSize: 18, color: 'white', fontWeight: '700' },
  headerTitle: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  scroll: { paddingHorizontal: 22, paddingBottom: 20, alignItems: 'center' },
  surahBadge: { width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 3, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', marginTop: 20, marginBottom: 18, shadowColor: colors.gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 8 },
  surahNum: { fontFamily: 'Nunito_700Bold', fontSize: 36, color: colors.gold },
  surahArabic: { fontFamily: 'NotoNaskhArabic_400Regular', fontSize: 16, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  surahName: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  lumaRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 22, width: '100%', paddingLeft: 10 },
  speechBubble: { flex: 1, backgroundColor: 'white', borderRadius: 14, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  speechText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#374151', lineHeight: 19 },
  speechTail: { position: 'absolute', right: -8, bottom: 18, width: 0, height: 0, borderTopWidth: 7, borderBottomWidth: 7, borderLeftWidth: 9, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: 'white' },
  lumaImg: { width: 90, height: 90 },
  practiceCard: { width: '100%', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', padding: 16, marginBottom: 16 },
  practiceTitle: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 12 },
  practiceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  practiceIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  practiceLabel: { flex: 1, fontFamily: 'Nunito_700Bold', fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  rewardRow: { flexDirection: 'row', gap: 10, width: '100%' },
  rewardBadge: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  rewardText: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  footer: { paddingHorizontal: 22, paddingTop: 12 },
  startBtn: { backgroundColor: colors.primary, borderRadius: 18, paddingVertical: 18, alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
  startBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 17, color: 'white' },
});
*/

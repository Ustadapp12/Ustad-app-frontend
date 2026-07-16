import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, LayoutAnimation,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';

const FAQS = [
  {
    q: 'What is this app?',
    a: 'Ustad is a gamified Quran memorisation companion. You earn XP, maintain streaks, and unlock new surahs as you progress through daily lessons — making Hifz feel rewarding rather than repetitive.',
  },
  {
    q: 'How do lessons work?',
    a: 'Each lesson group covers a range of ayahs. You start by listening to the ayah, then move through fill-in-the-blank, word ordering, and recall exercises. Complete a lesson to earn stars and XP.',
  },
  {
    q: 'How do exercises and hearts work?',
    a: 'You start every lesson with 5 hearts. A wrong answer costs one heart. When all hearts are gone, the session ends and you can retry. Correct answers never take hearts away.',
  },
  {
    q: 'How do XP, streaks, and rewards work?',
    a: 'You earn XP by completing lessons and exercises. Log in and practise daily to build your streak. Longer streaks unlock bonus XP. Check the Leaderboard to see how you rank.',
  },
  {
    q: 'How does roadmap progression work?',
    a: 'The map shows all surahs from Juz 30. Each surah has one or more levels. Complete Level 1 to unlock Level 2. Stars show how well you did — aim for 3 stars by getting at least 90% correct.',
  },
];

function FaqCard({ q, a, lumaAnim }: { q: string; a: string; lumaAnim: Animated.Value }) {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(o => !o);
  };

  return (
    <TouchableOpacity style={styles.faqCard} onPress={toggle} activeOpacity={0.85}>
      <View style={styles.faqHeader}>
        <Text style={styles.faqQ}>{q}</Text>
        <Text style={[styles.chevron, open && styles.chevronOpen]}>{open ? '▲' : '▼'}</Text>
      </View>
      {open && <Text style={styles.faqA}>{a}</Text>}
    </TouchableOpacity>
  );
}

export default function HelpScreen() {
  const insets = useSafeAreaInsets();
  const lumaY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(lumaY, { toValue: -8, duration: 1400, useNativeDriver: true }),
      Animated.timing(lumaY, { toValue: 0,  duration: 1400, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <LinearGradient colors={['#0D3B26', '#1A5C3A', '#0D3B26']} style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.topLabel}>❓ HELP & GUIDE</Text>
        <Text style={styles.topTitle}>How It Works</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Luma hero */}
        <View style={styles.lumaSection}>
          <View style={styles.speechBubble}>
            <Text style={styles.speechText}>
              Hi! I'm Luma 🌟{'\n'}Let me guide you through the app!
            </Text>
            <View style={styles.speechTail} />
          </View>
          <Animated.Image
            source={require('../../../assets/images/lumo_transparent.png')}
            style={[styles.lumaImg, { transform: [{ translateY: lumaY }] }]}
            resizeMode="contain"
          />
        </View>

        {/* FAQ cards */}
        <Text style={styles.sectionLabel}>FREQUENTLY ASKED</Text>
        {FAQS.map((faq, i) => (
          <FaqCard key={i} q={faq.q} a={faq.a} lumaAnim={lumaY} />
        ))}

        {/* Footer tip */}
        <View style={styles.tipCard}>
          <Text style={{ fontSize: 20 }}>💡</Text>
          <Text style={styles.tipText}>
            Practise a little every day — even 5 minutes builds a powerful habit.
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 22, paddingBottom: 12 },
  topLabel: { fontFamily: 'Nunito_700Bold', fontSize: 10, color: colors.gold, letterSpacing: 1.5, marginBottom: 2 },
  topTitle: { fontFamily: 'Nunito_700Bold', fontSize: 26, color: 'white' },
  scroll: { paddingHorizontal: 18, paddingTop: 4 },

  lumaSection: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: 28, paddingLeft: 4 },
  speechBubble: {
    flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5,
    position: 'relative',
  },
  speechText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#374151', lineHeight: 20 },
  speechTail: {
    position: 'absolute', right: -9, bottom: 20,
    width: 0, height: 0,
    borderTopWidth: 8, borderBottomWidth: 8, borderLeftWidth: 10,
    borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: 'white',
  },
  lumaImg: { width: 88, height: 88 },

  sectionLabel: {
    fontFamily: 'Nunito_700Bold', fontSize: 10, color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5, marginBottom: 12,
  },

  faqCard: {
    backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    padding: 18, marginBottom: 12,
  },
  faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  faqQ: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: 'white', flex: 1, lineHeight: 20 },
  chevron: { fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  chevronOpen: { color: colors.gold },
  faqA: {
    fontFamily: 'Nunito_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.75)',
    lineHeight: 21, marginTop: 12,
  },

  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: 'rgba(224,188,78,0.12)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(224,188,78,0.25)',
    padding: 16, marginTop: 8,
  },
  tipText: { flex: 1, fontFamily: 'Nunito_700Bold', fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 20 },
});

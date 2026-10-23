import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useArabicFont, arabicTextStyle } from '../../../utils/arabicFont';
import { colors } from '../../../theme';
import type { FormulaAttemptOut } from '../../../types/api';
import { TOUR_GLOW } from '../../../components/tour/tourGlow';
import { MASCOT } from '../../../assets';

// ── Feedback overlay ───────────────────────────────────────────────

export function FeedbackBanner({
  result, onAdvance, bannerRef, glow,
}: {
  result: FormulaAttemptOut; onAdvance: () => void;
  /** Tour-only: lets TourLessonScreen measure the real feedback sheet, for the cutout hole. */
  bannerRef?: React.Ref<View>;
  /** Tour-only: glow the real feedback sheet itself. */
  glow?: boolean;
}) {
  const correct = result.correct;
  const arabicFont = useArabicFont();
  const xpAwarded = result.xp_awarded ?? 0;
  const showAnswer = !correct && result.correct_answer != null;
  const answerStr = Array.isArray(result.correct_answer)
    ? result.correct_answer.join(' ')
    : String(result.correct_answer ?? '');

  if (correct) {
    return (
      <View ref={bannerRef} collapsable={false} style={[FB.sheet, glow && TOUR_GLOW]}>
        <View style={FB.correctRow}>
          <View style={FB.correctBadge}><Text style={FB.correctBadgeText}>✓</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={FB.correctTitle}>Correct!</Text>
            <Text style={FB.correctSub}>YOU'RE GOING STRONG!</Text>
          </View>
        </View>
        {xpAwarded > 0 && (
          <View style={FB.xpPill}>
            <Image source={MASCOT.lumoXp} style={FB.xpLumo} resizeMode="contain" />
            <Text style={FB.xpText}>+{xpAwarded} XP</Text>
          </View>
        )}
        <TouchableOpacity style={FB.continueBtn} onPress={onAdvance}>
          <Text style={FB.continueBtnText}>Continue  →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View ref={bannerRef} collapsable={false} style={[FB.sheet, FB.wrongSheet, glow && TOUR_GLOW]}>
      <View style={FB.wrongRow}>
        <View style={FB.wrongBadge}><Text style={FB.wrongBadgeText}>✕</Text></View>
        <Text style={[FB.wrongTitle, { flex: 1 }]}>Incorrect</Text>
      </View>
      {showAnswer && (
        <>
          <Text style={FB.correctAnswerLabel}>CORRECT ANSWER:</Text>
          <View style={FB.correctAnswerBox}>
            <Text style={arabicTextStyle(FB.correctAnswerText as any, arabicFont) as any}>{answerStr}</Text>
          </View>
        </>
      )}
      <TouchableOpacity style={FB.gotItBtn} onPress={onAdvance}>
        <Text style={FB.gotItBtnText}>GOT IT</Text>
      </TouchableOpacity>
    </View>
  );
}

export const FB = StyleSheet.create({
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#D1FAE5', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 36, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: -2 }, elevation: 4 },
  wrongSheet: { backgroundColor: '#FEE2E2' },
  correctRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  correctBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center' },
  correctBadgeText: { fontSize: 20, color: '#F5F7FA', fontWeight: '700' },
  correctTitle: { fontFamily: 'Nunito-Bold', fontSize: 22, color: '#14532D' },
  correctSub: { fontFamily: 'Nunito-Bold', fontSize: 11, color: '#16A34A', letterSpacing: 0.5 },
  xpPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F5F7FA', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  xpLumo: { width: 32, height: 32 },
  xpText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: colors.darkText },
  continueBtn: { backgroundColor: '#16A34A', borderRadius: 16, paddingVertical: 17, alignItems: 'center', shadowColor: '#16A34A', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  continueBtnText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: '#F5F7FA' },
  wrongRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  wrongBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center' },
  wrongBadgeText: { fontSize: 18, color: '#F5F7FA', fontWeight: '700' },
  wrongTitle: { fontFamily: 'Nunito-Bold', fontSize: 22, color: '#7F1D1D' },
  correctAnswerLabel: { fontFamily: 'Nunito-Bold', fontSize: 10, color: '#991B1B', letterSpacing: 1.2, marginBottom: 8 },
  correctAnswerBox: { backgroundColor: '#F5F7FA', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center', marginBottom: 20 },
  correctAnswerText: { fontFamily: 'NotoNaskhArabic-Regular', fontSize: 22, color: colors.darkText, textAlign: 'center' },
  gotItBtn: { backgroundColor: '#DC2626', borderRadius: 16, paddingVertical: 17, alignItems: 'center', shadowColor: '#DC2626', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  gotItBtnText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: '#F5F7FA', letterSpacing: 0.5 },
});

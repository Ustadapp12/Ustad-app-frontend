import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { stopAudio, onPlayingChange, isAudioPlaying } from '../../../services/audioPlayer';
import { useArabicFont, arabicTextStyle } from '../../../utils/arabicFont';
import { safeBottomInset } from '../../../utils/responsive';
import { colors } from '../../../theme';
import type { ExpectedWordResult } from '../../../types/api';
import AyahText from '../../../components/lesson/AyahText';
import { SegmentPlayBtn } from './SegmentPlayBtn';
import { MASCOT } from '../../../assets';

// ── Shared result banner for speak exercises ───────────────────────
// Shown inline inside the exercise after the recording is scored.
// passed=true  → green banner  ("Great job!")
// passed=false → orange banner ("Keep practicing!")

export interface SpeakResult {
  passed: boolean;
  score_pct: number;
  transcript: string;
  correctAyah?: string | null;
  ayahAudioUrl?: string | null;
  segmentAudioUrls?: string[] | null;
  expectedWords?: ExpectedWordResult[];
}

// Renders the expected text as a single block, highlighting the specific
// word(s) the backend marked wrong (expected_words[].correct === false) so
// the user sees exactly what to fix instead of just a pass/fail score.
export function DiffAyahText({ words, fallbackText, style, wrongStyle }: {
  words?: ExpectedWordResult[];
  fallbackText: string;
  style: any;
  wrongStyle: any;
}) {
  if (!words?.length) return <AyahText text={fallbackText} style={style} />;
  return (
    <Text style={style} allowFontScaling={false}>
      {words.map((w, i) => (
        <React.Fragment key={w.index ?? i}>
          <Text style={!w.correct ? wrongStyle : undefined}>{w.word}</Text>
          {i < words.length - 1 ? ' ' : ''}
        </React.Fragment>
      ))}
    </Text>
  );
}

// Full bottom-sheet result — rendered at screen level (like FeedbackBanner)
// so it always has enough room to show the score, XP pill, and Continue button.
// onRetry present → this is the retry-choice moment (always a fail, since
// retry is only ever offered on a wrong first attempt): renders "Try Again" +
// "Next" instead of the single final "Continue" button. onAdvance in that
// case means "decline the retry, accept this result as final."
export function SpeakResultBanner({ result, onAdvance, onRetry }: { result: SpeakResult; onAdvance: () => void; onRetry?: () => void }) {
  const { passed, score_pct, correctAyah, ayahAudioUrl, segmentAudioUrls, transcript, expectedWords } = result;
  const arabicFont = useArabicFont();
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  // Show the correction whenever any word was marked wrong — not only on
  // fail. A 75% pass still has mistakes worth pointing out.
  const hasMistakes = !!expectedWords?.some(w => !w.correct);

  // The reference-recitation audio (SegmentPlayBtn below) has no cleanup of
  // its own when this banner is replaced by a new attempt — Try Again keeps
  // the same exercise (same ex_id), so the main screen's own
  // `stopAudio()` on ex_id-change (which handles every other exercise type's
  // advance) never fires here, and the old attempt's audio played straight
  // into the new one. Stopping it explicitly on both buttons closes that;
  // disabling them while it's playing is a separate, deliberately-requested
  // safeguard against the same race (2026-09-13).
  const [audioPlaying, setAudioPlaying] = useState(isAudioPlaying());
  useEffect(() => onPlayingChange(setAudioPlaying), []);
  const handleRetry = () => { stopAudio(); onRetry?.(); };
  const handleAdvance = () => { stopAudio(); onAdvance(); };
  return (
    // The sheet itself stays pinned to bottom: 0 — its colour is meant to
    // bleed all the way to the true screen edge, same as the feedback
    // sheet below. Only its own bottom padding grows by insets.bottom, so
    // the Advance button inside never sits under the Android nav buttons.
    //
    // Base padding cut 36 → 16 (2026-08-28). 36 was chosen back when
    // insets.bottom was usually 0; stacked on top of a real inset it left a
    // dead strip under Try Again / Next tall enough that the sheet's capped
    // ScrollView had to be scrolled to reach content that would otherwise
    // have fit. 16 is the gap to the button; insets.bottom is the clearance
    // for the system bar. Those are two different jobs and only one of them
    // should scale with the device.
    <View style={[SRB.sheet, !passed && SRB.sheetFail, { paddingBottom: 16 + insets.bottom }]}>
      {/* Top row: badge + title/subtitle */}
      <View style={SRB.topRow}>
        <View style={[SRB.badge, !passed && SRB.badgeFail]}>
          <Text style={SRB.badgeText} allowFontScaling={false}>{passed ? '★' : '~'}</Text>
        </View>
        <View style={SRB.topText}>
          <Text style={[SRB.title, !passed && SRB.titleFail]} allowFontScaling={false}>
            {passed ? 'Great job!' : 'Keep practicing!'}
          </Text>
          <Text style={[SRB.sub, !passed && SRB.subFail]} allowFontScaling={false}>
            {passed ? `YOU SCORED ${score_pct}%` : `SCORE: ${score_pct}%, AIM FOR 60%+`}
          </Text>
        </View>
      </View>

      {/* Scrollable so a long ayah / many mistake words / a long transcript
          grows inside the capped sheet instead of pushing it over the
          screen — the score header above and Continue button below stay
          fixed and always visible. */}
      <ScrollView style={SRB.scroll} showsVerticalScrollIndicator={false}>
        {/* XP pill — only shown when the user passed (earned it) */}
        {passed && (
          <View style={SRB.xpPill}>
            <Image source={MASCOT.lumoXp} style={SRB.xpLumo} resizeMode="contain" />
            <Text style={SRB.xpText} allowFontScaling={false}>+2 XP</Text>
          </View>
        )}

        {/* Correct ayah — shown whenever there's a mistake to point out, with the wrong word(s) highlighted */}
        {!!correctAyah && (hasMistakes || !passed) && (
          <View style={SRB.transcriptBox}>
            <Text style={SRB.transcriptLabel} allowFontScaling={false}>CORRECT AYAH</Text>
            <SegmentPlayBtn
              urls={segmentAudioUrls?.length ? segmentAudioUrls : undefined}
              url={segmentAudioUrls?.length ? undefined : ayahAudioUrl}
            />
            <DiffAyahText
              words={expectedWords}
              fallbackText={correctAyah}
              style={arabicTextStyle(SRB.ayahText as any, arabicFont) as any}
              wrongStyle={SRB.wrongWord}
            />
          </View>
        )}

        {/* What we heard you say — makes the transcription visible to the user */}
        {!!transcript && (hasMistakes || !passed) && (
          <View style={SRB.transcriptBox}>
            <Text style={SRB.transcriptLabel} allowFontScaling={false}>YOU SAID</Text>
            <Text style={arabicTextStyle(SRB.ayahText as any, arabicFont) as any} allowFontScaling={false}>{transcript}</Text>
          </View>
        )}
      </ScrollView>

      {onRetry ? (
        <View style={SRB.btnRow}>
          <TouchableOpacity
            style={[SRB.btn, SRB.btnSecondary, SRB.btnFlex, audioPlaying && SRB.btnDisabled]}
            onPress={handleRetry}
            disabled={audioPlaying}
          >
            <Text style={[SRB.btnText, SRB.btnTextSecondary]} allowFontScaling={false}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[SRB.btn, SRB.btnFail, SRB.btnFlex, audioPlaying && SRB.btnDisabled]}
            onPress={handleAdvance}
            disabled={audioPlaying}
          >
            <Text style={SRB.btnText} allowFontScaling={false}>Next  →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[SRB.btn, SRB.btnSpaced, !passed && SRB.btnFail, audioPlaying && SRB.btnDisabled]}
          onPress={handleAdvance}
          disabled={audioPlaying}
        >
          <Text style={SRB.btnText} allowFontScaling={false}>Continue  →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export const SRB = StyleSheet.create({
  // Matches FeedbackBanner: absolute bottom sheet with rounded top corners.
  // Capped at 65% of the screen — with more mistakes/a longer ayah than
  // fits, the inner ScrollView scrolls instead of the sheet covering the
  // whole screen (this content is otherwise unbounded auto-height).
  sheet:           { position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '72%', overflow: 'hidden', backgroundColor: '#D1FAE5', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: -2 }, elevation: 4 },
  sheetFail:       { backgroundColor: '#FFF3E0' },
  topRow:          { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  // flexShrink lets this pane give up space to the fixed header/button
  // above and below when content would exceed the sheet's maxHeight,
  // instead of the sheet growing past its cap.
  scroll:          { flexShrink: 1 },
  badge:           { width: 44, height: 44, borderRadius: 22, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center' },
  badgeFail:       { backgroundColor: '#F97316' },
  badgeText:       { fontSize: 20, color: '#F5F7FA', fontWeight: '700' },
  topText:         { flex: 1 },
  title:           { fontFamily: 'Nunito-Bold', fontSize: 22, color: '#14532D' },
  titleFail:       { color: '#7C2D12' },
  sub:             { fontFamily: 'Nunito-Bold', fontSize: 11, color: '#16A34A', letterSpacing: 0.5 },
  subFail:         { color: '#9A3412' },
  // XP pill — full width, content centered, matching FeedbackBanner xpPill
  xpPill:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F5F7FA', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  xpLumo:          { width: 32, height: 32 },
  xpText:          { fontFamily: 'Nunito-Bold', fontSize: 16, color: colors.darkText },
  // The CORRECT AYAH / YOU SAID boxes. Sized to hug the text they hold:
  // lineHeight was 38 on a 22px font (1.73×), which reserved most of a
  // blank extra line per row and made a one-line ayah's box read as an
  // oversized empty card. 1.55× still leaves real headroom for Naskh's
  // ascenders and harakat — the reason it can't simply hug the glyph box
  // — without the padding being visibly larger than the type.
  transcriptBox:   { backgroundColor: '#F5F7FA', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12, alignItems: 'center' },
  transcriptLabel: { fontFamily: 'Nunito-Bold', fontSize: 10, color: colors.mutedText, letterSpacing: 1.2, marginBottom: 6 },
  ayahText:        { fontFamily: 'NotoNaskhArabic-Regular', fontSize: 22, color: colors.darkText, textAlign: 'center', lineHeight: 34 },
  wrongWord:       { color: '#DC2626', textDecorationLine: 'underline' },
  btn:             { backgroundColor: '#16A34A', borderRadius: 16, paddingVertical: 17, alignItems: 'center', shadowColor: '#16A34A', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  btnFail:         { backgroundColor: '#F97316', shadowColor: '#F97316' },
  // While the reference-recitation audio is playing — dimmed so it's clear
  // why the tap does nothing, back to normal the instant playback ends.
  btnDisabled:     { opacity: 0.4, shadowOpacity: 0 },
  btnText:         { fontFamily: 'Nunito-Bold', fontSize: 16, color: '#F5F7FA' },
  // Clear gap from the scrollable content above (transcript boxes) — was
  // sitting right against it with nothing but the last box's own
  // marginBottom, which read as the buttons crowding/interfering with it.
  btnRow:          { flexDirection: 'row', gap: 10, marginTop: 14 },
  btnFlex:         { flex: 1 },
  btnSecondary:    { backgroundColor: '#F5F7FA', borderWidth: 2, borderColor: '#F97316', shadowOpacity: 0 },
  btnTextSecondary:{ color: '#F97316' },
  btnSpaced: { marginTop: 18 },
});

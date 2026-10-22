import { StyleSheet } from 'react-native';
import { colors } from '../../theme';

// Back button used as a safety net on the blank loading state below.
export const LL = StyleSheet.create({
  // The shared charcoal BackButton, like every other screen (2026-10-22;
  // was a grey 14pt arrow + "Map" label in a pill, its own one-off).
  backBtn: { position: 'absolute', left: 16, zIndex: 1 },
});


export const S = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.lightBg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lightBg, padding: 28 },
  // Header styles now live with LessonHeader (see LH above), which both this
  // screen and the guided tour render.
  exerciseArea: { flex: 1 },
  spinnerOverlay:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(242,244,248,0.6)' },
  confettiOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  confettiAnim:    { width: '100%', height: 320 },
  errorTitle: { fontFamily: 'Nunito-Bold', fontSize: 18, color: colors.darkText, marginBottom: 8, textAlign: 'center' },
  errorMsg: { fontFamily: 'Nunito-Regular', fontSize: 13, color: colors.mutedText, textAlign: 'center', marginBottom: 24 },
  retryBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 },
  retryBtnText: { fontFamily: 'Nunito-Bold', fontSize: 15, color: '#F5F7FA' },
  // No-hearts overlay
  noHeartsOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', zIndex: 100, paddingHorizontal: 28 },
  noHeartsCard: { backgroundColor: '#F5F7FA', borderRadius: 28, padding: 28, alignItems: 'center', width: '100%', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 20 },
  noHeartsTitle: { fontFamily: 'Nunito-Bold', fontSize: 26, color: colors.darkText, marginBottom: 10 },
  noHeartsBody: { fontFamily: 'Nunito-Regular', fontSize: 14, color: colors.midText, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  buyHeartsBtn: { width: '100%', backgroundColor: '#F0F4FF', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 12, borderWidth: 1.5, borderColor: '#C7D2FE' },
  buyHeartsBtnText: { fontFamily: 'Nunito-Bold', fontSize: 15, color: '#4338CA' },
  buyHeartsSubText: { fontFamily: 'Nunito-Regular', fontSize: 11, color: '#818CF8', marginTop: 2 },
  noHeartsRetryBtn: { width: '100%', backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  noHeartsRetryText: { fontFamily: 'Nunito-Bold', fontSize: 15, color: '#F5F7FA' },
  noHeartsLumo: { width: 120, height: 120, marginBottom: 8 },
  // Exit-level confirmation
  exitConfirmLumo: { width: 90, height: 90, marginBottom: 8 },
  exitConfirmBtnRow: { flexDirection: 'row', gap: 10, width: '100%' },
  // Staying is the green, filled, "default-looking" button and leaving is
  // the plain/colorless one — deliberately inverted from the usual
  // cancel/destructive convention so an impulsive or accidental tap keeps
  // the user on the level instead of throwing progress away.
  exitConfirmCancelBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  exitConfirmCancelText: { fontFamily: 'Nunito-Bold', fontSize: 14, color: '#F5F7FA' },
  exitConfirmLeaveBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  exitConfirmLeaveText: { fontFamily: 'Nunito-Bold', fontSize: 14, color: colors.midText },
  waveBar: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  waveLottie: { width: 220, height: 60 },
});

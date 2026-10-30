import { StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { STREAK_FROZEN_COLOR } from '../../utils/streak';

export const styles = StyleSheet.create({
  container:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:      { alignItems: 'center', paddingHorizontal: 28, width: '100%' },
  medal:        { width: '100%', aspectRatio: 300 / 180, marginBottom: -10 },
  starsRow:     { flexDirection: 'row', gap: 12, marginBottom: 16 },
  star:         { fontSize: 52 },
  grade:        { fontFamily: 'Nunito-Bold', fontSize: 30, marginBottom: 14 },
  streakSavedBadge: {
    backgroundColor: 'rgba(0,0,0,0.40)', borderRadius: 20, borderWidth: 2, borderColor: STREAK_FROZEN_COLOR,
    paddingHorizontal: 18, paddingVertical: 8, marginBottom: 14, maxWidth: '100%',
  },
  streakSavedBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  streakSavedBadgeIcon: { width: 18, height: 18 },
  streakSavedBadgeText: { fontFamily: 'Nunito-Bold', fontSize: 15, color: STREAK_FROZEN_COLOR, textAlign: 'center' },
  lumaImg:      { width: 84, height: 84, marginBottom: 12 },
  statsRow:     { flexDirection: 'row', width: '100%', gap: 10, marginBottom: 14 },
  statBox:      { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.40)',
                  borderRadius: 16, borderWidth: 2, borderColor: colors.gold, paddingVertical: 12, paddingHorizontal: 4 },
  statValue:    { fontFamily: 'Nunito-Bold', fontSize: 22, color: colors.gold, lineHeight: 26 },
  statLabel:    { fontFamily: 'Nunito-Bold', fontSize: 10.5, color: colors.gold, letterSpacing: 0.5, marginTop: 3, opacity: 0.85 },
  continueBtn:  { width: '100%', backgroundColor: colors.primary, borderRadius: 18, paddingVertical: 17, alignItems: 'center', marginBottom: 12, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
  continueBtnText: { fontFamily: 'Nunito-Bold', fontSize: 17, color: '#F5F7FA' },
  starDim: { opacity: 0.25 },
  fill: { flex: 1 },
  mascotBox: { width: 84, height: 84, marginBottom: 12 },
  mascotImgFlush: { marginBottom: 0 },
});

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  comingSoonBanner: {
    paddingBottom: 16, paddingHorizontal: 24,
    shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.7, shadowRadius: 10, elevation: 8,
  },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  luma: { width: 165, height: 165, marginBottom: 20 },
  bubble: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 22, paddingVertical: 16,
  },
  bubbleText: {
    fontFamily: 'Nunito-Bold', fontSize: 15, color: '#F5F7FA',
    textAlign: 'center', lineHeight: 22,
  },
  mascotImgFlush: { marginBottom: 0 },
  mascotShadow: { position: 'relative', marginTop: -17, marginBottom: 20 },
});

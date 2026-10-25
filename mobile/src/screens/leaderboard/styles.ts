import { StyleSheet } from 'react-native';
import { designScale, type Scale } from '../../utils/responsive';
import { colors } from '../../theme';

// Figma "leaderboard iPhone 16 & 17 Pro Max - 8" (node 1121:8311) is drawn on
// a 440pt frame. Every design number below goes through d() (designScale, in
// utils/responsive) so it is read straight off the Figma frame.
export { designScale, type Scale };

// Colours sampled from the Figma render.
export const LB = {
  bg: '#F5F7FA',
  title: '#5A5D68',
  subtle: '#AFAFAF',
  text: '#4F4F4F',
  pts: '#95A3B8',
  meBg: '#E9C468',
  meEdge: '#BFA054',
  meText: '#303030',
};

// Above this, center a phone-proportioned column instead of stretching the
// rows edge to edge on tablets; a no-op on phones.
export const MAX_CONTENT_W = 520;

export function makeStyles(sc: Scale, bottomInset: number) {
  const d = designScale(sc);
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: LB.bg },
    contentWrap: { flex: 1, width: '100%', maxWidth: MAX_CONTENT_W, alignSelf: 'center' },
    centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: sc(32), gap: sc(10) },
    errorText: { fontFamily: 'Nunito-Bold', fontSize: sc(14), color: colors.mutedText, textAlign: 'center' },
    errorRetry: { fontFamily: 'Nunito-Bold', fontSize: sc(13), color: colors.primary },
    feedbackLink: { fontFamily: 'Nunito-Regular', fontSize: sc(12), color: colors.mutedText, marginTop: sc(4) },

    header: { paddingHorizontal: d(25), paddingTop: d(12) },
    titleRow: { height: d(27), justifyContent: 'center', alignItems: 'center' },
    title: { fontFamily: 'Nunito-Bold', fontSize: d(20), color: LB.title },
    date: {
      alignSelf: 'flex-end', marginTop: d(7), fontFamily: 'Nunito-Bold', fontSize: d(11),
      letterSpacing: d(1), color: LB.subtle, textTransform: 'uppercase',
    },

    // One Lumo in place of the design's league title + badge card (deferred).
    lumoWrap: { alignSelf: 'center', width: d(104), height: d(104), marginTop: d(2) },
    lumo: { width: d(104), height: d(104) },

    // Break between the top list and the user's own row when they rank lower.
    gapDots: {
      textAlign: 'center', fontFamily: 'Nunito-Bold', fontSize: d(12), letterSpacing: d(2),
      color: LB.subtle, marginTop: d(2), marginBottom: d(10),
    },
    scroll: { paddingHorizontal: d(25), paddingTop: d(10), paddingBottom: d(30) + bottomInset },
  });
}

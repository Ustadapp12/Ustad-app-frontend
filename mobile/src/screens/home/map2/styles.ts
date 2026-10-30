import { StyleSheet } from 'react-native';
import { DAY, FONTS } from './map2Theme';

// Figma frame points, multiplied by s (screen width / 440).
export function makeMap2Styles(s: number) {
  const f = (n: number) => n * s;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: DAY.ground },
    scroll: { flex: 1 },

    header: { position: 'absolute', top: 0, left: 0, right: 0 },
    headerSkyFill: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: DAY.sky },
    statRow: { position: 'absolute', left: f(9), flexDirection: 'row' },
    statCard: { width: f(96), height: f(62), marginRight: f(10) },
    statPill: { position: 'absolute', left: f(7), top: f(24) },
    // Icon and number both sit inside the 82.5 x 35pt pill.
    statIcon: { position: 'absolute', left: f(12), top: f(27), width: f(29), height: f(29) },
    statValue: {
      position: 'absolute', left: f(46), top: f(24), height: f(35), right: f(8), textAlignVertical: 'center',
      lineHeight: f(35), fontFamily: FONTS.number, fontSize: f(13), color: DAY.ink, includeFontPadding: false,
    },

    feature: { position: 'absolute' },
    featureBg: { position: 'absolute', backgroundColor: DAY.featureBg, borderRadius: f(13) },
    featureLabel: {
      position: 'absolute', fontFamily: FONTS.caption, fontSize: f(12), color: DAY.ink, includeFontPadding: false,
      textAlign: 'center',
    },

    // "START" / "JUMP HERE?" tag. Figma's was 15pt / 49pt tall; compacted on request.
    label: {
      backgroundColor: '#FFFFFF', borderWidth: f(1.5), borderColor: DAY.labelBorder, borderRadius: f(8),
      paddingVertical: f(6), paddingHorizontal: f(9),
    },
    labelText: {
      fontFamily: FONTS.label, fontSize: f(11), lineHeight: f(13), letterSpacing: f(0.4),
      color: DAY.labelGreen, textTransform: 'uppercase', textAlign: 'center', includeFontPadding: false,
    },

    boardText: {
      fontFamily: FONTS.caption, fontSize: f(14), color: DAY.boardInk, includeFontPadding: false, textAlign: 'center',
    },

    bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: DAY.bottomBar },
    bottomBarIcons: { position: 'absolute', width: f(375), height: f(46) },
    navIcon: { position: 'absolute' },

    feedback: { position: 'absolute', width: f(60.7), height: f(67.68) },

    overlay: { ...StyleSheet.absoluteFill, backgroundColor: DAY.ground, zIndex: 20 },
    tabBarCornerFill: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#F5F7FA' },
    tabBarInsetFill: { position: 'absolute', left: 0, right: 0, backgroundColor: '#F5F7FA' },
    popupAnchor: { position: 'absolute', zIndex: 5 },
    popupAnchorCentered: { position: 'absolute', zIndex: 5, alignItems: 'center' },
  });
}

export type Map2Styles = ReturnType<typeof makeMap2Styles>;

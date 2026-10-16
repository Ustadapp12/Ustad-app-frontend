import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { colors } from '../../../../theme/colors';
import type { MapNavProp } from '../../../../navigation/types';
import type { Styles } from '../mapStyles';

// Floating feedback button — fixed over the map (outside the
// ScrollView, so it never scrolls away). TAB_BAR_CONTENT_H (64) is
// duplicated from MainTabs.tsx rather than imported: MainTabs
// imports MapScreen to render the Home tab, so the reverse import
// would be circular.
//
// Horizontal position is computed, not a fixed `right` margin: the
// tab bar's 4 tabs are equal-width flex:1 columns spanning the full
// screen width with no side padding (see MainTabs.tsx), so the
// Profile tab's icon sits centered at 7/8 of the screen width —
// 1/8 of the width in from the right edge. Centering this button on
// that same point (rather than eyeballing a fixed pixel offset)
// keeps it aligned with Profile across different screen widths.
// Previously a plain `right: sc(16)` put it near, but not exactly
// over, the Profile icon.
interface Props {
  S: Styles['S'];
  sc: (n: number) => number;
  screenWidth: number;
  navigation: MapNavProp;
}

function FeedbackButton({ S, sc, screenWidth: width, navigation }: Props) {
  return (
    <TouchableOpacity
      style={[S.feedbackFab, { right: width / 8 - sc(54) / 2 }]}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('Feedback')}
    >
      {/* Concentric rings (dark green outer, #05966A middle, white
          center) instead of the old flat green circle — same structure
          as the reference image, restyled into the app's own green
          palette rather than its neutral black/gray/white. */}
      <View style={S.feedbackRingOuter}>
        <View style={S.feedbackRingMid}>
          <View style={S.feedbackRingInner}>
            {/* Message-bubble-with-lines, outline style — same family as
                the reference icon (minus the pencil, to stay legible this
                small). Dark stroke now that it sits on the white center
                ring instead of a solid green fill. */}
            <Svg width={sc(20)} height={sc(20)} viewBox="0 0 24 24" fill="none">
              <Path
                d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                stroke={colors.primaryDark} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
              />
              <Line x1={7} y1={9} x2={17} y2={9} stroke={colors.primaryDark} strokeWidth={1.6} strokeLinecap="round" />
              <Line x1={7} y1={13} x2={14} y2={13} stroke={colors.primaryDark} strokeWidth={1.6} strokeLinecap="round" />
            </Svg>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default React.memo(FeedbackButton);

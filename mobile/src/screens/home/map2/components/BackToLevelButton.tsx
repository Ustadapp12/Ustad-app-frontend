import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { DAY } from '../map2Theme';

// Size in Figma points: 60 wide, a 48pt face on a 6pt lip.
export const BACK_TO_LEVEL_W = 60;
export const BACK_TO_LEVEL_H = 54;

// Shown when the learner's level is off screen; points toward it and scrolls
// back on tap. Same green face-and-lip look as the current node. Sits in the
// Feedback button's spot (bottom right), which moves up while this is shown.
function BackToLevelButton({ s, right, bottom, direction, onPress }: {
  s: number; right: number; bottom: number; direction: 'up' | 'down'; onPress: () => void;
}) {
  const w = BACK_TO_LEVEL_W * s, faceH = 48 * s, lip = 6 * s;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel="Back to my level"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{ position: 'absolute', bottom, right, width: w, height: faceH + lip }}
    >
      <View style={{ position: 'absolute', top: lip, width: w, height: faceH, borderRadius: faceH / 2, backgroundColor: DAY.node.current.lip }} />
      <View style={{ position: 'absolute', top: 0, width: w, height: faceH, borderRadius: faceH / 2, backgroundColor: DAY.node.current.face, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={24 * s} height={24 * s} viewBox="0 0 24 24" style={direction === 'down' ? { transform: [{ rotate: '180deg' }] } : undefined}>
          <Path d="M12 4 L4 13 H9.5 V20 H14.5 V13 H20 Z" fill="#FFFFFF" />
        </Svg>
      </View>
    </TouchableOpacity>
  );
}

export default React.memo(BackToLevelButton);

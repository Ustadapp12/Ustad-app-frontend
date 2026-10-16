import React from 'react';
import { Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { DAY } from '../map2Theme';
import FaceOnLip from './FaceOnLip';

// Size in Figma points: 60 wide, a 48pt face on a 6pt lip.
export const BACK_TO_LEVEL_W = 60;
export const BACK_TO_LEVEL_H = 54;

// Shown when the learner's level is off screen; points toward it and scrolls
// back on tap. Same green face-and-lip look as the current node. Sits in the
// Feedback button's spot (bottom right), which moves up while this is shown.
function BackToLevelButton({ s, right, bottom, direction, onPress }: {
  s: number; right: number; bottom: number; direction: 'up' | 'down'; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Back to my level"
      hitSlop={8}
      style={{ position: 'absolute', bottom, right }}
    >
      {({ pressed }) => (
        <FaceOnLip
          width={BACK_TO_LEVEL_W * s}
          faceHeight={48 * s}
          lip={6 * s}
          face={DAY.node.current.face}
          lipColour={DAY.node.current.lip}
          pressed={pressed}
        >
          <Svg width={24 * s} height={24 * s} viewBox="0 0 24 24" style={direction === 'down' ? { transform: [{ rotate: '180deg' }] } : undefined}>
            <Path d="M12 4 L4 13 H9.5 V20 H14.5 V13 H20 Z" fill="#FFFFFF" />
          </Svg>
        </FaceOnLip>
      )}
    </Pressable>
  );
}

export default React.memo(BackToLevelButton);

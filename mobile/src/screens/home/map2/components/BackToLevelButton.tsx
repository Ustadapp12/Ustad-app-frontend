import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { DAY } from '../map2Theme';

// Shown when the learner's level is off screen; points toward it and scrolls
// back on tap. Same green face-and-lip look as the current node.
function BackToLevelButton({ s, bottom, direction, onPress }: {
  s: number; bottom: number; direction: 'up' | 'down'; onPress: () => void;
}) {
  const w = 60 * s, faceH = 48 * s, lip = 6 * s;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel="Back to my level"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{ position: 'absolute', bottom, left: '50%', marginLeft: -w / 2, width: w, height: faceH + lip }}
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

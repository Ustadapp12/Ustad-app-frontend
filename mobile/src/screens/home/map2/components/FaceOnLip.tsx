import React from 'react';
import { View } from 'react-native';

// The map's button shape: a rounded face sitting on a darker lip below it.
// Used by level nodes and the back-to-my-level button. `pressed` sinks the
// face halfway onto its lip.
interface Props {
  width: number;
  faceHeight: number;
  lip: number;
  face: string;
  lipColour: string;
  pressed?: boolean;
  children?: React.ReactNode;
}

function FaceOnLip({ width, faceHeight, lip, face, lipColour, pressed, children }: Props) {
  const radius = faceHeight / 2;
  return (
    <View style={{ width, height: faceHeight + lip }}>
      <View style={{ position: 'absolute', top: lip, width, height: faceHeight, borderRadius: radius, backgroundColor: lipColour }} />
      <View
        style={{
          position: 'absolute', top: 0, width, height: faceHeight, borderRadius: radius, backgroundColor: face,
          alignItems: 'center', justifyContent: 'center', transform: [{ translateY: pressed ? lip / 2 : 0 }],
        }}
      >
        {children}
      </View>
    </View>
  );
}

export default React.memo(FaceOnLip);

import React from 'react';
import { Text, View } from 'react-native';
import type { Map2Styles } from '../styles';

// The white "START" / "JUMP HERE?" tag above a node.
function NodeLabel({ S, text }: { S: Map2Styles; text: string }) {
  return (
    <View style={S.label}>
      <Text style={S.labelText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

export default React.memo(NodeLabel);

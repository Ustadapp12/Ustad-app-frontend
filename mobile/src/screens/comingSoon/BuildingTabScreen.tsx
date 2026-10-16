import React from 'react';
import { View } from 'react-native';
import BuildingContent from './BuildingContent';

// The 8-point star tab. The tab bar comes from MainTabs.
export default function BuildingTabScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#F5F7FA' }} accessibilityLabel="Being built">
      <BuildingContent />
    </View>
  );
}

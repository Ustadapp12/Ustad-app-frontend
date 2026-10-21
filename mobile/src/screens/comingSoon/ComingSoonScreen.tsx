import React, { useCallback, useMemo } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import BackButton from '../../components/BackButton';
import Map2BottomBar, { type BottomBarKey } from '../home/map2/components/Map2BottomBar';
import { FIGMA_W } from '../home/map2/map2Theme';
import { makeMap2Styles } from '../home/map2/styles';
import BuildingContent from './BuildingContent';

type Props = NativeStackScreenProps<RootStackParamList, 'ComingSoon'>;

// Figma 1151:9846, opened by the map's Journey and Review buttons until those
// pages exist. Pushed over the tabs, so it carries its own bar (chest
// selected, as in the Figma frame).
export default function ComingSoonScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const s = width / FIGMA_W;
  const S = useMemo(() => makeMap2Styles(s), [s]);
  const bottomClearance = Platform.OS === 'ios' ? Math.round(insets.bottom * 0.55) : 0;

  const onBar = useCallback((key: BottomBarKey) => {
    if (key === 'home') navigation.navigate('MainTabs', { screen: 'Map' });
    else if (key === 'chest') navigation.navigate('MainTabs', { screen: 'DailyQuest' });
    else if (key === 'star') navigation.navigate('MainTabs', { screen: 'Building' });
    else if (key === 'trophy') navigation.navigate('MainTabs', { screen: 'Leaderboard' });
    else navigation.navigate('MainTabs', { screen: 'Profile' });
  }, [navigation]);

  return (
    <View style={styles.root} accessibilityLabel={`${route.params.title}, being built`}>
      <BackButton
        onPress={() => navigation.goBack()}
        style={{ position: 'absolute', left: 29 * s, top: insets.top + 13 * s, zIndex: 1 }}
        size={23 * s}
      />
      <BuildingContent />
      <Map2BottomBar S={S} s={s} bottomClearance={bottomClearance} active="chest" solid onPress={onBar} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7FA' },
});

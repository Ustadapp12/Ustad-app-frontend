import React, { useCallback, useMemo } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootNavProp } from '../../navigation/types';
import BackButton from '../../components/BackButton';
import Map2BottomBar, { type BottomBarKey } from '../home/map2/components/Map2BottomBar';
import { FIGMA_W } from '../home/map2/map2Theme';
import { makeMap2Styles } from '../home/map2/styles';
import BuildingContent from './BuildingContent';

interface Props {
  title: string;
  /** Which tab the page belongs to, highlighted in its bar. */
  active: BottomBarKey;
  label?: string;
}

// Figma 1151:9846: a "being built" page pushed over the tabs, so it carries
// its own bar. Shared by ComingSoonScreen (map's Journey/Review) and
// LogSalahScreen (Pray tab).
export default function ComingSoonPage({ title, active, label }: Props) {
  const navigation = useNavigation<RootNavProp>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const s = width / FIGMA_W;
  const S = useMemo(() => makeMap2Styles(s), [s]);
  // Full inset, same as Map2TabBar, so the bar sits exactly where the real
  // tab bar does.
  const bottomClearance = Platform.OS === 'ios' ? insets.bottom : 0;

  const onBar = useCallback((key: BottomBarKey) => {
    if (key === 'home') navigation.navigate('MainTabs', { screen: 'Map' });
    else if (key === 'chest') navigation.navigate('MainTabs', { screen: 'DailyQuest' });
    else if (key === 'star') navigation.navigate('MainTabs', { screen: 'Building' });
    else if (key === 'trophy') navigation.navigate('MainTabs', { screen: 'Leaderboard' });
    else navigation.navigate('MainTabs', { screen: 'Profile' });
  }, [navigation]);

  return (
    <View style={styles.root} accessibilityLabel={`${title}, being built`}>
      <BackButton
        onPress={() => navigation.goBack()}
        style={{ position: 'absolute', left: 29 * s, top: insets.top + 13 * s, zIndex: 1 }}
        size={23 * s}
      />
      <BuildingContent label={label} />
      <Map2BottomBar S={S} s={s} bottomClearance={bottomClearance} active={active} solid onPress={onBar} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7FA' },
});

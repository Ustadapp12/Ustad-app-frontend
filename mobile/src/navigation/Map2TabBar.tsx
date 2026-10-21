import React, { useCallback, useMemo } from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Map2BottomBar, { BOTTOM_BAR_H, type BottomBarKey } from '../screens/home/map2/components/Map2BottomBar';
import { FIGMA_W } from '../screens/home/map2/map2Theme';
import { makeMap2Styles } from '../screens/home/map2/styles';
import type { TabParamList } from './types';

const KEY_OF: Partial<Record<keyof TabParamList, BottomBarKey>> = {
  Map: 'home', DailyQuest: 'chest', Building: 'star', Leaderboard: 'trophy', Profile: 'profile',
};
const CORNER_OVERLAP = 13;
const ROUTE_OF: Record<BottomBarKey, keyof TabParamList> = {
  home: 'Map', chest: 'DailyQuest', star: 'Building', trophy: 'Leaderboard', profile: 'Profile',
};

// The Figma bar's top corners cut away to reveal whatever sits behind them
// (see Map2NodeView.tsx... Map2BottomBar's Bg art). That used to mean "the
// real screen behind it, pixel-aligned" — fragile on iOS, where the overlap
// below is a fractional (`* s`) value, so independent layout rounding on the
// tab bar's box vs. the screen's box could leave a sub-pixel gap exposing
// the navigator's own dark backdrop instead of blending. Baking each
// screen's own background into this component removes that dependency
// entirely: the corners now reveal a colour this component paints itself, in
// the same box, so there is nothing left to misalign. DailyQuest's is its
// gradient's own edge stop (the gradient is near-flat over the ~70-90pt this
// corner spans, so the flat colour reads as the same gradient continuing).
const SCREEN_BG: Partial<Record<keyof TabParamList, string>> = {
  // Building: PrayScreen's own container colour (colors.lightBg).
  DailyQuest: '#0D3B26', Building: '#F2F4F8', Leaderboard: '#F5F7FA', Profile: '#F2F4F8',
};

// The Figma bottom bar as the app's tab bar. On Home it draws nothing: the map
// renders its own translucent bar over the scrolling map. Elsewhere it is the
// solid bar, in the layout so screens end above it.
export default function Map2TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const s = width / FIGMA_W;
  const S = useMemo(() => makeMap2Styles(s), [s]);
  const current = state.routes[state.index].name as keyof TabParamList;
  const bottomClearance = Platform.OS === 'ios' ? Math.round(insets.bottom * 0.55) : 0;

  const onPress = useCallback((key: BottomBarKey) => {
    const name = ROUTE_OF[key];
    const route = state.routes.find(r => r.name === name);
    if (!route) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (current !== name && !event.defaultPrevented) navigation.navigate(name);
  }, [current, navigation, state.routes]);

  if (current === 'Map') return null;
  return (
    // The bar's top corners curve down 12.3pt. Pulling it up over the screen's
    // last 13pt puts the screen's own background behind those corners; without
    // it they showed the navigator's dark backdrop.
    <View style={{ height: BOTTOM_BAR_H * s + bottomClearance, marginTop: -CORNER_OVERLAP * s, backgroundColor: SCREEN_BG[current] }}>
      <Map2BottomBar S={S} s={s} bottomClearance={bottomClearance} active={KEY_OF[current] ?? 'home'} solid onPress={onPress} />
    </View>
  );
}

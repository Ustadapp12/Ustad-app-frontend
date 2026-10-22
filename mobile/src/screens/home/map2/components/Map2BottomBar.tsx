import React from 'react';
import { Platform, TouchableOpacity, View } from 'react-native';
import { useTourTarget } from '../../../../components/tour/useTourTarget';
import BottomBarBgArt, { BOTTOM_BAR_BG_H, BOTTOM_BAR_BG_W } from '../art/BottomBarBgArt';
import BottomBarBgSolidArt from '../art/BottomBarBgSolidArt';
import NavHomeArt from '../art/NavHomeArt';
import NavHomeInactiveArt from '../art/NavHomeInactiveArt';
import NavChestArt from '../art/NavChestArt';
import NavStarArt from '../art/NavStarArt';
import NavTrophyArt from '../art/NavTrophyArt';
import NavProfileArt from '../art/NavProfileArt';
import type { ArtProps } from '../art/types';
import type { Map2Styles } from '../styles';

export const BOTTOM_BAR_H = BOTTOM_BAR_BG_H;
export type BottomBarKey = 'home' | 'chest' | 'star' | 'trophy' | 'profile';

/** How far above the iOS home indicator the bar's icons sit. Every place that
 * draws this bar (Map2Screen, Map2TabBar, ComingSoonPage) must use this one
 * value: Map used 55% of the inset while the other tabs used 100%, so the
 * icons jumped ~15pt higher on every tab but Home (fixed 2026-10-22). */
export function bottomBarClearance(insetBottom: number): number {
  return Platform.OS === 'ios' ? Math.round(insetBottom * 0.55) : 0;
}

// Selected tab: the grey art turned the Figma green (the green chest in Figma
// 1151:9846 is exactly this swap). Home has its own drawn selected art.
const ACTIVE = { '#AFAFAF': '#218565' } as const;

interface Item {
  key: BottomBarKey;
  left: number; top: number; w: number;
  label: string;
}
// Figma positions inside the 375 x 46pt icon row.
const ITEMS: Item[] = [
  { key: 'home', left: 0, top: 11, w: 40, label: 'Home' },
  { key: 'chest', left: 81, top: 1, w: 46, label: 'Quests' },
  { key: 'star', left: 166, top: 7, w: 40, label: 'Pray' },
  { key: 'trophy', left: 254, top: 9, w: 40, label: 'Leaderboard' },
  { key: 'profile', left: 336, top: 7, w: 40, label: 'Profile' },
];

function ItemArt({ item, active, s }: { item: Item; active: BottomBarKey; s: number }) {
  const props: ArtProps = { width: item.w * s, fills: active === item.key ? ACTIVE : undefined };
  switch (item.key) {
    case 'home': return active === 'home' ? <NavHomeArt width={props.width} /> : <NavHomeInactiveArt width={props.width} />;
    case 'chest': return <NavChestArt {...props} />;
    case 'star': return <NavStarArt {...props} />;
    case 'trophy': return <NavTrophyArt {...props} />;
    case 'profile': return <NavProfileArt {...props} />;
  }
}

interface Props {
  S: Map2Styles;
  s: number;
  bottomClearance: number;
  active: BottomBarKey;
  // Map: translucent cream over the sand. Other pages: solid light grey (Figma).
  solid?: boolean;
  onPress: (key: BottomBarKey) => void;
}

function Map2BottomBar({ S, s, bottomClearance, active, solid, onPress }: Props) {
  const Bg = solid ? BottomBarBgSolidArt : BottomBarBgArt;
  // The guided tour measures each tab icon through these — called a fixed
  // number of times at the top level (Rules of Hooks), not once per item
  // inside the ITEMS.map() below, so this lookup is what the render loop
  // uses instead of calling useTourTarget per item.
  const homeTarget = useTourTarget('tabHome', 'round');
  const chestTarget = useTourTarget('tabQuests', 'round');
  const starTarget = useTourTarget('tabBuilding', 'round');
  const trophyTarget = useTourTarget('tabBoard', 'round');
  const profileTarget = useTourTarget('tabProfile', 'round');
  const tourRefOf: Record<BottomBarKey, React.Ref<View>> = {
    home: homeTarget.ref, chest: chestTarget.ref, star: starTarget.ref, trophy: trophyTarget.ref, profile: profileTarget.ref,
  };
  return (
    <View style={[S.bottomBar, { height: BOTTOM_BAR_H * s + bottomClearance, backgroundColor: 'transparent' }]}>
      <Bg width={BOTTOM_BAR_BG_W * s} style={{ position: 'absolute', left: -1 * s, top: -1 * s }} />
      {bottomClearance > 0 && (
        <View
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, height: bottomClearance + 1,
            backgroundColor: solid ? '#F5F7FA' : 'rgba(252,249,235,0.4)',
          }}
        />
      )}
      <View style={[S.bottomBarIcons, { left: 32.5 * s, top: 13 * s }]}>
        {ITEMS.map(item => (
          <TouchableOpacity
            key={item.key}
            ref={tourRefOf[item.key]}
            style={[S.navIcon, { left: item.left * s, top: item.top * s }]}
            onPress={() => onPress(item.key)}
            hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
            accessibilityLabel={item.label}
            accessibilityState={{ selected: item.key === active }}
          >
            <ItemArt item={item} active={active} s={s} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default React.memo(Map2BottomBar);

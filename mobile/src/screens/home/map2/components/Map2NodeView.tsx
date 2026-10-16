import React from 'react';
import { Animated, TouchableOpacity, View } from 'react-native';
import IconStarArt from '../art/IconStarArt';
import IconLockArt from '../art/IconLockArt';
import IconBookArt from '../art/IconBookArt';
import IconJumpArt from '../art/IconJumpArt';
import IconTrophyArt from '../art/IconTrophyArt';
import IconCameraArt from '../art/IconCameraArt';
import IconChestNodeArt from '../art/IconChestNodeArt';
import { DAY } from '../map2Theme';
import type { Map2NodeData, Map2Section } from '../map2Model';
import type { Map2Styles } from '../styles';
import ProgressRing from './ProgressRing';
import StarRow from './StarRow';
import NodeLabel from './NodeLabel';

// Which Figma node art each level state uses (user's mapping, 2026-10-15).
// reviewLocked is the chest, which has no pill face of its own.
export type NodeLook = 'current' | 'completed' | 'jump' | 'locked' | 'open' | 'reviewLocked' | 'reviewOpen';

const FACE = {
  current: DAY.node.current,
  completed: DAY.node.gold,
  jump: DAY.node.jump,
  locked: DAY.node.grey,
  open: DAY.node.grey,
  reviewLocked: DAY.node.grey,
  reviewOpen: DAY.node.grey,
} as const;

// Every surah's first level carries "JUMP HERE?" until it's done: every surah
// is open from the start, so any of them can be begun.
export function lookFor(node: Map2NodeData, activeSlot: number | null): NodeLook {
  if (node.slot === activeSlot) return 'current';
  if (node.status === 'completed') return 'completed';
  if (node.surahLevelIdx === 0) return 'jump';
  if (node.isSpecial) return node.status === 'locked' ? 'reviewLocked' : 'reviewOpen';
  if (node.status === 'locked') return 'locked';
  return 'open';
}

// The grey book drawn white on the green current node, like the Figma star.
const WHITE_BOOK = { '#AFAFAF': '#FFFFFF', '#D8D8D8': 'rgba(255,255,255,0.7)' } as const;

interface Props {
  S: Map2Styles;
  s: number;
  section: Map2Section;
  node: Map2NodeData;
  cx: number;
  cy: number;
  look: NodeLook;
  ringProgress: number;
  label?: string;
  isShaking: boolean;
  shakeAnim: Animated.Value;
  isFetching: boolean;
  onPress: (section: Map2Section, node: Map2NodeData) => void;
}

function NodeIcon({ look, s }: { look: NodeLook; s: number }) {
  // Figma icon boxes inside the 70 x 57pt face.
  const box = { position: 'absolute' as const, left: 14 * s, top: 11.5 * s };
  switch (look) {
    case 'current':
      return <IconBookArt width={42 * s} style={box} fills={WHITE_BOOK} />;
    case 'completed':
      return <IconStarArt width={42 * s} style={box} />;
    case 'jump':
      return <IconJumpArt width={42 * s} style={box} />;
    case 'locked':
      return <IconLockArt width={42 * s} style={box} />;
    case 'open':
      return <IconTrophyArt width={40 * s} style={{ position: 'absolute', left: 15 * s, top: 9 * s }} />;
    case 'reviewOpen':
      return <IconCameraArt width={48 * s} style={{ position: 'absolute', left: 11 * s, top: 6 * s }} />;
    case 'reviewLocked':
      return null;
  }
}

function Map2NodeView({
  S, s, section, node, cx, cy, look, ringProgress, label, isShaking, shakeAnim, isFetching, onPress,
}: Props) {
  const w = 70 * s, faceH = 57 * s, lip = 8 * s, r = 28.5 * s;
  const colors = FACE[look];
  const translateX = isShaking ? shakeAnim.interpolate({ inputRange: [-1, 1], outputRange: [-6 * s, 6 * s] }) : 0;
  return (
    <Animated.View
      style={{
        position: 'absolute', left: cx - w / 2, top: cy - faceH / 2, width: w, height: faceH + lip,
        opacity: isFetching ? 0.6 : 1, transform: [{ translateX }], zIndex: label != null ? 2 : 1,
      }}
    >
      {look === 'current' && (
        <View style={{ position: 'absolute', left: -14 * s, top: -12.85 * s }} pointerEvents="none">
          <ProgressRing size={98 * s} progress={ringProgress} />
        </View>
      )}
      <TouchableOpacity activeOpacity={0.8} onPress={() => onPress(section, node)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
        <View style={{ width: w, height: faceH + lip }}>
          {look === 'reviewLocked' ? (
            // Figma "Progress Check": an 80 x 90pt chest, same centre as a node.
            <IconChestNodeArt width={80 * s} style={{ position: 'absolute', left: -5 * s, top: -12.5 * s }} />
          ) : (
            <>
              <View style={{ position: 'absolute', top: lip, width: w, height: faceH, borderRadius: r, backgroundColor: colors.lip }} />
              <View style={{ position: 'absolute', top: 0, width: w, height: faceH, borderRadius: r, backgroundColor: colors.face }} />
              <NodeIcon look={look} s={s} />
            </>
          )}
        </View>
      </TouchableOpacity>
      {look === 'completed' && (
        <View style={{ position: 'absolute', left: -1.5 * s, top: 68.5 * s }} pointerEvents="none">
          <StarRow width={73 * s} earned={node.stars} />
        </View>
      )}
      {label != null && look === 'current' && (
        // Sits just clear of the progress ring's top edge.
        <View
          style={{ position: 'absolute', left: -100 * s, right: -100 * s, bottom: 80 * s, alignItems: 'center' }}
          pointerEvents="none"
        >
          <NodeLabel S={S} text={label} />
        </View>
      )}
      {label != null && look === 'jump' && (
        // Tappable like the node itself.
        <View
          style={{ position: 'absolute', left: -60 * s, right: -60 * s, bottom: 69 * s, alignItems: 'center' }}
          pointerEvents="box-none"
        >
          <TouchableOpacity activeOpacity={0.8} onPress={() => onPress(section, node)} accessibilityLabel={`Jump to ${section.name}`}>
            <NodeLabel S={S} text={label} />
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

export default React.memo(Map2NodeView);

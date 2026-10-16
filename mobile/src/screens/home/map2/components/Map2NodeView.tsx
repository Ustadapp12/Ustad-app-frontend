import React from 'react';
import { Animated, Pressable, TouchableOpacity, View } from 'react-native';
import IconStarArt from '../art/IconStarArt';
import IconLockArt from '../art/IconLockArt';
import IconBookArt from '../art/IconBookArt';
import IconJumpArt from '../art/IconJumpArt';
import { DAY } from '../map2Theme';
import type { Map2NodeData, Map2Section } from '../map2Model';
import type { Map2Styles } from '../styles';
import ProgressRing from './ProgressRing';
import StarRow from './StarRow';
import NodeLabel from './NodeLabel';

// Node colour by state (user's mapping, 2026-10-16): current green, locked
// grey, done gold. The icon follows the level type: a star for normal levels
// (a lock while locked), the book for review levels in every state.
export type NodeLook = 'current' | 'completed' | 'jump' | 'locked' | 'open';

const FACE = {
  current: DAY.node.current,
  completed: DAY.node.gold,
  jump: DAY.node.jump,
  locked: DAY.node.grey,
  open: DAY.node.grey,
} as const;

// Every surah's first level carries "JUMP HERE?" until it's done: every surah
// is open from the start, so any of them can be begun.
export function lookFor(node: Map2NodeData, activeSlot: number | null): NodeLook {
  if (node.slot === activeSlot) return 'current';
  if (node.status === 'completed') return 'completed';
  if (node.surahLevelIdx === 0) return 'jump';
  if (node.status === 'locked') return 'locked';
  return 'open';
}

// Icons are white on the green and gold faces, grey on the grey face.
const WHITE_BOOK = { '#AFAFAF': '#FFFFFF', '#D8D8D8': 'rgba(255,255,255,0.7)' } as const;
const GREY_STAR = { white: '#AFAFAF' } as const;

interface Props {
  S: Map2Styles;
  s: number;
  section: Map2Section;
  node: Map2NodeData;
  cx: number;
  cy: number;
  look: NodeLook;
  label?: string;
  isShaking: boolean;
  shakeAnim: Animated.Value;
  isFetching: boolean;
  onPress: (section: Map2Section, node: Map2NodeData) => void;
}

function NodeIcon({ look, review, s }: { look: NodeLook; review: boolean; s: number }) {
  // Figma icon box inside the 70 x 57pt face.
  const box = { position: 'absolute' as const, left: 14 * s, top: 11.5 * s };
  const onColour = look === 'current' || look === 'completed';
  if (look === 'jump') return <IconJumpArt width={42 * s} style={box} />;
  if (review) return <IconBookArt width={42 * s} style={box} fills={onColour ? WHITE_BOOK : undefined} />;
  if (look === 'locked') return <IconLockArt width={42 * s} style={box} />;
  return <IconStarArt width={42 * s} style={box} fills={onColour ? undefined : GREY_STAR} />;
}

function Map2NodeView({
  S, s, section, node, cx, cy, look, label, isShaking, shakeAnim, isFetching, onPress,
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
        // Centred on the whole node (57pt face + 8pt lip), so the gap inside the ring is even all round.
        <View style={{ position: 'absolute', left: -14 * s, top: -16.5 * s }} pointerEvents="none">
          <ProgressRing size={98 * s} />
        </View>
      )}
      <Pressable onPress={() => onPress(section, node)} hitSlop={6}>
        {({ pressed }) => (
          <View style={{ width: w, height: faceH + lip }}>
            <View style={{ position: 'absolute', top: lip, width: w, height: faceH, borderRadius: r, backgroundColor: colors.lip }} />
            {/* Pressed: the face sinks halfway onto its lip, like a real button. */}
            <View style={{ position: 'absolute', top: 0, width: w, height: faceH, transform: [{ translateY: pressed ? lip / 2 : 0 }] }}>
              <View style={{ position: 'absolute', top: 0, width: w, height: faceH, borderRadius: r, backgroundColor: colors.face }} />
              <NodeIcon look={look} review={!!node.isSpecial} s={s} />
            </View>
          </View>
        )}
      </Pressable>
      {look === 'completed' && (
        <View style={{ position: 'absolute', left: -1.5 * s, top: 68.5 * s }} pointerEvents="none">
          <StarRow width={73 * s} earned={node.stars} />
        </View>
      )}
      {label != null && look === 'current' && (
        // Sits just clear of the progress ring's top edge.
        <View
          style={{ position: 'absolute', left: -100 * s, right: -100 * s, bottom: 84 * s, alignItems: 'center' }}
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

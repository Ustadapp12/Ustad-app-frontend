import React, { useMemo } from 'react';
import { View, Text, Animated, TouchableOpacity } from 'react-native';
import { formatAyahRange, estimateAyahRange, type Section, type SectionNode, type TagPlacement } from '../mapModel';
import type { Styles } from '../mapStyles';
import { MapNode } from './MapNode';

// One tappable node plus its ayah-range pill. Memoized so a MapScreen render
// (card opened, fetch landed, bounce flag flipped) only re-renders the nodes
// whose own props changed instead of every node on the map. For that to hold,
// every prop must be stable: `section`/`node` come from MapScreen's memoized
// enrichedSections, `onPress` is a ref-backed stable callback, and
// `tagPlacement` is memoized.
export const MapNodeItem = React.memo(function NodeItem({
  section, node, levelNum, pill, isShaking, shakeAnim, isFetching, tagLabel, tagPlacement, onPress, S,
}: {
  section: Section;
  node: SectionNode;
  levelNum: number;
  pill?: { x: number; y: number; w: number; h: number };
  isShaking: boolean;
  shakeAnim: Animated.Value;
  isFetching: boolean;
  tagLabel?: string;
  tagPlacement?: TagPlacement;
  onPress: (section: Section, node: SectionNode) => void;
  S: Styles['S'];
}) {
  const shakeX = useMemo(
    () => shakeAnim.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] }),
    [shakeAnim],
  );
  const nodeEstimate = estimateAyahRange(node.levelNum ?? 1, section.ayahCount, node.isSpecial);
  const rangeLabel = formatAyahRange(node.startAyah ?? nodeEstimate.from, node.endAyah ?? nodeEstimate.to);
  return (
    <>
      <Animated.View
        style={[
          { position: 'absolute', left: node.x, top: node.y },
          isShaking && { transform: [{ translateX: shakeX }] },
        ]}
      >
        <TouchableOpacity
          activeOpacity={node.status === 'locked' ? 1 : 0.85}
          onPress={() => onPress(section, node)}
        >
          <MapNode
            status={node.status}
            stars={node.stars}
            levelNum={levelNum}
            isFetching={isFetching}
            isSpecial={node.isSpecial}
            tagLabel={tagLabel}
            tagPlacement={tagPlacement}
            S={S}
          />
        </TouchableOpacity>
      </Animated.View>
      {pill && (
        <View pointerEvents="none" style={[S.ayahPill, { position: 'absolute', left: pill.x, top: pill.y, width: pill.w, height: pill.h }]}>
          <Text style={S.ayahPillText} numberOfLines={1} adjustsFontSizeToFit>{rangeLabel}</Text>
        </View>
      )}
    </>
  );
});

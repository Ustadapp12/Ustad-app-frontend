import React, { useMemo } from 'react';
import { Animated, Image, View } from 'react-native';
import { MAP2_IMAGES } from '../assets';
import { bandContent, type Map2Layout, type Map2NodeData, type Map2Section } from '../map2Model';
import type { Map2Styles } from '../styles';
import Map2NodeView, { lookFor } from './Map2NodeView';
import MapPath from './MapPath';
import MapDecor from './MapDecor';
import SurahBoardView from './SurahBoardView';

interface Props {
  S: Map2Styles;
  layout: Map2Layout;
  band: number;
  nodesBySlot: { section: Map2Section; node: Map2NodeData }[];
  activeSlot: number | null;
  ringProgress: number;
  shakingNodeId: string | null;
  shakeAnim: Animated.Value;
  fetchingSurah: number | null;
  onNodePress: (section: Map2Section, node: Map2NodeData) => void;
  // The open level card, when it belongs to a node in this band.
  overlay?: React.ReactNode;
}

// One horizontal slice of the continuous map. Built only while the list
// keeps it near the screen; everything inside is positioned map-wide and
// shifted up by the band's top.
function Map2Band({
  S, layout, band, nodesBySlot, activeSlot, ringProgress, shakingNodeId, shakeAnim, fetchingSurah, onNodePress, overlay,
}: Props) {
  const c = useMemo(() => bandContent(layout, band), [layout, band]);
  const { s, lumo } = layout;
  const nodes: React.ReactNode[] = [];
  for (let slot = c.from; slot <= c.to; slot++) {
    const entry = nodesBySlot[slot];
    if (!entry) continue;
    const { section, node } = entry;
    const look = lookFor(node, activeSlot);
    nodes.push(
      <Map2NodeView
        key={slot}
        S={S}
        s={s}
        section={section}
        node={node}
        cx={layout.cx[slot]}
        cy={layout.cy[slot] - c.top}
        look={look}
        ringProgress={look === 'current' ? ringProgress : 0}
        label={look === 'current' ? 'START' : look === 'jump' ? 'JUMP HERE?' : undefined}
        isShaking={shakingNodeId === node.id}
        shakeAnim={shakeAnim}
        isFetching={node.status === 'pending' && fetchingSurah === section.surahNum}
        onPress={onNodePress}
      />,
    );
  }
  return (
    <View style={{ width: layout.mapW, height: c.height }}>
      <MapDecor items={c.decor} offsetY={c.top} />
      <MapPath dashes={c.dashes} len={layout.dashLen} thick={layout.dashThick} offsetY={c.top} />
      {c.boards.map(b => (
        <SurahBoardView key={b.surahNum} S={S} s={s} board={b} w={layout.boardW} h={layout.boardH} offsetY={c.top} />
      ))}
      {c.hasLumo && (
        <Image
          source={MAP2_IMAGES.lumo}
          style={{ position: 'absolute', left: lumo.x, top: lumo.y - c.top, width: lumo.w, height: lumo.h }}
          resizeMode="contain"
          accessibilityLabel="Lumo at the start of your journey"
        />
      )}
      {nodes}
      {overlay}
    </View>
  );
}

export default React.memo(Map2Band);

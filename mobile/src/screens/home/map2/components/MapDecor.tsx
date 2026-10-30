import React from 'react';
import { StyleSheet, View } from 'react-native';
import GrassRockArt from '../art/GrassRockArt';
import GrassArt from '../art/GrassArt';
import DuneAArt from '../art/DuneAArt';
import DuneBArt from '../art/DuneBArt';
import DunePillsArt from '../art/DunePillsArt';
import DuneWideArt from '../art/DuneWideArt';
import type { Decor, DecorKind } from '../map2Model';
import type { ArtProps } from '../art/types';

const ART: Record<DecorKind, React.ComponentType<ArtProps>> = {
  grassRock: GrassRockArt,
  grass: GrassArt,
  duneA: DuneAArt,
  duneB: DuneBArt,
  dunePills: DunePillsArt,
  duneWide: DuneWideArt,
};

// Sand dunes and grass tufts. Behind the path and nodes, never touchable.
function MapDecor({ items, offsetY }: { items: Decor[]; offsetY: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {items.map(d => {
        const Art = ART[d.kind];
        return (
          <Art
            key={d.key}
            width={d.w}
            height={d.h}
            style={[styles.decor, { left: d.x, top: d.y - offsetY, transform: d.flip ? [{ scaleX: -1 }] : undefined }]}
          />
        );
      })}
    </View>
  );
}

export default React.memo(MapDecor);

const styles = StyleSheet.create({
  decor: { position: 'absolute' },
});

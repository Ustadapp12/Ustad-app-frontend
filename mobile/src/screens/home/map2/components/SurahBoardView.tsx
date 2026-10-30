import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import SurahBoardArt from '../art/SurahBoardArt';
import type { Board } from '../map2Model';
import type { Map2Styles } from '../styles';

// Wooden surah sign beside a surah's first node. Angles from the Figma frame:
// the left-side board tilts +8.68deg with its text at -12.35deg inside it; the
// right-side board is the same art mirrored, tilted the other way.
function SurahBoardView({ S, s, board, w, h, offsetY }: { S: Map2Styles; s: number; board: Board; w: number; h: number; offsetY: number }) {
  const right = board.side === 'right';
  return (
    <View
      pointerEvents="none"
      style={[styles.board, { left: board.cx - w / 2, top: board.cy - offsetY - h / 2, width: w, height: h, transform: [{ rotate: right ? '-12.39deg' : '8.68deg' }] }]}
    >
      <SurahBoardArt width={w} style={right ? { transform: [{ scaleX: -1 }] } : undefined} />
      <View
        style={[styles.boardLabel, { left: 10 * s, top: 15 * s, width: 113.5 * s, height: 42.5 * s, transform: [{ rotate: right ? '10.83deg' : '-12.35deg' }] }]}
      >
        <Text style={S.boardText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          Surah {board.name}
        </Text>
      </View>
    </View>
  );
}

export default React.memo(SurahBoardView);

const styles = StyleSheet.create({
  board: { position: 'absolute' },
  boardLabel: { position: 'absolute', justifyContent: 'center' },
});

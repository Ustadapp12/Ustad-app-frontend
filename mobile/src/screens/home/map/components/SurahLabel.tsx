import React from 'react';
import { View, Text, Image } from 'react-native';
import { SCROLL_SRC, type LabelBox } from '../mapModel';
import type { Styles } from '../mapStyles';

// ── Surah name label — scroll art behind Arabic + English name ───────────
// Memoized: its props only change with the chapter layout, so it skips every
// other MapScreen render.
export const SurahLabel = React.memo(function Label({ name, box, SL }: {
  name: string; box: LabelBox; sc: (n: number) => number; SL: Styles['SL'];
}) {
  return (
    <View style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, alignItems: 'center', justifyContent: 'center' }}>
      <Image source={SCROLL_SRC} resizeMode="contain" style={{ position: 'absolute', width: box.w, height: box.h }} />
      <View style={SL.labelBox}>
        <Text style={SL.english} numberOfLines={1} adjustsFontSizeToFit>{name}</Text>
      </View>
    </View>
  );
});

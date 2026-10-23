import React, { useEffect, useMemo, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import type { Scale } from '../utils/responsive';

// The glowing progress bar from the Figma Progress screen (progress_final):
// an 11pt beige track inside a soft white rim, and a 19pt fill made of three
// concentric greens (halo, mid, bright core) so it reads as lit from inside.
// Every number is Figma pt, through `d` (designScale), sampled from the 2x
// export. Semi-transparent white rims so it sits right on any card colour.
const C = {
  rim: 'rgba(255,255,255,0.4)',
  track: '#D9D1C2',
  halo: '#B0DEA3',
  mid: '#5EC470',
  core: '#24B874',
};

interface Props {
  /** 0..1. Real progress always shows at least a full rounded pill. */
  fraction: number;
  d: Scale;
}

export default function GlowProgressBar({ fraction, d }: Props) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: fraction, duration: 600, useNativeDriver: false }).start();
  }, [anim, fraction]);
  const s = useMemo(() => makeStyles(d), [d]);

  return (
    <View style={s.wrap}>
      <View style={s.trackRim}>
        <View style={s.track} />
      </View>
      {fraction > 0 && (
        <Animated.View
          style={[s.fillRim, { width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
        >
          <View style={s.halo}>
            <View style={s.mid}>
              <View style={s.core} />
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

function makeStyles(d: Scale) {
  const H = d(19);
  const r = H / 2;
  return StyleSheet.create({
    wrap: { height: H, justifyContent: 'center' },
    trackRim: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: r,
      backgroundColor: C.rim, padding: d(4),
    },
    track: { flex: 1, borderRadius: r, backgroundColor: C.track },
    // minWidth = height: a tiny fraction is still a whole glowing pill,
    // never a sliver, and 0 shows no fill at all (handled above).
    fillRim: { height: H, minWidth: H, borderRadius: r, backgroundColor: C.rim, padding: d(1) },
    halo: { flex: 1, borderRadius: r, backgroundColor: C.halo, padding: d(3) },
    mid: { flex: 1, borderRadius: r, backgroundColor: C.mid, padding: d(3) },
    core: { flex: 1, borderRadius: r, backgroundColor: C.core },
  });
}

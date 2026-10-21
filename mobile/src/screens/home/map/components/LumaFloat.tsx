import React from 'react';
import { View, Image } from 'react-native';
import MascotShadow from '../../../../components/MascotShadow';
import type { Styles } from '../mapStyles';
import { SpeechBubble } from './SpeechBubble';

// ── Luma mascot ───────────────────────────────────────────────────
export function LumaFloat({ style, speech, speechTailAngle, S, SB, sc }: { style?: object; speech?: string; speechTailAngle?: number; S: Styles['S']; SB: Styles['SB']; sc: (n: number) => number }) {
  return (
    <View style={[{ alignItems: 'center' }, style]}>
      {speech && <SpeechBubble text={speech} SB={SB} tailAngle={speechTailAngle} />}
      <View style={S.lumaGlow}>
        <Image
          source={require('../../../../../assets/shared/mascot/lumo_kufi.png')}
          style={S.lumaImg}
          resizeMode="contain"
        />
      </View>
      {/* Ground contact shadow — fixed, doesn't bob with ty (translateY
          above) so it reads as Lumo lifting off his own shadow rather than
          the shadow floating with him. Normal flow (not MascotShadow's
          default absolute-under-the-Image), pulled up under the glow
          circle's base via negative margin instead. */}
      <MascotShadow width={sc(96)} style={{ position: 'relative', marginTop: -sc(10) }} />
    </View>
  );
}

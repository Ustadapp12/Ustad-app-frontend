import React from 'react';
import { Text, StyleSheet } from 'react-native';

// Faint, rotated Arabic letters scattered behind the loading screen.
const LETTERS = [
  { char: 'ن', top: '6%', left: '7%', size: 32, rotate: '-12deg', opacity: 0.06 },
  { char: 'ف', top: '11%', right: '9%', size: 40, rotate: '18deg', opacity: 0.04 },
  { char: 'ع', top: '30%', left: '4%', size: 28, rotate: '5deg', opacity: 0.05 },
  { char: 'ر', top: '55%', right: '6%', size: 34, rotate: '-18deg', opacity: 0.04 },
  { char: 'ق', top: '75%', left: '8%', size: 24, rotate: '8deg', opacity: 0.045 },
] as const;

export default function ArabicLettersBackdrop() {
  return (
    <>
      {LETTERS.map((l, i) => (
        <Text
          key={i}
          style={[
            styles.letter,
            {
              top: l.top,
              left: 'left' in l ? l.left : undefined,
              right: 'right' in l ? l.right : undefined,
              fontSize: l.size,
              transform: [{ rotate: l.rotate }],
              opacity: l.opacity,
            },
          ]}
        >
          {l.char}
        </Text>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  letter: { position: 'absolute', fontFamily: 'NotoNaskhArabic-Regular', color: '#F5F7FA' },
});

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { useArabicFont, arabicTextStyle } from '../../utils/arabicFont';

interface Token { ar: string; blank?: boolean }

interface Props {
  /** Ayah words before the drilled segment. */
  before?: string[] | null;
  /** The drilled segment; exactly one token has blank: true. */
  tokens?: Token[] | null;
  /** Ayah words after the drilled segment. */
  after?: string[] | null;
  /** Shown inside the blank once something is picked; null leaves it empty. */
  blankText?: string | null;
}

// The ayah as ONE line of words in reading order with the blank inline,
// wrapping naturally only when it's genuinely too long for the card.
//
// The words before and after the drilled segment used to render as separate
// stacked blocks above and below the segment's own row, so even a short ayah
// broke into three lines and the blank sat alone on the middle one, nowhere
// near its real place in the sentence.
export default function AyahWithBlank({ before, tokens, after, blankText }: Props) {
  const arabicFont = useArabicFont();
  // Memoized: the lesson screen re-renders often (timers, feedback, audio
  // state), and none of these change unless the font or the exercise does.
  const { wordStyle, blankTextStyle, blankStyle } = useMemo(() => ({
    wordStyle: arabicTextStyle(S.word as any, arabicFont) as any,
    blankTextStyle: arabicTextStyle(S.blankText as any, arabicFont) as any,
    // Fixed size tuned for the default Naskh font. Nastaliq needs a narrower
    // box (scale shrinks glyph width) but a taller one (lineHeightScale, its
    // letterforms stack vertically); see arabicFont.ts.
    blankStyle: [S.blank, {
      height: Math.round(40 * arabicFont.scale * arabicFont.lineHeightScale),
      minWidth: Math.round(70 * arabicFont.scale),
    }],
  }), [arabicFont]);

  // Empty strings (stray whitespace tokens) would still take up a gap slot
  // and push everything off centre, so they're dropped.
  const words = useMemo((): Token[] => [
    ...(before ?? []).map((ar): Token => ({ ar })),
    ...(tokens ?? []),
    ...(after ?? []).map((ar): Token => ({ ar })),
  ].filter(t => t.blank || t.ar.trim().length > 0), [before, tokens, after]);

  return (
    <View style={S.row}>
      {words.map((t, i) =>
        t.blank ? (
          <View key={i} style={blankStyle}>
            {blankText ? <Text style={blankTextStyle}>{blankText}</Text> : null}
          </View>
        ) : (
          <Text key={i} style={wordStyle}>{t.ar}</Text>
        ),
      )}
    </View>
  );
}

const S = StyleSheet.create({
  // row-reverse: Arabic reads right to left. alignItems keeps the blank's
  // underline level with the words around it.
  row: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', columnGap: 10, rowGap: 6, width: '100%' },
  // lineHeight reserves room for harakat, which sit outside the font's own
  // ascent/descent box and get clipped without it.
  word: { fontFamily: 'NotoNaskhArabic-Regular', fontSize: 24, color: colors.darkText, lineHeight: 38 },
  blank: { borderBottomWidth: 2.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  blankText: { fontFamily: 'NotoNaskhArabic-Regular', fontSize: 24, color: colors.primary, lineHeight: 38 },
});

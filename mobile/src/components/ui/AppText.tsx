import React from 'react';
import { Platform, StyleSheet, Text, TextProps, TextStyle } from 'react-native';
import { typography, arabicFontForScript, androidSafeFont, fontFamily } from '../../theme/typography';
import { useScriptStore } from '../../store/scriptStore';

type Variant = keyof typeof typography;

interface Props extends TextProps {
  variant?: Variant;
}

function isBoldWeight(weight: TextStyle['fontWeight']): boolean {
  if (weight == null) return false;
  if (weight === 'bold') return true;
  const n = typeof weight === 'number' ? weight : parseInt(String(weight), 10);
  return !Number.isNaN(n) && n >= 700;
}

export function AppText({ variant = 'body', style, ...rest }: Props) {
  const script = useScriptStore(s => s.script);
  const fontOverride =
    variant === 'arabic'
      ? { fontFamily: arabicFontForScript(script) }
      : undefined;

  const merged = StyleSheet.flatten([typography[variant], fontOverride, style]) as TextStyle;
  const safe = androidSafeFont(merged);

  if (Platform.OS === 'android') {
    if (!fontOverride && isBoldWeight(merged.fontWeight)) {
      // Only apply Nunito-Bold when no explicit Arabic font was set; otherwise
      // the bold check would replace the Arabic font family with Nunito-Bold.
      safe.fontFamily = fontFamily.bold;
    } else if (!safe.fontFamily) {
      safe.fontFamily = fontFamily.regular;
    }
  }

  return <Text style={safe} {...rest} />;
}

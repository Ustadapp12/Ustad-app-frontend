import React from 'react';
import { Text, TextProps } from 'react-native';
import { typography, arabicFontForScript, androidSafeFont } from '../../theme/typography';
import { getScriptPreferenceSync } from '../../utils/storage';

type Variant = keyof typeof typography;

interface Props extends TextProps {
  variant?: Variant;
}

export function AppText({ variant = 'body', style, ...rest }: Props) {
  const base = androidSafeFont(typography[variant]);
  // For arabic variant, apply the user's chosen script font
  const fontOverride =
    variant === 'arabic'
      ? { fontFamily: arabicFontForScript(getScriptPreferenceSync()) }
      : undefined;

  return <Text style={[base, fontOverride, style]} {...rest} />;
}

import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { typography } from '../../theme/typography';

type Variant = keyof typeof typography;

interface Props extends TextProps {
  variant?: Variant;
}

export function AppText({ variant = 'body', style, ...rest }: Props) {
  return <Text style={[typography[variant], style]} {...rest} />;
}

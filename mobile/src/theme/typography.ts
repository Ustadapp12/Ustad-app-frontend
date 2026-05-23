import { TextStyle } from 'react-native';
import { colors } from './colors';

/** Link Nunito TTF in native projects for exact brand match. */
export const fontFamily = {
  regular: 'System',
  bold: 'System',
  black: 'System',
};

export const typography: Record<string, TextStyle> = {
  h1: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.dark,
    fontFamily: fontFamily.black,
  },
  h2: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.dark,
    fontFamily: fontFamily.bold,
  },
  body: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.charcoal,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.grey,
  },
  button: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.5,
  },
  brand: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.primary,
  },
  arabic: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.dark,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
};

import { Platform, TextStyle } from 'react-native';
import { colors } from './colors';

/** Android ignores custom fontFamily when fontWeight is also set. */
export function androidSafeFont(style: TextStyle): TextStyle {
  if (Platform.OS !== 'android' || !style.fontFamily) {
    return style;
  }
  const { fontWeight: _omit, ...rest } = style;
  return rest;
}

export const fontFamily = {
  regular: 'Nunito-Regular',
  bold:    'Nunito-Bold',
  black:   'Nunito-Bold',
  /** Arabic script fonts — chosen per user's script preference */
  arabicUthmani: 'AmiriQuran',      // traditional mushaf calligraphy
  arabicNastaliq: 'NotoNastaliqUrdu', // Persian/Nastaliq style
  arabicSimple:   'NotoNaskhArabic',  // clean modern Naskh
};

/** Returns the Arabic font family for the user's script preference. */
export function arabicFontForScript(pref?: string | null): string {
  switch (pref) {
    case 'nastaliq': return fontFamily.arabicNastaliq;
    case 'simple':   return fontFamily.arabicSimple;
    case 'uthmani':
    default:         return fontFamily.arabicUthmani;
  }
}

export const typography: Record<string, TextStyle> = {
  h1: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.dark,
    fontFamily: fontFamily.bold,
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
    fontFamily: fontFamily.regular,
  },
  caption: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.grey,
    fontFamily: fontFamily.regular,
  },
  button: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.5,
    fontFamily: fontFamily.bold,
  },
  brand: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.primary,
    fontFamily: fontFamily.bold,
  },
  arabic: {
    fontSize: 26,
    color: colors.dark,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontFamily: fontFamily.arabicUthmani,
    lineHeight: 44,
  },
};

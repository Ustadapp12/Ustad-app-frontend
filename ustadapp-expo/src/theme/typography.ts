import { Platform } from 'react-native';

export const fonts = {
  // Plus Jakarta Sans (loaded via @expo-google-fonts/plus-jakarta-sans)
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',

  // Arabic (loaded via expo-font from local assets)
  arabicRegular: 'NotoNaskhArabic_400Regular',
  arabicMedium: 'NotoNaskhArabic_500Medium',
  arabicSemiBold: 'NotoNaskhArabic_600SemiBold',
  arabicBold: 'NotoNaskhArabic_700Bold',
} as const;

export const typography = {
  h1: { fontFamily: fonts.extraBold, fontSize: 28, lineHeight: 36 },
  h2: { fontFamily: fonts.extraBold, fontSize: 24, lineHeight: 30 },
  h3: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26 },
  h4: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22 },
  bodyLarge: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  bodySmall: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 16 },
  label: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 16, letterSpacing: 1.2 },
  button: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },
  buttonSmall: { fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 18 },

  // Arabic
  arabicLarge: { fontFamily: fonts.arabicBold, fontSize: 28, lineHeight: 42, writingDirection: 'rtl' as const },
  arabic: { fontFamily: fonts.arabicRegular, fontSize: 20, lineHeight: 32, writingDirection: 'rtl' as const },
  arabicSmall: { fontFamily: fonts.arabicRegular, fontSize: 16, lineHeight: 26, writingDirection: 'rtl' as const },
  bismillah: { fontFamily: fonts.arabicRegular, fontSize: 19, lineHeight: 30, writingDirection: 'rtl' as const },
} as const;


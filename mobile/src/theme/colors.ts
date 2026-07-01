export const colors = {
  // Primary green
  primary: '#2A7D4F',
  primaryDark: '#1B6E42',
  primaryLight: '#37A168',
  primaryBg: '#E8F5EE',

  // Map / home screen
  mapBg: '#2A8C5A',
  mapBgDark: '#1A5C3A',

  // Splash
  splashBg: '#0D1B2A',

  // Quest screen
  questBg: '#0D3B26',
  questBgMid: '#1A5C3A',

  // Streak screen
  streakBg: '#EEF7F0',

  // Text
  darkText: '#0F1C2E',
  midText: '#374151',
  mutedText: '#6B7280',
  placeholderText: '#9CA3AF',

  // Backgrounds
  lightBg: '#F2F4F8',
  white: '#FFFFFF',
  cardBg: '#FFFFFF',

  // Borders
  border: '#E5E7EB',
  borderDark: '#D1D5DB',

  // Gold / XP
  gold: '#E0BC4E',
  goldDark: '#C4A84C',
  goldBg: '#FFF8E1',
  goldBorder: '#FDE68A',

  // Danger / Hearts
  red: '#DC2626',
  redBg: '#FEF2F2',

  // Blue (secondary path)
  blue: '#2563EB',
  blueBg: '#EFF6FF',

  // Completed node
  nodeGold: '#F0C040',
  nodeGoldDark: '#C8901A',

  // Locked node
  nodeLocked: '#B0B8C8',
  nodeLockedBorder: '#8A95A8',
  nodeLockedIcon: '#6B7280',

  // Success
  success: '#16A34A',
  successBg: '#F0FDF4',

  // Warning
  warning: '#92660A',
  warningBg: '#FFFBEB',
} as const;

export type ColorKey = keyof typeof colors;


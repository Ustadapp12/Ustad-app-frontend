// Figma source: file Zuu6uvLzDNTU2Ximzo80nr, node 1047:1651 (day map, 440pt frame).
// Every size in map2 is authored in that frame's points and scaled by
// `s = screenWidth / FIGMA_W`, so the layout is the Figma frame at any width.
export const FIGMA_W = 440;

// Day palette. A night theme later is a second object of the same shape.
export const DAY = {
  ground: '#FAF1D9',
  sky: '#82D4F7',
  ink: '#0F1B2A',
  boardInk: '#513424',
  labelGreen: '#05966A',
  labelBorder: '#E5E5E5',
  pathDash: '#EBCDA9',
  featureBg: 'rgba(217,217,217,0.4)',
  bottomBar: '#FCF9EB',
  node: {
    grey: { face: '#E5E5E5', lip: '#B7B7B7' },
    gold: { face: '#F5CB58', lip: '#DCB430' },
    current: { face: '#42A46E', lip: '#2E8A66' },
    jump: { face: '#42A46E', lip: '#256E52' },
  },
  starOn: '#FFC800',
  starOff: '#D8D8D8',
  ringTrack: '#E5E5E5',
  // Same green as the current node (Figma's gold ring was a placeholder).
  ringFill: '#42A46E',
} as const;

export const FONTS = {
  label: 'Inter-Bold',
  number: 'Nunito-Black',
  caption: 'Nunito-ExtraBold',
} as const;

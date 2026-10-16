import type { StyleProp, ViewStyle } from 'react-native';

export interface ArtProps {
  width: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  // Swap source colours, keyed by the hex in the SVG (e.g. '#AFAFAF').
  fills?: Readonly<Record<string, string>>;
}

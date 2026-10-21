import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import ComingSoonPage from './ComingSoonPage';

type Props = NativeStackScreenProps<RootStackParamList, 'ComingSoon'>;

// Opened by the map's Journey and Review buttons until those pages exist
// (chest selected, as in the Figma frame).
export default function ComingSoonScreen({ route }: Props) {
  return <ComingSoonPage title={route.params.title} active="chest" />;
}

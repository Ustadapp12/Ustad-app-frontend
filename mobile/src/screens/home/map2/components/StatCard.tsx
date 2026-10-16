import React from 'react';
import { Image, Text, TouchableOpacity, View, type ImageSourcePropType } from 'react-native';
import StatPillBgArt, { STAT_PILL_BG_W } from '../art/StatPillBgArt';
import type { Map2Styles } from '../styles';

interface Props {
  S: Map2Styles;
  s: number;
  icon: ImageSourcePropType;
  value: string;
  label: string;
  onPress?: () => void;
}

function StatCard({ S, s, icon, value, label, onPress }: Props) {
  const body = (
    <>
      <View style={S.statPill}>
        <StatPillBgArt width={STAT_PILL_BG_W * s} />
      </View>
      <Image source={icon} style={S.statIcon} resizeMode="contain" />
      <Text style={S.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{value}</Text>
    </>
  );
  if (!onPress) return <View style={S.statCard} accessibilityLabel={`${label} ${value}`}>{body}</View>;
  return (
    <TouchableOpacity style={S.statCard} activeOpacity={0.7} onPress={onPress} accessibilityLabel={`${label} ${value}`}>
      {body}
    </TouchableOpacity>
  );
}

export default React.memo(StatCard);

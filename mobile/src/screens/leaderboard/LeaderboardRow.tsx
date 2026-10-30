import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet, type ImageSourcePropType } from 'react-native';
import { designScale, LB, type Scale } from './styles';

// STAND-IN ART: the Figma rows show ribbon medals for ranks 1 to 3 (nodes
// 1126:9197, 1126:9199, 1126:9209), which could not be exported when this
// was built (Figma MCP plan limit). Swap these for the exported medals.
const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

interface Props {
  sc: Scale;
  rank: number;
  name: string;
  xp: number;
  avatar: ImageSourcePropType;
  isMe: boolean;
}

export default function LeaderboardRow({ sc, rank, name, xp, avatar, isMe }: Props) {
  const s = useMemo(() => makeStyles(designScale(sc)), [sc]);
  const medal = MEDAL[rank];
  return (
    <View style={[s.row, isMe && s.rowMe]}>
      <View style={s.rankSlot}>
        {medal
          ? <Text style={s.medal}>{medal}</Text>
          : <Text style={[s.rank, isMe && s.textMe]}>{rank}</Text>}
      </View>
      {/* Plain square art, never clipped to a circle: every avatar file is
          the same square size, so one box size keeps every row identical. */}
      <Image source={avatar} style={s.avatar} resizeMode="contain" />
      <Text style={[s.name, isMe && s.textMe]} numberOfLines={1} ellipsizeMode="tail">
        {isMe ? 'You' : name}
      </Text>
      <Text style={[s.pts, isMe && s.textMe]}>{xp.toLocaleString()} pts</Text>
    </View>
  );
}

function makeStyles(d: Scale) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row', alignItems: 'center', height: d(43), marginBottom: d(8),
      backgroundColor: '#FFFFFF', borderRadius: d(10), paddingLeft: d(12), paddingRight: d(19),
    },
    rowMe: {
      backgroundColor: LB.meBg, borderBottomWidth: d(3), borderBottomColor: LB.meEdge,
      shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 4, elevation: 4,
    },
    rankSlot: { width: d(24), alignItems: 'center', justifyContent: 'center' },
    rank: { fontFamily: 'Nunito-Bold', fontSize: d(14), color: LB.text },
    medal: { fontSize: d(17) },
    avatar: { width: d(34), height: d(34), marginLeft: d(8) },
    name: { flex: 1, fontFamily: 'Nunito-Bold', fontSize: d(14), color: LB.text, marginLeft: d(10) },
    pts: { fontFamily: 'Nunito-Bold', fontSize: d(14), color: LB.pts, marginLeft: d(8) },
    textMe: { color: LB.meText },
  });
}

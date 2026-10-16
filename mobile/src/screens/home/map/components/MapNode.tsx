import React from 'react';
import { View, Text, Image, ActivityIndicator } from 'react-native';
import { NODE_SRCS, type NodeStatus, type TagPlacement } from '../mapModel';
import type { Styles } from '../mapStyles';

// ── Map node — one visual shell for every non-completed/non-green status.
// The ONLY differentiator for a real locked gate is the lock icon; nothing
// is dimmed/faded anymore (dimming previously read as "broken", not "locked"). ──
export function MapNode({ status, stars, levelNum, isFetching, isSpecial, tagLabel, tagPlacement, S }: {
  status: NodeStatus; stars: number;
  levelNum: number; isFetching?: boolean; isSpecial?: boolean;
  // "Begin here" (never completed a level yet) / "Continue here" (returning
  // user) — shown only on the one node the backend recommends next.
  // Undefined everywhere else.
  tagLabel?: string;
  // Where the tag hangs relative to the node. Decided by the caller, which is
  // the only place that knows MAP_W, this node's x, and where the surah-name
  // scroll sits — see nodeTagPlacement().
  tagPlacement?: TagPlacement;
  S: Styles['S'];
}) {
  // Open = unlocked and playable right now. Open nodes sit slightly larger
  // (below) as their cue. The breathing glow they used to have was removed
  // 2026-10-13: an elevation shadow with a looping opacity forced the whole
  // map to redraw several times a second, the main cost on Samsung phones.
  const isOpen = status !== 'locked' && status !== 'completed';
  // Special/review (collective) node art, by status:
  //   completed → gold special_done.png
  //   locked    → plain green node_current.png. Green keeps it visually
  //               distinct as "special" even while locked, but without the
  //               star, which clashes with the 🔒 overlay drawn below.
  //   open      → recommended_special.png (green + star). Every reachable
  //               review node gets the star now, not only the backend's
  //               recommended-next one: the old "merely unlocked" art
  //               (special.png) is byte-identical to node_current.png, so
  //               that case rendered as a blank green tile indistinguishable
  //               from a locked node minus its padlock.
  //
  // The pulse ring that used to sit behind reachable special nodes is gone
  // (removed 2026-08-28, user: "not working anyway") — the star art and the
  // white "Begin/Continue here!" tag are the visual cues now.
  const nodeImgSrc = isSpecial
    ? (status === 'completed' ? NODE_SRCS.specialDone
      : status === 'locked' ? NODE_SRCS.current
      : NODE_SRCS.recommendedSpecial)
    : (status === 'completed' ? NODE_SRCS.completed : NODE_SRCS.locked);

  return (
    <View style={S.nodeWrapper}>
      {!!tagLabel && !!tagPlacement && (
        <View
          style={[
            S.nodeTagWrap,
            S.nodeTagWrapAbove,
            { left: tagPlacement.left, alignItems: tagPlacement.alignItems },
          ]}
          pointerEvents="none"
        >
          {/* adjustsFontSizeToFit is the last line of defence only — the wrap
              above is a real fixed NODE_TAG_W box (it used to inherit the
              node's own NODE_SIZE-wide parent, which left it literally
              negative space to lay out in and truncated "Continue here" to
              "Conti…" on every device), so the label fits at full size. */}
          <View style={S.nodeTag}>
            <Text style={S.nodeTagText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              {tagLabel}
            </Text>
            <View style={S.nodeTagArrowGold} />
            <View style={S.nodeTagArrowFill} />
          </View>
        </View>
      )}
      <View style={S.nodeShadow} />
      {/* Completed nodes used to pulse (looping scale); removed 2026-10-13
          with the glow, since any looping animation keeps the whole map
          redrawing. Gold art + stars are the completed cue now. */}
      <View style={[
        S.node,
        // Open nodes sit a touch larger than locked ones — a "pop out" cue
        // that reads even with the glow now much smaller (2026-09-01).
        isOpen && { transform: [{ scale: 1.06 }] },
      ]}>
        {/* recommended_special.png has substantially more baked-in
            transparent padding around its badge than every other node's
            art (node_current.png, node_locked.png, etc.) — at the same
            NODE_SIZE box that renders visibly smaller than the rest, not
            bigger despite it being the one meant to draw the eye.
            Compensating with a larger box specifically for this one
            source (not touching NODE_SIZE globally, which every other
            node also uses) so the visible badge actually matches. */}
        <Image
          source={nodeImgSrc}
          resizeMode="contain"
          style={nodeImgSrc === NODE_SRCS.recommendedSpecial ? [S.nodeImg, S.nodeImgRecommendedSpecial] : S.nodeImg}
        />
        {status === 'locked' ? (
          <Text style={S.lockIcon}>🔒</Text>
        ) : status === 'pending' && isFetching ? (
          <ActivityIndicator size="small" color="#5A3A00" />
        ) : isSpecial ? (
          // Review node: the star is already baked into
          // recommended_special.png / special_done.png, so no separate glyph
          // is drawn here.
          null
        ) : (
          <Text style={S.nodeNumber}>{levelNum}</Text>
        )}
        {status === 'completed' && stars > 0 && (
          <View style={S.starsBadge}><Text style={S.starsText}>{'★'.repeat(stars)}</Text></View>
        )}
      </View>
    </View>
  );
}

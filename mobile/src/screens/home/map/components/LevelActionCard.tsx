import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { formatAyahRange } from '../mapModel';
import type { Styles } from '../mapStyles';
import { MASCOT } from '../../../../assets';

// ── Level action card — the on-map popout for "start a new level" (fresh
// node tap) and "repeat the lesson" (completed node tap), replacing what used
// to be an instant navigate / a plain text prompt. Fixed width AND height
// (see ACTION_CARD_ASPECT), with title/subtitle/button each positioned as a
// percentage box of that fixed frame (see makeStyles) — matches the Figma
// playcard redesign (node 1090:4964, "Landing-Page" file) exactly rather
// than sizing to content. No close button in that design — dismissal is a
// tap anywhere else on the map, wired up in Map2Band/Map2Screen — so unlike
// the close button this card used to have, there's no in-card dismiss path.
//
// Scales in on mount and scales+fades out before the confirm button actually
// does anything — the parent only clears the state that unmounts this
// (retryNodeId/startPrompt) once the shrink animation's callback fires, so it
// never just pops out of existence. A background-tap dismissal, by contrast,
// is immediate (it isn't routed through this component at all). ──
export function LevelActionCard({
  variant, surahName, ayahFrom, ayahTo, isSpecial, onConfirm, S,
}: {
  variant: 'start' | 'repeat';
  surahName: string;
  ayahFrom: number;
  ayahTo: number;
  /** Special (review/merged) levels cover more ground than a normal level —
   *  the time estimate reflects that, not a guess at this specific level's
   *  actual exercise count. */
  isSpecial?: boolean;
  onConfirm: () => void;
  S: Styles['S'];
}) {
  const isStart = variant === 'start';
  // Was a raw time estimate ("4-5 min"/"6-8 min") — replaced per request
  // with plain confirmation of what's about to happen instead of a number.
  // The card's own title already names the surah ("Surah {surahName}"
  // above), so this doesn't repeat it.
  const timeEstimate = isStart
    ? (isSpecial ? 'Starting review now' : 'Starting now')
    : 'Starting again';

  const anim = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 60 }).start();
  }, [anim]);

  // Guarded so a close-then-confirm double-tap during the 140ms shrink can't
  // fire both actions — only the first tap's action ever runs.
  function animateOutThen(action: () => void) {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.timing(anim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => action());
  }

  return (
    <Animated.View
      style={[
        S.actionCard,
        { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }) }] },
      ]}
    >
      <Image
        // Not a Figma-exported asset: "luma_transparent" in the design is
        // an exact match for art already bundled with the app.
        source={MASCOT.lumoTransparent}
        style={S.actionCardMascot}
        resizeMode="contain"
      />
      <View style={S.actionCardTitleBox}>
        <Text style={S.actionCardTitle} numberOfLines={1} adjustsFontSizeToFit>
          Surah {surahName}
        </Text>
      </View>
      <View style={S.actionCardSubtitleBox}>
        <Text style={[S.actionCardSubtitle, styles.shrink]} numberOfLines={1} adjustsFontSizeToFit>
          {formatAyahRange(ayahFrom, ayahTo)}
        </Text>
        <Text style={[S.actionCardSubtitle, S.actionCardTimeEstimate]} numberOfLines={1}>
          {timeEstimate}
        </Text>
      </View>
      <TouchableOpacity
        style={S.actionCardBtn}
        onPress={() => animateOutThen(onConfirm)}
        activeOpacity={0.85}
      >
        <View style={S.actionCardBtnFace}>
          <Text style={S.actionCardBtnText} numberOfLines={1} adjustsFontSizeToFit>
            {isStart ? 'START A NEW LEVEL' : 'REPEAT THE LESSON'}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shrink: { flexShrink: 1 },
});

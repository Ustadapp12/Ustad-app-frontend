import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, TouchableOpacity } from 'react-native';
import { colors } from '../../../../theme/colors';
import { formatAyahRange } from '../mapModel';
import type { Styles } from '../mapStyles';

// ── Level action card — the on-map popout for "start a new level" (fresh
// node tap) and "repeat the lesson" (completed node tap), replacing what used
// to be an instant navigate / a plain text prompt. Fixed width AND height
// (see ACTION_CARD_ASPECT), with title/subtitle/button/close each positioned
// as a percentage box of that fixed frame (see makeStyles) — matches the
// source design's fixed card exactly rather than sizing to content.
//
// Scales in on mount and scales+fades out before either the close button or
// the confirm button actually does anything — the parent only clears the
// state that unmounts this (retryNodeId/startPrompt) once the shrink
// animation's callback fires, so it never just pops out of existence. ──
export function LevelActionCard({
  variant, surahName, ayahFrom, ayahTo, isSpecial, onConfirm, onDismiss, S,
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
  onDismiss: () => void;
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
  const accent = isStart ? colors.levelCardOffWhite : colors.levelRepeatAccent;

  const anim = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 60 }).start();
  }, []);

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
        S.actionCard, isStart ? S.actionCardStart : S.actionCardRepeat,
        { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }) }] },
      ]}
    >
      <TouchableOpacity
        style={S.actionCardClose}
        onPress={() => animateOutThen(onDismiss)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={[S.actionCardCloseText, { color: accent }]}>✕</Text>
      </TouchableOpacity>
      <View style={S.actionCardTitleBox}>
        <Text style={[S.actionCardTitle, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit>
          Surah {surahName}
        </Text>
      </View>
      <View style={S.actionCardSubtitleBox}>
        <Text style={[S.actionCardSubtitle, { color: accent, flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit>
          {formatAyahRange(ayahFrom, ayahTo)}
        </Text>
        <Text style={[S.actionCardSubtitle, S.actionCardTimeEstimate, { color: accent }]} numberOfLines={1}>
          {timeEstimate}
        </Text>
      </View>
      <TouchableOpacity
        style={[S.actionCardBtn, { backgroundColor: isStart ? colors.levelCardOffWhite : colors.levelRepeatAccent }]}
        onPress={() => animateOutThen(onConfirm)}
        activeOpacity={0.85}
      >
        <Text style={[S.actionCardBtnText, { color: isStart ? colors.levelStartAccentText : colors.white }]}>
          {isStart ? 'START A NEW LEVEL' : 'REPEAT THE LESSON'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useCyclingMessage } from '../../hooks/useCyclingMessage';
import { useScreenVisible } from '../../hooks/useScreenVisible';

interface Props {
  messages: readonly string[];
  intervalMs: number;
  /** Keep cycling instead of holding on the last message. */
  loop?: boolean;
}

// The loading screen's status line: steps through `messages` (shared
// useCyclingMessage hook) and fades each new one in. Only ticks while the
// screen is visible.
export default function CyclingStatus({ messages, intervalMs, loop = false }: Props) {
  const visible = useScreenVisible();
  const message = useCyclingMessage(visible, messages, intervalMs, loop);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [message, fade]);

  return <Animated.Text style={[styles.status, { opacity: fade }]}>{message}</Animated.Text>;
}

const styles = StyleSheet.create({
  status: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.3,
    marginTop: 10,
    textAlign: 'center',
  },
});

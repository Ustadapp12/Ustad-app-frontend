import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { colors } from '../theme/colors';

const DEFAULT_MESSAGES = ['Loading…', 'Working on it…', 'Almost there…'];

interface Props {
  messages?: string[];
  /** Milliseconds between message changes. */
  intervalMs?: number;
  style?: StyleProp<TextStyle>;
}

// Rotates through a few short reassuring phrases so a wait never reads as a
// bare, silent spinner. Backend endpoints here are known to be slow
// sometimes, so this favors being present on any load that could plausibly
// run past a couple of seconds.
export default function LoadingStatusText({
  messages = DEFAULT_MESSAGES,
  intervalMs = 2000,
  style,
}: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    if (messages.length < 2) return;
    const id = setInterval(() => {
      setIndex(i => (i + 1) % messages.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [messages, intervalMs]);

  return <Text style={[styles.text, style]}>{messages[index] ?? messages[0]}</Text>;
}

const styles = StyleSheet.create({
  text: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.mutedText, textAlign: 'center' },
});

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface Props {
  children: string;
}

export function SpeechBubble({ children }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.bubble}>
        <AppText style={styles.text}>{children}</AppText>
      </View>
      <View style={styles.tail} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  bubble: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.grey,
    borderRadius: 16,
    padding: spacing.lg,
    maxWidth: '88%',
  },
  text: {
    textAlign: 'center',
    color: colors.charcoal,
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.grey,
    marginTop: -1,
  },
});

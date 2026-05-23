import React from 'react';
import {
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { AppText } from './AppText';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface Props {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'secondaryOnDark' | 'disabled';
  style?: ViewStyle;
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  style,
}: Props) {
  const isDisabled = disabled || loading || variant === 'disabled';
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'secondaryOnDark' && styles.secondaryOnDark,
        variant === 'disabled' && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <AppText
          variant="button"
          style={
            variant === 'secondary'
              ? styles.secondaryText
              : variant === 'secondaryOnDark'
                ? styles.secondaryOnDarkText
                : variant === 'disabled'
                  ? styles.disabledText
                  : undefined
          }>
          {title}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: spacing.buttonHeight,
    borderRadius: spacing.buttonRadius,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.buttonSecondaryBg,
  },
  secondaryOnDark: {
    backgroundColor: `${colors.yellow}22`,
    borderWidth: 2,
    borderColor: `${colors.yellow}50`,
  },
  disabled: {
    backgroundColor: colors.buttonSecondaryBg,
  },
  pressed: {
    opacity: 0.9,
  },
  secondaryText: {
    color: colors.dark,
  },
  secondaryOnDarkText: {
    color: colors.yellow,
  },
  disabledText: {
    color: colors.grey,
  },
});

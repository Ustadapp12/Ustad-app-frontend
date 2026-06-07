import React from 'react';
import { View, StyleSheet, ScrollView, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../ui/Screen';
import { BackButton } from '../ui/BackButton';
import { StepDots } from '../ui/StepDots';
import { IrabBackground } from '../ui/IrabBackground';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

type Props = {
  children: React.ReactNode;
  step?: number;
  totalSteps?: number;
  onBack?: () => void;
  footer?: React.ReactNode;
  dark?: boolean;
  contentStyle?: ViewStyle;
};

export function OnboardingLayout({
  children,
  step,
  totalSteps = 3,
  onBack,
  footer,
  dark = false,
  contentStyle,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Screen style={dark ? styles.dark : undefined} edges={['bottom']}>
      {dark
        ? <IrabBackground />
        : <IrabBackground color={colors.charcoal} opacityBase={0.09} />}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
        {onBack ? <BackButton onPress={onBack} light={dark} /> : <View style={styles.spacer} />}
        <View style={styles.spacer} />
        {step != null && (
          <View style={styles.dotsOverlay} pointerEvents="none">
            <StepDots total={totalSteps} current={step} />
          </View>
        )}
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, contentStyle]}
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  dark: { backgroundColor: colors.dark },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenHorizontal,
    zIndex: 1,
  },
  spacer: { width: 40 },
  dotsOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scroll: { flex: 1, zIndex: 1 },
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
  footer: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.xl,
    zIndex: 1,
  },
});

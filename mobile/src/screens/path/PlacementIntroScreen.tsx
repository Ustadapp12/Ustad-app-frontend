import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { LogoPlaceholder } from '../../components/ui/LogoPlaceholder';
import { copy } from '../../i18n/copy';
import { setOnboardingDone } from '../../utils/storage';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PlacementIntro'>;

export function PlacementIntroScreen({ navigation }: Props) {
  return (
    <Screen>
      <View style={styles.content}>
        <LogoPlaceholder size={120} />
        <AppText variant="h1" style={styles.title}>
          {copy.placement.title}
        </AppText>
        <AppText style={styles.body}>{copy.placement.body}</AppText>
      </View>
      <View style={styles.footer}>
        <PrimaryButton
          title={copy.placement.cta}
          onPress={async () => {
            await setOnboardingDone(true);
            navigation.navigate('OnboardingStreakGoal');
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenHorizontal,
  },
  title: { marginTop: spacing.lg, textAlign: 'center' },
  body: { marginTop: spacing.md, textAlign: 'center' },
  footer: { padding: spacing.screenHorizontal, paddingBottom: spacing.lg },
});

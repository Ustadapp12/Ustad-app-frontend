import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { SpeechBubble } from '../../components/ui/SpeechBubble';
import { Mascot } from '../../components/ui/Mascot';
import { copy } from '../../i18n/copy';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Intro'>;

export function IntroScreen({ navigation }: Props) {
  return (
    <Screen style={styles.screen}>
      <View style={styles.content}>
        <SpeechBubble>{copy.intro.bubble}</SpeechBubble>
        <Mascot size={185} bounce />
      </View>
      <View style={styles.footer}>
        <PrimaryButton
          title={copy.intro.cta}
          onPress={() => navigation.navigate('OnboardingMotivation')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.ash },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenHorizontal,
  },
  footer: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.lg,
  },
});

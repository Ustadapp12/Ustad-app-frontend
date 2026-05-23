import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { ProgressHeader } from '../../components/ui/ProgressHeader';
import { copy } from '../../i18n/copy';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingAccount'>;

export function AccountPromptScreen({ navigation }: Props) {
  return (
    <Screen>
      <ProgressHeader step={3} total={4} onBack={() => navigation.goBack()} />
      <View style={styles.content}>
        <AppText variant="h1">{copy.account.title}</AppText>
      </View>
      <View style={styles.footer}>
        <PrimaryButton
          title={copy.account.emailCta}
          onPress={() => navigation.navigate('AuthRegister')}
        />
        <PrimaryButton
          title={`${copy.account.googleCta} (${copy.account.comingSoon})`}
          variant="disabled"
          disabled
          onPress={() => {}}
          style={styles.gap}
        />
        <PrimaryButton
          title={copy.account.skip}
          variant="secondary"
          onPress={() => navigation.navigate('PathChoose')}
          style={styles.gap}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.screenHorizontal,
    justifyContent: 'center',
  },
  footer: { padding: spacing.screenHorizontal, paddingBottom: spacing.lg },
  gap: { marginTop: spacing.sm },
});

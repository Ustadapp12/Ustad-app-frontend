import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { ProgressHeader } from '../../components/ui/ProgressHeader';
import { copy } from '../../i18n/copy';
import { saveOnboarding } from '../../utils/storage';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingNotifications'>;

export function NotificationsScreen({ navigation }: Props) {
  return (
    <Screen>
      <ProgressHeader step={2} total={4} onBack={() => navigation.goBack()} />
      <View style={styles.content}>
        <AppText variant="h1" style={styles.title}>
          {copy.notifications.title}
        </AppText>
        <View style={styles.mockDialog}>
          <AppText variant="caption">Notifications</AppText>
          <AppText style={styles.mockBody}>
            Allow Ustad App to send you daily reminders?
          </AppText>
          <View style={styles.mockActions}>
            <AppText variant="caption">Not now</AppText>
            <AppText style={{ color: colors.primary, fontWeight: '700' }}>Allow</AppText>
          </View>
        </View>
      </View>
      <View style={styles.footer}>
        <PrimaryButton
          title={copy.notifications.cta}
          onPress={async () => {
            await saveOnboarding({ notificationsEnabled: true });
            navigation.navigate('OnboardingAccount');
          }}
        />
        <PrimaryButton
          title={copy.notifications.skip}
          variant="secondary"
          onPress={async () => {
            await saveOnboarding({ notificationsEnabled: false });
            navigation.navigate('OnboardingAccount');
          }}
          style={{ marginTop: spacing.sm }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: spacing.screenHorizontal },
  title: { marginBottom: spacing.xl },
  mockDialog: {
    backgroundColor: colors.ash,
    borderRadius: 12,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  mockBody: { marginVertical: spacing.md },
  mockActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footer: { padding: spacing.screenHorizontal, paddingBottom: spacing.lg },
});

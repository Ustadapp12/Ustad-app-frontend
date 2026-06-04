import React, { useState } from 'react';
import { View, StyleSheet, Platform, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { EmojiText } from '../../components/ui/EmojiText';
import { IconBadge } from '../../components/ui/IconBadge';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { IrabBackground } from '../../components/ui/IrabBackground';
import { saveOnboarding } from '../../utils/storage';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingNotifications'>;

async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    if (Platform.Version >= 33) {
      try {
        const { PermissionsAndroid } = await import('react-native');
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Daily Hifz Reminders',
            message: 'Allow Ustad to send you daily reminders to keep your streak going.',
            buttonPositive: 'Allow',
            buttonNegative: 'Not now',
          },
        );
        return result === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('[Notifications] Android permission request failed:', err);
        return false;
      }
    }
    return true; // Android < 13 doesn't need runtime permission
  }

  if (Platform.OS === 'ios') {
    try {
      const PushNotificationIOS = (
        await import('@react-native-community/push-notification-ios')
      ).default;
      const auth = await PushNotificationIOS.requestPermissions({
        alert: true,
        badge: true,
        sound: true,
      });
      return auth.alert === true;
    } catch (err) {
      console.warn('[Notifications] iOS permission request failed:', err);
      return false;
    }
  }

  return false;
}

const BENEFITS = [
  { icon: '🔥', text: 'Daily streak reminders to keep you on track' },
  { icon: '⭐', text: 'XP milestone celebrations' },
  { icon: '📖', text: 'Revision alerts when ayahs are due' },
];

export function NotificationsScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);

  const enable = async () => {
    setLoading(true);
    const granted = await requestNotificationPermission();
    await saveOnboarding({ notificationsEnabled: granted });
    setLoading(false);
    navigation.navigate('OnboardingAccount');
  };

  const skip = async () => {
    await saveOnboarding({ notificationsEnabled: false });
    navigation.navigate('OnboardingAccount');
  };

  return (
    <Screen style={styles.screen}>
      <IrabBackground color={colors.charcoal} opacityBase={0.09} />

      <View style={styles.content}>
        {/* Bell illustration */}
        <View style={styles.bellWrap}>
          <View style={styles.bellOuter}>
            <IconBadge emoji="🔔" size={72} style={styles.bellInner} />
          </View>
          {/* Ping dots */}
          {[0, 1, 2].map(i => (
            <View
              key={i}
              style={[
                styles.pingDot,
                {
                  top: 8 + i * 10,
                  right: 8 - i * 6,
                  width: 8 - i * 2,
                  height: 8 - i * 2,
                  opacity: 1 - i * 0.28,
                },
              ]}
            />
          ))}
        </View>

        <AppText variant="h1" style={styles.title}>
          Never miss a session
        </AppText>
        <AppText style={styles.subtitle}>
          Turn on reminders to build a consistent Hifz habit
        </AppText>

        {/* Benefits list */}
        <View style={styles.benefits}>
          {BENEFITS.map(b => (
            <View key={b.text} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <EmojiText size={22}>{b.icon}</EmojiText>
              </View>
              <AppText style={styles.benefitText}>{b.text}</AppText>
            </View>
          ))}
        </View>

        {/* Mock notification preview */}
        <View style={styles.preview}>
          <View style={styles.previewHeader}>
            <AppText style={styles.previewApp}>Ustad · Hifz</AppText>
            <AppText style={styles.previewTime}>now</AppText>
          </View>
          <AppText style={styles.previewTitle}>Time for your daily Hifz! 📖</AppText>
          <AppText style={styles.previewBody}>
            Your streak is waiting — review{' '}
            <AppText variant="arabic" style={styles.previewSurah}>
              سُورَةُ النَّاس
            </AppText>{' '}
            before you forget.
          </AppText>
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          title="Enable Reminders 🔔"
          onPress={enable}
          loading={loading}
        />
        <PrimaryButton
          title="Maybe later"
          variant="secondary"
          onPress={skip}
          style={styles.skipBtn}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.white },

  content: {
    flex: 1,
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.xl,
    alignItems: 'center',
  },

  // Bell
  bellWrap: { position: 'relative', marginBottom: spacing.lg },
  bellOuter: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  bellInner: {
    backgroundColor: `${colors.primary}25`,
  },
  pingDot: {
    position: 'absolute',
    borderRadius: 10,
    backgroundColor: colors.primary,
  },

  title: { textAlign: 'center', marginBottom: spacing.xs },
  subtitle: {
    textAlign: 'center',
    color: colors.charcoal,
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },

  // Benefits
  benefits: {
    width: '100%',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: `${colors.primary}08`,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.primary}18`,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: `${colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  benefitText: { flex: 1, color: colors.dark, fontWeight: '600', fontSize: 13 },

  // Notification preview card
  preview: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: `${colors.grey}25`,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  previewApp: { fontSize: 11, fontWeight: '800', color: colors.charcoal },
  previewTime: { fontSize: 11, color: colors.grey, fontWeight: '600' },
  previewTitle: { fontWeight: '800', fontSize: 13, color: colors.dark, marginBottom: 2 },
  previewBody: { fontSize: 12, color: colors.charcoal, fontWeight: '500', lineHeight: 17 },
  previewSurah: { fontSize: 14, lineHeight: 22, color: colors.charcoal },

  footer: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.xl,
  },
  skipBtn: { marginTop: spacing.sm },
});

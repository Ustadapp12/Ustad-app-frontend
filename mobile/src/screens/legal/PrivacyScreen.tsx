import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { BackButton } from '../../components/ui/BackButton';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Privacy'>;

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: 'We collect information you provide directly: email address, display name, and learning preferences. We also collect usage data such as lesson progress, XP, streaks, and exercise attempts.',
  },
  {
    title: '2. How We Use Your Data',
    body: 'Your data is used exclusively to:\n• Provide and improve the Hifz experience\n• Track your memorisation progress\n• Send you reminders (if enabled)\n• Detect and fix bugs via error reporting (Sentry)\n\nWe do not sell your personal data to third parties.',
  },
  {
    title: '3. Audio Recordings',
    body: 'If you use the listen-and-repeat feature, recordings are processed locally on-device only to measure duration. No audio is stored on our servers.',
  },
  {
    title: '4. Data Storage',
    body: 'Your account data is stored securely in our cloud database. Tokens are stored in your device\'s secure keychain. We use industry-standard encryption for data in transit (TLS) and at rest.',
  },
  {
    title: '5. Third-Party Services',
    body: 'We use Sentry for crash reporting (only error metadata, no personal data). Audio files are hosted on Supabase Storage. No advertising SDKs are included.',
  },
  {
    title: '6. Data Retention',
    body: 'Your account data is retained as long as your account is active. You may request deletion at any time by emailing support@quickgentech.com. Deleted accounts are purged within 30 days.',
  },
  {
    title: '7. Children\'s Privacy',
    body: 'Ustad is suitable for all ages. We do not knowingly collect personal information from children under 13 without parental consent. Parents may contact us to review or delete their child\'s data.',
  },
  {
    title: '8. Your Rights',
    body: 'You have the right to access, correct, or delete your personal data at any time. Contact us at support@quickgentech.com to exercise these rights.',
  },
  {
    title: '9. Changes to This Policy',
    body: 'We may update this privacy policy periodically. We will notify you of significant changes through the app. Continued use constitutes acceptance.',
  },
  {
    title: '10. Contact',
    body: 'Privacy questions? Contact our team at support@quickgentech.com.',
  },
];

export function PrivacyScreen({ navigation }: Props) {
  return (
    <Screen style={styles.screen}>
      <View style={styles.topBar}>
        <BackButton onPress={() => navigation.goBack()} />
        <AppText style={styles.heading}>Privacy Policy</AppText>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <AppText style={styles.updated}>Last updated: June 2025</AppText>
        <AppText style={styles.intro}>
          We take your privacy seriously. This policy explains how Ustad collects, uses, and protects your information.
        </AppText>

        {SECTIONS.map(s => (
          <View key={s.title} style={styles.section}>
            <AppText style={styles.sectionTitle}>{s.title}</AppText>
            <AppText style={styles.sectionBody}>{s.body}</AppText>
          </View>
        ))}

        <View style={styles.bottomPad} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.white },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.grey}20`,
  },
  heading: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '900',
    fontSize: 16,
    color: colors.dark,
  },
  spacer: { width: 40 },
  scroll: { paddingHorizontal: spacing.screenHorizontal, paddingTop: spacing.lg },
  updated: { color: colors.grey, fontSize: 12, fontWeight: '600', marginBottom: spacing.sm },
  intro: {
    color: colors.charcoal,
    fontSize: 13,
    lineHeight: 21,
    fontWeight: '500',
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: `${colors.primary}08`,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  section: { marginBottom: spacing.lg },
  sectionTitle: { fontWeight: '900', fontSize: 14, color: colors.dark, marginBottom: spacing.xs },
  sectionBody: { color: colors.charcoal, fontSize: 13, lineHeight: 21, fontWeight: '500' },
  bottomPad: { height: 48 },
});

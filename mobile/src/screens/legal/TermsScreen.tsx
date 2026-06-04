import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { BackButton } from '../../components/ui/BackButton';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Terms'>;

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By accessing or using Ustad Hifz, you agree to be bound by these Terms of Service. If you do not agree, please do not use the app.',
  },
  {
    title: '2. Use of the App',
    body: 'Ustad is a Quran memorisation tool intended for personal, non-commercial use. You agree to use the app only for lawful purposes and in a manner that does not infringe the rights of others.',
  },
  {
    title: '3. Account Responsibility',
    body: 'You are responsible for maintaining the confidentiality of your account credentials. All activity under your account is your responsibility. Notify us immediately of any unauthorised use.',
  },
  {
    title: '4. User Content',
    body: 'Any data you submit (progress, recordings) remains yours. By using the app you grant us a limited licence to process this data solely to provide the service.',
  },
  {
    title: '5. Intellectual Property',
    body: 'All app content, design, and code are the intellectual property of Ustad. The Quran text is sourced from public-domain Islamic datasets. You may not copy, modify, or distribute app content without written permission.',
  },
  {
    title: '6. Disclaimer of Warranties',
    body: 'The app is provided "as is" without warranties of any kind. We do not guarantee uninterrupted service or that content is error-free. Always verify Quran recitation with a qualified teacher.',
  },
  {
    title: '7. Limitation of Liability',
    body: 'To the maximum extent permitted by law, Ustad shall not be liable for any indirect, incidental, or consequential damages arising from your use of the app.',
  },
  {
    title: '8. Changes to Terms',
    body: 'We may update these terms at any time. Continued use after changes constitutes acceptance. Material changes will be notified via the app.',
  },
  {
    title: '9. Contact',
    body: 'For questions about these terms, contact us at support@quickgentech.com.',
  },
];

export function TermsScreen({ navigation }: Props) {
  return (
    <Screen style={styles.screen}>
      <View style={styles.topBar}>
        <BackButton onPress={() => navigation.goBack()} />
        <AppText style={styles.heading}>Terms of Service</AppText>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <AppText style={styles.updated}>Last updated: June 2025</AppText>

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
  updated: { color: colors.grey, fontSize: 12, fontWeight: '600', marginBottom: spacing.lg },
  section: { marginBottom: spacing.lg },
  sectionTitle: { fontWeight: '900', fontSize: 14, color: colors.dark, marginBottom: spacing.xs },
  sectionBody: { color: colors.charcoal, fontSize: 13, lineHeight: 21, fontWeight: '500' },
  bottomPad: { height: 48 },
});

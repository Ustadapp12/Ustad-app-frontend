import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { Logo } from '../../components/ui/Logo';
import { Mascot } from '../../components/ui/Mascot';
import { FeatureChip } from '../../components/ui/FeatureChip';
import { copy } from '../../i18n/copy';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Mascot size={165} bounce />
          <Logo large light />
          <AppText style={styles.tagline}>{copy.tagline}</AppText>
          <View style={styles.chips}>
            {copy.welcome.features.map(f => (
              <FeatureChip key={f.label} icon={f.icon} label={f.label} />
            ))}
          </View>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton
          title={copy.welcome.getStarted}
          onPress={() => navigation.navigate('Intro')}
          style={styles.primaryBtn}
        />
        <PrimaryButton
          title={copy.welcome.hasAccount}
          variant="secondaryOnDark"
          onPress={() => navigation.navigate('AuthLogin')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  tagline: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: `${colors.grey}cc`,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  primaryBtn: {
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
});

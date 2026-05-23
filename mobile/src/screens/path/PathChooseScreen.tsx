import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { saveOnboarding, setOnboardingDone } from '../../utils/storage';
import { copy } from '../../i18n/copy';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PathChoose'>;

export function PathChooseScreen({ navigation }: Props) {
  const pick = async (choice: 'fresh' | 'placement') => {
    await saveOnboarding({ pathChoice: choice });
    if (choice === 'placement') {
      navigation.navigate('PlacementIntro');
    } else {
      await setOnboardingDone(true);
      navigation.navigate('OnboardingStreakGoal');
    }
  };

  return (
    <Screen>
      <AppText variant="h1" style={styles.title}>
        {copy.path.title}
      </AppText>
      <View style={styles.cards}>
        <Pressable style={styles.card} onPress={() => pick('fresh')}>
          <View style={styles.icon} />
          <AppText variant="h2">{copy.path.startFresh.title}</AppText>
          <AppText>{copy.path.startFresh.subtitle}</AppText>
        </Pressable>
        <Pressable style={styles.card} onPress={() => pick('placement')}>
          <View style={[styles.icon, styles.iconAlt]} />
          <AppText variant="h2">{copy.path.checkLevel.title}</AppText>
          <AppText>{copy.path.checkLevel.subtitle}</AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { padding: spacing.screenHorizontal, marginTop: spacing.lg },
  cards: { flex: 1, padding: spacing.screenHorizontal, gap: spacing.md },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.buttonSecondaryBg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  icon: {
    width: 56,
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  iconAlt: { backgroundColor: colors.yellow },
});

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { useAuthStore } from '../../store/authStore';
import { spacing } from '../../theme/spacing';
import { API_BASE } from '../../config';
import type { RootStackParamList } from '../../navigation/types';

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, learning, logout } = useAuthStore();

  return (
    <Screen>
      <View style={styles.content}>
        <AppText variant="h1">Profile</AppText>
        {user ? (
          <AppText style={styles.line}>Signed in</AppText>
        ) : (
          <AppText style={styles.line}>Guest / not signed in</AppText>
        )}
        {learning ? (
          <>
            <AppText>XP: {learning.xp_total}</AppText>
            <AppText>Longest streak: {learning.longest_streak}</AppText>
          </>
        ) : null}
        <AppText variant="caption" style={styles.api}>
          API: {API_BASE}
        </AppText>
      </View>
      <View style={styles.footer}>
        {user ? (
          <PrimaryButton
            title="Log out"
            variant="secondary"
            onPress={async () => {
              await logout();
              navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
            }}
          />
        ) : (
          <PrimaryButton
            title="Log in"
            onPress={() => navigation.navigate('AuthLogin')}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: spacing.screenHorizontal, paddingTop: spacing.lg },
  line: { marginTop: spacing.md },
  api: { marginTop: spacing.xl },
  footer: { padding: spacing.screenHorizontal, paddingBottom: spacing.lg },
});

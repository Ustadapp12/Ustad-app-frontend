import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { characterSrcFor } from '../../utils/avatar';
import { safeBottomInset } from '../../utils/responsive';
import type { RootNavProp, RootStackParamList } from '../../navigation/types';
import { styles } from './OnboardWelcomeScreen.styles';

interface Props {
  navigation: RootNavProp;
  route: RouteProp<RootStackParamList, 'OnboardWelcome'>;
}

export default function OnboardWelcomeScreen({ navigation, route }: Props) {
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  const name = useAuthStore(s => s.user?.name) ?? 'there';
  const userId = useAuthStore(s => s.user?.id);
  const avatarVariant = useAuthStore(s => s.profile?.avatar_variant);
  const { gender } = route.params;
  const avatarSrc = characterSrcFor(userId ?? '', gender, avatarVariant);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Image source={avatarSrc} style={styles.avatar} resizeMode="contain" />
        <Text style={styles.heading}>Welcome, {name}!</Text>
        <Text style={styles.sub}>This is you from now on, you'll see yourself in your lessons and profile.</Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('OnboardGoal')}>
          <Text style={styles.btnText}>Continue →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

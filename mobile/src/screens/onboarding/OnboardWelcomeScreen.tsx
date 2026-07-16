import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import type { RootNavProp, RootStackParamList } from '../../navigation/types';

interface Props {
  navigation: RootNavProp;
  route: RouteProp<RootStackParamList, 'OnboardWelcome'>;
}

const AYESHA_SRC = require('../../../assets/characters/ayesha.png');
const HAMZA_SRC = require('../../../assets/characters/hamza.png');

export default function OnboardWelcomeScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const name = useAuthStore(s => s.user?.name) ?? 'there';
  const { gender } = route.params;
  const avatarSrc = gender === 'female' ? AYESHA_SRC : HAMZA_SRC;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Image source={avatarSrc} style={styles.avatar} resizeMode="contain" />
        <Text style={styles.heading}>Welcome, {name}!</Text>
        <Text style={styles.sub}>This is you from now on — you'll see yourself in your lessons and profile.</Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('OnboardGoal')}>
          <Text style={styles.btnText}>Continue →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightBg },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  avatar: { width: 260, height: 260, marginBottom: 20 },
  heading: { fontFamily: 'Nunito_700Bold', fontSize: 28, color: colors.darkText, textAlign: 'center', marginBottom: 10 },
  sub: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: colors.mutedText, textAlign: 'center', lineHeight: 20 },
  footer: { paddingHorizontal: 22, paddingTop: 12 },
  btn: {
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  btnText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: colors.white },
});

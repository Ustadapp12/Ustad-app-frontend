import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText } from '../../components/ui/AppText';
import { Logo } from '../../components/ui/Logo';
import { Mascot } from '../../components/ui/Mascot';
import { copy } from '../../i18n/copy';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export function SplashScreen({ navigation }: Props) {
  const hydrate = useAuthStore(s => s.hydrate);
  const [phase, setPhase] = useState(0);
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 10 }),
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
    const t1 = setTimeout(() => setPhase(1), 600);
    const t2 = setTimeout(() => {
      setPhase(2);
      Animated.timing(progress, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: false,
      }).start();
    }, 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [scale, opacity, progress]);

  useEffect(() => {
    const boot = async () => {
      await hydrate();
      await new Promise<void>(r => setTimeout(r, 3000));
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        navigation.replace('MainTabs');
      } else {
        navigation.replace('Welcome');
      }
    };
    boot();
  }, [hydrate, navigation]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.center,
          { transform: [{ scale }], opacity },
        ]}>
        <Mascot size={155} bounce />
        {phase >= 1 ? (
          <View style={styles.logoWrap}>
            <Logo large light />
          </View>
        ) : null}
      </Animated.View>
      {phase >= 2 ? (
        <View style={styles.footer}>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, { width: progressWidth }]} />
          </View>
          <AppText style={styles.loading}>{copy.splash.loading}</AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: { alignItems: 'center', gap: 28 },
  logoWrap: { marginTop: 8 },
  footer: {
    position: 'absolute',
    bottom: 56,
    width: 160,
    alignItems: 'center',
    gap: 8,
  },
  track: {
    height: 4,
    width: '100%',
    borderRadius: 2,
    backgroundColor: `${colors.yellow}28`,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.yellow,
    borderRadius: 2,
  },
  loading: {
    fontSize: 10,
    fontWeight: '700',
    color: `${colors.yellow}99`,
  },
});

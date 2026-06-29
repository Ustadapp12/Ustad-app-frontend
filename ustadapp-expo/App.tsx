import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreenNative from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import RootNavigator from './src/navigation/RootNavigator';

SplashScreenNative.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular:          require('./assets/fonts/Nunito-Regular.ttf'),
    Nunito_700Bold:              require('./assets/fonts/Nunito-Bold.ttf'),
    NotoNaskhArabic_400Regular: require('./assets/fonts/NotoNaskhArabic.ttf'),
    AmiriQuran:                  require('./assets/fonts/AmiriQuran.ttf'),
    AmiriRegular:                require('./assets/fonts/Amiri-Regular.ttf'),
    NotoNastaliqUrdu:            require('./assets/fonts/NotoNastaliqUrdu.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreenNative.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0D1B2A', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#C4A84C" size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

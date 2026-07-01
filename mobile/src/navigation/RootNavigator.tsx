import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import SplashScreen from '../screens/startup/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import OnboardGoalScreen from '../screens/onboarding/OnboardGoalScreen';
import OnboardPathScreen from '../screens/onboarding/OnboardPathScreen';
import OnboardScriptScreen from '../screens/onboarding/OnboardScriptScreen';
import MainTabs from './MainTabs';
import StreakScreen from '../screens/gamification/StreakScreen';
import LessonStartScreen from '../screens/lesson/LessonStartScreen';
import LessonSessionScreen from '../screens/lesson/LessonSessionScreen';
import LessonSummaryScreen from '../screens/lesson/LessonSummaryScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const hydrate = useAuthStore(s => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false, animation: 'fade' }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="SignUp" component={SignUpScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="OnboardGoal" component={OnboardGoalScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="OnboardPath" component={OnboardPathScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="OnboardScript" component={OnboardScriptScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ animation: 'fade' }} />
        <Stack.Screen
          name="Streak"
          component={StreakScreen}
          options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
        />
        <Stack.Screen name="LessonStart"    component={LessonStartScreen}   options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="LessonSession"  component={LessonSessionScreen}  options={{ animation: 'slide_from_right', gestureEnabled: false }} />
        <Stack.Screen name="LessonComplete" component={LessonSummaryScreen} options={{ animation: 'fade' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}


import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/home/HomeScreen';
import { JourneyScreen } from '../screens/journey/JourneyScreen';
import { RevisionScreen } from '../screens/revision/RevisionScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { copy } from '../i18n/copy';
import { colors } from '../theme/colors';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.yellow,
        tabBarInactiveTintColor: colors.grey,
        tabBarStyle: {
          backgroundColor: colors.dark,
          borderTopColor: 'rgba(255,255,255,0.1)',
        },
      }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: copy.tabs.home }} />
      <Tab.Screen name="Journey" component={JourneyScreen} options={{ title: copy.tabs.journey }} />
      <Tab.Screen name="Revision" component={RevisionScreen} options={{ title: copy.tabs.revision }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: copy.tabs.profile }} />
    </Tab.Navigator>
  );
}

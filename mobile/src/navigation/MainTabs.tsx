import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/home/HomeScreen';
import { StatsScreen } from '../screens/profile/StatsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { AppText } from '../components/ui/AppText';
import { colors } from '../theme/colors';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, string> = {
  Home: '⌂',
  Stats: '↗',
  Profile: '◯',
};

function TabIcon({ name, color }: { name: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: 24 }}>
      <AppText style={{ color, fontSize: 20, lineHeight: 24 }}>
        {TAB_ICONS[name] ?? '·'}
      </AppText>
    </View>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.yellow,
        tabBarInactiveTintColor: colors.grey,
        tabBarStyle: {
          backgroundColor: 'rgba(8,14,22,0.97)',
          borderTopColor: `${colors.grey}18`,
          height: 64,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon name="Home" color={color} />,
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          title: 'Stats',
          tabBarIcon: ({ color }) => <TabIcon name="Stats" color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon name="Profile" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { View, StyleSheet } from 'react-native';
import Map2Screen from '../screens/home/map2/Map2Screen';
import DailyQuestScreen from '../screens/quests/DailyQuestScreen';
import PrayScreen from '../screens/pray/PrayScreen';
import LeaderboardScreen from '../screens/leaderboard/LeaderboardScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import AuthRequiredModal from '../components/AuthRequiredModal';
import { useAuthStore } from '../store/authStore';
import { useTourStore } from '../store/tourStore';
import TourOverlay from '../components/tour/TourOverlay';
import Map2TabBar from './Map2TabBar';
import { useAskNotificationsOnStart } from '../hooks/useAskNotificationsOnStart';
import type { RootNavProp, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();


export default function MainTabs() {
  useAskNotificationsOnStart();
  // Defense-in-depth: nothing should be able to navigate an unauthenticated
  // user onto the map, but if a future navigation bug ever does, catch it
  // here instead of silently rendering the map for a guest. This only
  // redirects — it deliberately does NOT early-return null, because doing so
  // unmounts the whole Tab.Navigator (including whichever screen is on
  // screen, e.g. Profile) the instant `user` goes null, which raced with and
  // broke the normal logout flow's own explicit navigation call.
  const user = useAuthStore(s => s.user);
  const navigation = useNavigation<RootNavProp>();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const setOfferVisible = useTourStore(s => s.setOfferVisible);

  useEffect(() => {
    if (!user) setShowAuthModal(true);
  }, [user]);

  function handleContinue() {
    setShowAuthModal(false);
    navigation.replace('SignUp');
  }

  return (
    <View style={styles.root}>
    <Tab.Navigator
      // Hardware back from any non-Map tab always lands on Map first,
      // regardless of which tabs were visited in between — the default
      // 'history' behavior would instead walk back through visit order,
      // which reads as random from the user's perspective.
      backBehavior="initialRoute"
      // Figma bottom bar (home, quests, star, leaderboard, profile), the
      // selected icon in green. See Map2TabBar for why Home draws its own.
      tabBar={(props) => <Map2TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Map" component={Map2Screen} />
      <Tab.Screen name="DailyQuest" component={DailyQuestScreen} />
      <Tab.Screen name="Building" component={PrayScreen} />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
    <AuthRequiredModal visible={showAuthModal} onContinue={handleContinue} />
    {/* The map half of the tour is hosted here, not in the map screen, for one
        structural reason: it has to be able to dim and cut a hole in the tab
        bar, and the tab bar is the navigator's, rendered as the map's
        sibling rather than its child. */}
    <TourOverlay
      screen="map"
      onFinish={() => { /* already on the map — nothing to unwind */ }}
      onEnterLesson={() => navigation.navigate('GuidedTour')}
      onExitToOffer={() => setOfferVisible(true)}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

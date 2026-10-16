import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import Map2Screen from '../screens/home/map2/Map2Screen';
import DailyQuestScreen from '../screens/quests/DailyQuestScreen';
import BuildingTabScreen from '../screens/comingSoon/BuildingTabScreen';
import LeaderboardScreen from '../screens/leaderboard/LeaderboardScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import AuthRequiredModal from '../components/AuthRequiredModal';
import { useAuthStore } from '../store/authStore';
import { useTourStore } from '../store/tourStore';
import TourOverlay from '../components/tour/TourOverlay';
import Map2TabBar from './Map2TabBar';
import type { RootNavProp, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

// Height of the bottom bar's content, for placing the dev-only V2 button above it.
const TAB_BAR_CONTENT_H = 71;

export default function MainTabs() {
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
      <Tab.Screen name="Building" component={BuildingTabScreen} />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
    <AuthRequiredModal visible={showAuthModal} onContinue={handleContinue} />
    {/* Dev-only door into the WIP MapV2 clone (see MapScreenV2.tsx's header
        comment) — __DEV__ so it never renders in a release build, same
        pattern already used for notifications elsewhere in this codebase. */}
    {__DEV__ && (
      <TouchableOpacity
        style={styles.devMapV2Button}
        onPress={() => navigation.navigate('MapV2')}
      >
        <Text style={styles.devMapV2Text}>V2</Text>
      </TouchableOpacity>
    )}
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
  devMapV2Button: {
    position: 'absolute',
    right: 12,
    bottom: TAB_BAR_CONTENT_H + 96,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000000cc',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  devMapV2Text: {
    color: '#fff',
    fontFamily: 'Nunito-Bold',
    fontSize: 12,
  },
});

import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { Text, View, Image, StyleSheet } from 'react-native';
import MapScreen from '../screens/home/MapScreen';
import DailyQuestScreen from '../screens/quests/DailyQuestScreen';
import LeaderboardScreen from '../screens/leaderboard/LeaderboardScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import AuthRequiredModal from '../components/AuthRequiredModal';
import { colors } from '../theme/colors';
import { useAuthStore } from '../store/authStore';
import { useTourStore } from '../store/tourStore';
import { TOUR_STEPS } from '../components/tour/tourSteps';
import type { TourTargetKey } from '../components/tour/tourSteps';
import { useTourTarget } from '../components/tour/useTourTarget';
import TourOverlay from '../components/tour/TourOverlay';
import { TOUR_GLOW } from '../screens/lesson/LessonSessionScreen';
import type { RootNavProp, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

// Tour-only: true exactly while the tour's current step is spotlighting this
// specific tab. The tab glows itself (a real border+shadow on the real icon
// wrapper) instead of a ring drawn on top of it elsewhere — see TOUR_GLOW's
// own comment for why. `iconWrap` already carries its own borderRadius, and
// TOUR_GLOW sets none, so that radius passes through untouched.
function useTourGlow(key?: TourTargetKey) {
  return useTourStore(s => !!key && s.active && TOUR_STEPS[s.stepIndex]?.target === key);
}

/**
 * `iconWrap` (below) is the real thing a tab step spotlights: it's exactly
 * what TOUR_GLOW lights up, a small chip sized to its own icon, not the
 * whole tab column. It used to be measured via the tab's `tabBarButton` —
 * react-navigation's own PlatformPressable, which is the *entire* tappable
 * column (full tab-bar height, ~1/4 screen width, plus the label underneath)
 * — so the punched hole came out far bigger than the chip that actually
 * glows: correctly positioned, but shaped like the invisible touch target
 * rather than the visible button. Measuring iconWrap itself here makes the
 * hole and the glow agree, because they're now the same element.
 *
 * radius: 10 is iconWrap's own borderRadius (below) — not a guess.
 */
function TabIcon({ emoji, focused, glowKey }: { emoji: string; focused: boolean; glowKey: TourTargetKey }) {
  const glow = useTourGlow(glowKey);
  const target = useTourTarget(glowKey, 10);
  return (
    <View {...target} collapsable={false} style={[styles.iconWrap, focused && styles.iconFocused, glow && TOUR_GLOW]}>
      <Text style={styles.emoji}>{emoji}</Text>
    </View>
  );
}

// Profile uses Lumo (the app's own mascot character) instead of a generic
// person-outline emoji, which some fonts render as a plain unclear glyph.
function ProfileTabIcon({ focused, glowKey }: { focused: boolean; glowKey: TourTargetKey }) {
  const glow = useTourGlow(glowKey);
  const target = useTourTarget(glowKey, 10);
  return (
    <View {...target} collapsable={false} style={[styles.iconWrap, focused && styles.iconFocused, glow && TOUR_GLOW]}>
      <Image
        source={require('../../assets/images/lumo_transparent.png')}
        style={styles.profileIcon}
        resizeMode="contain"
      />
    </View>
  );
}

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
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🗺️" focused={focused} glowKey="tabHome" />,
        }}
      />
      <Tab.Screen
        name="DailyQuest"
        component={DailyQuestScreen}
        options={{
          tabBarLabel: 'Quests',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⭐" focused={focused} glowKey="tabQuests" />,
        }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          tabBarLabel: 'Board',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏆" focused={focused} glowKey="tabBoard" />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => <ProfileTabIcon focused={focused} glowKey="tabProfile" />,
        }}
      />
    </Tab.Navigator>
    <AuthRequiredModal visible={showAuthModal} onContinue={handleContinue} />
    {/* The map half of the tour is hosted here, not in MapScreen, for one
        structural reason: it has to be able to dim and cut a hole in the tab
        bar, and the tab bar is the navigator's, rendered as MapScreen's
        sibling rather than its child. From inside MapScreen the only way to
        paint over it was a Modal, whose separate native window is what forced
        the hand-tuned coordinate correction that made every cutout sit off
        its target. Rendered here it is an ordinary sibling of Tab.Navigator,
        in the same window as everything it measures. */}
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
  tabBar: {
    backgroundColor: colors.white,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 80,
    paddingBottom: 16,
    paddingTop: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  iconWrap: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  iconFocused: {
    backgroundColor: colors.primaryBg,
  },
  emoji: {
    fontSize: 18,
  },
  profileIcon: {
    width: 22,
    height: 22,
  },
  label: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    marginTop: 2,
  },
});


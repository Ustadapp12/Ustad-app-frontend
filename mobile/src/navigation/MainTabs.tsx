import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { useNavigation } from '@react-navigation/native';
import { Text, View, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { safeBottomInset } from '../utils/responsive';
import type { RootNavProp, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

// Tab bar geometry, before any system inset is added on top (see tabBarStyle
// below). TAB_BAR_CONTENT_H is the full bar height on a device that reports no
// bottom inset at all; the visible icon+label band is that minus the two
// paddings, and stays constant across devices.
const TAB_BAR_CONTENT_H = 80;
const TAB_BAR_PAD_BOTTOM = 16;
// Fallback bottom padding used ONLY when there is genuinely no system inset
// to clear (gesture nav, or 3-button nav successfully hidden). Zero, not a
// small "symmetric" compromise -- an 8dp compromise (mirroring tabBar's own
// paddingTop:8) was tried first and was STILL visibly wrong (2026-08-29,
// user, after seeing it live: still padding "for nothing" below the tab
// bar). There is nothing to clear when insets.bottom is 0, so there is
// nothing to pad for; any nonzero value here is the same category of bug
// this was meant to fix, just smaller. State-driven off the same real
// insets.bottom every other bottom-clearance calculation in the app already
// uses (see safeBottomInset) -- not a per-device special case.
const TAB_BAR_PAD_BOTTOM_NO_INSET = 0;

// Tour-only: true exactly while the tour's current step is spotlighting this
// specific tab. The tab glows itself (a real border+shadow on the real icon
// wrapper) instead of a ring drawn on top of it elsewhere — see TOUR_GLOW's
// own comment for why. `iconWrap` already carries its own borderRadius, and
// TOUR_GLOW sets none, so that radius passes through untouched.
function useTourGlow(key?: TourTargetKey) {
  return useTourStore(s => !!key && s.active && TOUR_STEPS[s.stepIndex]?.target === key);
}

/**
 * `iconWrap` (below) is the real thing a tab step spotlights: a small chip
 * sized to its own icon, not the whole tab column. It used to be measured
 * via the tab's `tabBarButton` — react-navigation's own PlatformPressable,
 * the *entire* tappable column (full tab-bar height, ~1/4 screen width,
 * plus the label underneath) — so the punched hole came out far bigger than
 * the chip that actually glows: correctly positioned, but shaped like the
 * invisible touch target rather than the visible button. Measuring iconWrap
 * itself here made the hole and the glow agree, because they were the same
 * element.
 *
 * TAB_ICON_LABEL_EXTRA_H (below) reopens that gap slightly, deliberately:
 * the cutout now extends past iconWrap's own bottom edge to also cover the
 * label text underneath (2026-08-28, user: the cutout wasn't "counting the
 * written 'home quests etc'"). The glow itself is untouched and still lights
 * up only iconWrap — this only widens the SPOTLIGHT HOLE, not the visible
 * highlight effect, so the label is legible during the tour without a
 * second glow effect nobody asked for.
 *
 * radius: 10 is iconWrap's own borderRadius (below) — not a guess.
 */
// The label (styles.label below) isn't part of iconWrap at all — it's
// rendered separately by react-navigation's own tab bar internals — so
// there is nothing to directly measure for it. marginTop:2 + an 11px
// Nunito_700Bold line's real rendered height (~14px) is about 16px; 20px
// leaves a couple of px of genuine margin rather than clipping the label's
// own descenders right at the cutout's edge.
const TAB_ICON_LABEL_EXTRA_H = 20;

function TabIcon({ emoji, focused, glowKey }: { emoji: string; focused: boolean; glowKey: TourTargetKey }) {
  const glow = useTourGlow(glowKey);
  const target = useTourTarget(glowKey, 10, TAB_ICON_LABEL_EXTRA_H);
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
  const target = useTourTarget(glowKey, 10, TAB_ICON_LABEL_EXTRA_H);
  return (
    <View {...target} collapsable={false} style={[styles.iconWrap, focused && styles.iconFocused, glow && TOUR_GLOW]}>
      <Image
        source={require('../../assets/images/lumo_kufi.png')}
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
  const rawInsets = useSafeAreaInsets();
  // See safeBottomInset's own comment — some devices misreport
  // insets.bottom as 0, which without this floor put the tab bar flush
  // against (and behind) the system nav bar instead of above it.
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
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
        // The bar grows by exactly the system's bottom inset, and pads its
        // own content by the same amount — so the icon/label band stays the
        // same TAB_BAR_CONTENT_H tall on every device and simply sits above
        // the Android navigation bar instead of underneath it. Adding it to
        // both height and paddingBottom is what keeps the proportions fixed;
        // adding it to only one would stretch or squash the band.
        //
        // This has to be spelled out here rather than left to
        // react-navigation's own inset handling: getTabBarHeight() short
        // circuits on any numeric `height` in tabBarStyle, and tabBarStyle is
        // merged LAST over the inset-aware defaults, so the previous flat
        // `height: 80` silently overrode both.
        tabBarStyle: [styles.tabBar, {
          // When there's a real inset to clear, keep the full base padding
          // (comfortable margin above genuine system chrome). When there
          // isn't, drop to the smaller symmetric fallback instead of
          // reserving the full 16dp for nothing — and shrink the total
          // height by exactly the same amount, so the icon/label content
          // doesn't end up sitting in a mysteriously taller box with empty
          // space below it; the whole bar gets more compact, not just its
          // padding.
          height: TAB_BAR_CONTENT_H - (insets.bottom > 0 ? 0 : TAB_BAR_PAD_BOTTOM - TAB_BAR_PAD_BOTTOM_NO_INSET) + insets.bottom,
          paddingBottom: (insets.bottom > 0 ? TAB_BAR_PAD_BOTTOM : TAB_BAR_PAD_BOTTOM_NO_INSET) + insets.bottom,
        }],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarLabelStyle: styles.label,
        // Default android_ripple has no radius, so it grows to fill the
        // whole tappable column (full tab-bar height, ~1/4 screen width —
        // see TabIcon's own comment above) instead of just the small
        // icon+label area a tap actually feels like it should light up.
        tabBarButton: (props) => (
          <PlatformPressable {...props} android_ripple={{ borderless: true, radius: 30 }} />
        ),
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
    width: 28,
    height: 28,
  },
  label: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    marginTop: 2,
  },
});


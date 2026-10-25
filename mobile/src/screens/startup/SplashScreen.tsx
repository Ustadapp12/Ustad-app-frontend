import React, { useEffect, useRef, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { isGuest } from '../../utils/guest';
import { getNextOnboardingScreen, isOnboardingDone } from '../../utils/storage';
import { healthCheck } from '../../api/client';
import WorldLoading from '../../components/worldLoading/WorldLoading';
import { useStatusBarStyle } from '../../hooks/useStatusBarStyle';
import type { RootNavProp } from '../../navigation/types';
import { selectUser, selectIsHydrated, selectStartGuestSession, selectOnboardingCompleted } from '../../store/selectors/auth';
import { styles } from './SplashScreen.styles';


// The animated look (Arabic letters, Bismillah, floating Lumo, rotating
// "Creating your world…" status) lives in components/worldLoading/, shared
// with the map's loading cover (2026-10-22).

interface Props {
  navigation: RootNavProp;
}

export default function SplashScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  useStatusBarStyle('light');
  // Exact values only (store/selectors/auth.ts), never the whole store.
  // The whole `user` is genuinely used for routing (email, verified,
  // provider, guest).
  const user = useAuthStore(selectUser);
  const isHydrated = useAuthStore(selectIsHydrated);
  const startGuestSession = useAuthStore(selectStartGuestSession);
  const onboardingCompleted = useAuthStore(selectOnboardingCompleted);

  // Minimum time the brand screen stays visible — starts counting from
  // mount, in parallel with hydrate(), not after it finishes. Total wait is
  // max(hydrate time, 2200ms) instead of hydrate time + 2200ms.
  const [minDelayDone, setMinDelayDone] = useState(false);

  useEffect(() => {
    // Warm the (serverless, cold-start-prone) backend the instant Splash
    // mounts, well before the user reaches Login/Lesson and actually needs a
    // real response. Warming is now its ONLY job: the result is deliberately
    // discarded.
    //
    // It used to also drive the offline banner via setOffline(!ok), which was
    // the main cause of the banner appearing on a working app. healthCheck()
    // aborts at 5s, which is shorter than the cold start it exists to hide,
    // so it reported "offline" while hydrate() reached the same backend fine
    // on its 30s timeout. Last writer won, so a cold start reliably stuck the
    // banner on.
    //
    // Device connectivity is now answered by the OS, once, in
    // services/connectivity.ts — no HTTP request, nothing to race, and it
    // covers the signed-out and guest launches this probe was reaching for.
    void healthCheck();

    const timer = setTimeout(() => setMinDelayDone(true), 1000);
    return () => { clearTimeout(timer); };
  }, []);

  // Auto-navigate once both hydration and the minimum brand delay are done
  useEffect(() => {
    if (isHydrated && minDelayDone) void navigate();
  }, [isHydrated, minDelayDone]);

  // navigate() is also reachable by tapping the screen, and on first launch it
  // now performs a slow network call (minting the guest account). Without this
  // latch, impatient tapping during that window would fire startGuestSession()
  // repeatedly and leave behind an orphaned account per extra tap.
  const navigatingRef = useRef(false);

  async function navigate() {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    try {
      await route();
    } finally {
      navigatingRef.current = false;
    }
  }

  async function route() {
    if (user) {
      // A guest has no email to verify and hasn't done onboarding (they answer
      // those questions after claiming the account) — straight to the map.
      if (isGuest(user)) {
        navigation.replace('MainTabs');
        return;
      }
      if (!user.email_verified) {
        navigation.replace('VerifyEmail', { email: user.email ?? undefined });
        return;
      }
      // An account can exist (tokens persisted) while onboarding is still
      // mid-flight — e.g. the user quit the app between SignUp and the final
      // onboarding step. Resume where they left off instead of dropping them
      // straight onto the map with onboarding never marked done.
      //
      // onboardingCompleted (freshly loaded by hydrate() before this
      // runs) is the account-level source of truth — pass it through so an
      // existing account never gets routed back into onboarding just because
      // it's a new device/reinstall with no local flag set. See
      // getNextOnboardingScreen()'s doc comment in utils/storage.ts.
      const nextOnboardingScreen = await getNextOnboardingScreen(
        onboardingCompleted,
        user.provider === 'apple',
      );
      navigation.replace(nextOnboardingScreen ?? 'MainTabs');
      return;
    }

    // Someone who has been through onboarding but has no session signed out —
    // send them back to Login rather than minting them a fresh guest account,
    // which would look like their progress had vanished.
    if (await isOnboardingDone()) {
      navigation.replace('Login');
      return;
    }

    // First launch. Everyone starts as a guest so the app is usable before any
    // email is committed. If this fails (offline, backend cold) there's nothing
    // to show — fall back to the old signup-first behaviour rather than
    // dropping the user onto a map with no levels in it.
    try {
      await startGuestSession();
      navigation.replace('MainTabs');
    } catch {
      navigation.replace('SignUp');
    }
  }

  return (
    <TouchableOpacity style={styles.container} activeOpacity={1} onPress={() => { if (isHydrated) void navigate(); }}>
      <WorldLoading insetTop={insets.top} />
    </TouchableOpacity>
  );
}

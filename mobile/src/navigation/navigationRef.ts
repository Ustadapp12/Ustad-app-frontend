import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

// Lets non-component code (e.g. the API client's global 403 handler) trigger
// navigation without being inside the React tree. Attached to
// <NavigationContainer ref={navigationRef}> in RootNavigator.tsx.
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Safety-net redirect for a 403 EMAIL_NOT_VERIFIED response from any screen —
// see api/client.ts. The primary defense is authStore's login/register/
// hydrate already routing unverified users here directly; this only fires
// if some other gated call slips through during an already-in-progress
// session.
export function redirectToVerifyEmail() {
  if (navigationRef.isReady()) {
    navigationRef.navigate('VerifyEmail');
  }
}

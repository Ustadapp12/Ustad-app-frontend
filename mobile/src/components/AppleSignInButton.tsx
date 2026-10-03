import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useAuthStore } from '../store/authStore';
import { LoadingRing } from './LoadingSpinner';
import { isAppleSignInAvailable } from '../services/appleAuth';
import type { AccountAction } from '../types/api';

/** Apple logo, drawn inline like GoogleSignInButton's "G".
 *
 *  A custom button rather than the library's native ASAuthorizationAppleIDButton:
 *  that one is a legacy requireNativeComponent view, which is the fragile part
 *  of the library on the New Architecture, and Apple's Human Interface
 *  Guidelines explicitly allow custom buttons that keep the logo, the approved
 *  wording, black or white fill, and the system font. */
function AppleLogo({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#FFFFFF"
        d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
      />
    </Svg>
  );
}

interface Props {
  /** Apple approves exactly "Sign in with Apple", "Sign up with Apple" and
   *  "Continue with Apple". Nothing else. */
  label?: 'Sign in with Apple' | 'Sign up with Apple' | 'Continue with Apple';
  /** Fired only on a real outcome. A cancelled Apple sheet calls nothing. */
  onSuccess: (action: AccountAction) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  /** Same contract as GoogleSignInButton: tapped while disabled. */
  onBlocked?: () => void;
}

/** Renders nothing off iOS (or below iOS 13), so callers can drop it in
 *  unconditionally next to the Google button. */
export default function AppleSignInButton({
  label = 'Continue with Apple',
  onSuccess,
  onError,
  disabled = false,
  onBlocked,
}: Props) {
  const loginWithApple = useAuthStore(s => s.loginWithApple);
  const [busy, setBusy] = useState(false);

  if (!isAppleSignInAvailable()) return null;

  async function handlePress() {
    if (busy) return;
    if (disabled) { onBlocked?.(); return; }
    setBusy(true);
    try {
      const action = await loginWithApple();
      // null means the user dismissed Apple's sheet.
      if (action !== null) onSuccess(action);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Apple sign in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <TouchableOpacity
      style={[styles.btn, (busy || disabled) && styles.btnDisabled]}
      onPress={handlePress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {busy ? (
        <LoadingRing size={20} color="#FFFFFF" />
      ) : (
        <View style={styles.content}>
          <AppleLogo />
          <Text style={styles.text}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Black fill per Apple's HIG. Same radius, padding and spacing as
  // GoogleSignInButton, since Apple also requires its button to be no smaller
  // or less prominent than any other sign-in option on the screen.
  btn: {
    backgroundColor: '#000000',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#000000',
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  btnDisabled: { opacity: 0.6 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // No fontFamily on purpose: the HIG asks for the system font (San Francisco)
  // on custom Apple buttons, unlike the rest of the app's Nunito.
  text: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});

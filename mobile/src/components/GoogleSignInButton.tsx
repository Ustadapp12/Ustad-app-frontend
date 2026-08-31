import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';
import { LoadingRing } from './LoadingSpinner';
import type { AccountAction } from '../types/api';

/** Google's four-colour "G", drawn inline rather than shipped as a PNG.
 *  react-native-svg is already a dependency, and vector keeps it crisp at any
 *  density without adding five more files to the asset pipeline. The paths and
 *  colours are Google's own, which their branding guidelines require. */
function GoogleG({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <Path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <Path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <Path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </Svg>
  );
}

interface Props {
  /** Google's branding guidelines allow "Continue with", "Sign in with" and
   *  "Sign up with". Anything else has to keep the logo and wording intact. */
  label?: string;
  /** Fired only on a real outcome. A cancelled Google sheet calls nothing,
   *  because backing out is not an error and should feel like nothing happened. */
  onSuccess: (action: AccountAction) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  /** Fired instead of starting the Google flow when tapped while `disabled`
   *  is true — lets the caller point at *why* (e.g. an unchecked terms box)
   *  rather than the tap just doing nothing. */
  onBlocked?: () => void;
}

export default function GoogleSignInButton({
  label = 'Continue with Google',
  onSuccess,
  onError,
  disabled = false,
  onBlocked,
}: Props) {
  const loginWithGoogle = useAuthStore(s => s.loginWithGoogle);
  const [busy, setBusy] = useState(false);

  async function handlePress() {
    if (busy) return;
    if (disabled) { onBlocked?.(); return; }
    setBusy(true);
    try {
      const action = await loginWithGoogle();
      // null means the user dismissed Google's account picker.
      if (action !== null) onSuccess(action);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Google sign in failed. Please try again.');
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
        <LoadingRing size={20} color={colors.midText} />
      ) : (
        <View style={styles.content}>
          <GoogleG />
          <Text style={styles.text}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // White with a visible border, per Google's light-theme button spec, which
  // also keeps it clearly secondary to the app's filled primary CTA.
  btn: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  btnDisabled: { opacity: 0.6 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: colors.darkText },
});

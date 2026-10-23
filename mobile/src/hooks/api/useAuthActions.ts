import { useMemo } from 'react';
import { authApi } from '../../api';

/**
 * Email verification and password reset calls, for the auth screens. Thin on
 * purpose: each screen keeps its own form, loading and error state; this is
 * just the one place those screens reach the server (2026-10-22). Each action
 * throws whatever the API throws, so screens keep their own messages.
 */
export function useAuthActions() {
  return useMemo(() => ({
    /** Sends a reset code (Forgot password, resend code, Change password). */
    requestPasswordReset: (email: string) => authApi.forgotPassword(email),
    verifyResetCode: (email: string, code: string) => authApi.verifyResetCode(email, code),
    resetPassword: (email: string, code: string, newPassword: string) =>
      authApi.resetPassword(email, code, newPassword),
    verifyEmail: (email: string, code: string) => authApi.verifyEmail(email, code),
    resendVerification: (email: string) => authApi.resendVerification(email),
    /** The signed-in user's email, or '' if unavailable. Never throws. */
    fetchOwnEmail: () => authApi.me().then(me => me.user.email ?? '').catch(() => ''),
  }), []);
}

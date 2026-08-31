package com.ustadapp

import android.provider.Settings
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Reads the real on-screen navigation-bar height straight from Android's own
 * WindowInsetsCompat API, bypassing react-native-safe-area-context's JS
 * bridge relay entirely. That relay is what was confirmed (2026-08-24)
 * misreporting insets.bottom as 0 on some real 3-button-nav devices even
 * though Android itself reported a nonzero value at the WindowManager level
 * — so this reads the same underlying OS value a second, independent way,
 * directly in the one place it's needed, instead of trusting the relay.
 *
 * Returns 0 on gesture-nav devices and on any device with no on-screen nav
 * bar at all (this is correct, not a failure — there's nothing to clear),
 * and the true measured bar height in dp on 3-button-nav devices. No
 * hardcoded constant anywhere: the number is always this device's actual bar.
 */
class UstadNavigationBarModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "UstadNavigationBar"

  /**
   * Android's own three-way nav mode, from Settings.Secure:
   *   0 = 3-button, 1 = 2-button, 2 = full gesture navigation.
   * This is the only reliable "are there actually buttons down there?"
   * signal. The navigationBars() inset is NOT: on gesture nav it still
   * reports the gesture-hint pill's own band (and OEM skins — ColorOS on
   * the reported Oppo F9 among them — report a generous one), so a padding
   * floor built on that inset alone silently reserved a full button-bar's
   * worth of dead space on phones whose owner had turned the buttons OFF.
   * That's the "extra padding on some phones" bug, and it's exactly why it
   * showed on the Oppo while a Samsung sitting next to it looked right —
   * different skins, different gesture-inset values, same wrong assumption.
   *
   * Defaults to 0 (3-button) if the key is missing, which keeps the original
   * 3-button misreport fix in force on any device that doesn't expose it.
   */
  private fun navigationMode(): Int =
    Settings.Secure.getInt(reactApplicationContext.contentResolver, "navigation_mode", 0)

  /**
   * Exposed to JS so safeBottomInset() can decide whether to reserve anything
   * AT ALL, rather than only how much.
   *
   * This is the half that was missing on 2026-08-28: returning 0 from
   * getNavigationBarHeightDp() below stopped THIS module inflating the inset,
   * but safeBottomInset then fell through to react-native-safe-area-context's
   * own insets.bottom -- which on gesture navigation is the gesture bar's own
   * band, a real nonzero number (generous on ColorOS). So the dead strip
   * survived the fix: one source removed, the other still reserving.
   *
   * On gesture nav there is nothing to clear. The gesture bar is an overlay
   * the system draws ON TOP of the app, and Android expects apps to render
   * underneath it -- that is what every modern app does. Reserving its height
   * as padding is what makes the bottom of the screen look broken.
   */
  @ReactMethod(isBlockingSynchronousMethod = true)
  fun getNavigationMode(): Double = navigationMode().toDouble()

  // Blocking/synchronous so callers (safeBottomInset, used inline during
  // render on 26 screens) don't need to become async — safe here because
  // it's only ever called after the app's Activity/DecorView already exist
  // (from a mounted React screen), never at module-init time.
  @ReactMethod(isBlockingSynchronousMethod = true)
  fun getNavigationBarHeightDp(): Double {
    // Gesture / 2-button nav: there is no button bar to clear, so this
    // contributes nothing and safeBottomInset falls through to trusting
    // react-native-safe-area-context's own value (which reports the real
    // gesture inset correctly — it was only ever the 3-button case that
    // misreported).
    if (navigationMode() != 0) return 0.0
    // -1 means "couldn't read it" — distinct from 0, which means "read it,
    // there is genuinely no bar". The JS side caches the answer for the whole
    // session, so a not-yet-attached window must NOT be allowed to cache
    // itself as a real 0 and leave a 3-button device with no clearance.
    val activity = reactApplicationContext.currentActivity ?: return -1.0
    val decorView = activity.window?.decorView ?: return -1.0
    val windowInsets = ViewCompat.getRootWindowInsets(decorView) ?: return -1.0
    // A bar that's currently hidden (immersive mode — see setImmersiveMode
    // below, which the app turns on app-wide) needs no clearance either.
    // getInsets() alone can still report the bar's height across the async
    // gap between asking for the hide and the hide landing, which is how a
    // stale full-height reading used to get cached for the whole session.
    if (!windowInsets.isVisible(WindowInsetsCompat.Type.navigationBars())) return 0.0
    val navBarPx = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom
    if (navBarPx <= 0) return 0.0
    val density = reactApplicationContext.resources.displayMetrics.density
    return (navBarPx / density).toDouble()
  }

  /**
   * Immersive mode, scoped to whichever screen calls this (MapScreen, for
   * now — see its own focus/blur effect) — not a permanent app-wide
   * fullscreen setting. hidden=true hides the system navigation bar but
   * lets the user swipe from the edge to reveal it again temporarily
   * (BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE — Android auto-hides it again a
   * few seconds later with no action needed, it's not a one-shot reveal).
   * hidden=false restores normal permanent visibility, e.g. on screen blur.
   *
   * Must run on the UI thread — it touches the real Window/DecorView, and
   * React Native does not guarantee @ReactMethod calls already run there.
   */
  @ReactMethod
  fun setImmersiveMode(hidden: Boolean) {
    val activity = reactApplicationContext.currentActivity ?: return
    activity.runOnUiThread {
      val window = activity.window ?: return@runOnUiThread
      val controller = WindowCompat.getInsetsController(window, window.decorView)
      if (hidden) {
        controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        controller.hide(WindowInsetsCompat.Type.navigationBars())
      } else {
        controller.show(WindowInsetsCompat.Type.navigationBars())
      }
    }
  }
}

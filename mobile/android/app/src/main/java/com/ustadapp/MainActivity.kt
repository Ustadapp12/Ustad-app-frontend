package com.ustadapp

import android.os.Bundle
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    setTheme(R.style.AppTheme)
    super.onCreate(null)
  }

  /**
   * Re-hides the system navigation bar every time this window REGAINS
   * focus, not just once at JS mount (see UstadNavigationBarModule's own
   * setImmersiveMode, which RootNavigator.tsx calls exactly once on cold
   * start). Hiding system bars via WindowInsetsController is documented by
   * Android as non-sticky across a focus loss/regain cycle -- a keyboard
   * opening then closing, a system permission dialog (the mic prompt every
   * speak exercise can trigger), a notification, Google Sign-In's own
   * SignInHubActivity opening on top of this one and returning, even just
   * backgrounding the app and coming back -- ANY of these silently clears
   * the hidden state, and nothing was ever re-applying it. Confirmed
   * 2026-08-28 on a real device (Oppo F9 / ColorOS, more aggressive about
   * this than stock Android): once cleared, the bar stayed visible for the
   * rest of the session, overlapping app content and swallowing taps meant
   * for whatever button the app had drawn underneath it.
   *
   * onWindowFocusChanged(hasFocus=true) is the exact hook Android's own
   * immersive-mode documentation names for this -- it fires precisely when
   * a dialog/keyboard/other-activity stops covering this window, which is
   * the only moment re-hiding actually needs to happen. Duplicates
   * UstadNavigationBarModule.setImmersiveMode's hide branch directly rather
   * than routing through the RN bridge: this must not depend on the JS
   * thread or the bridge being ready, since one of the very triggers this
   * guards against (returning from a system dialog) can fire before RN has
   * finished re-attaching.
   */
  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (!hasFocus) return
    val window = window ?: return
    val controller = WindowCompat.getInsetsController(window, window.decorView)
    controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    controller.hide(WindowInsetsCompat.Type.navigationBars())
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "UstadApp"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}

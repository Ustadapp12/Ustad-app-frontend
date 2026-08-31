import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import FirebaseCore
import GoogleSignIn

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // GoogleService-Info.plist is deliberately NOT committed (it carries this
    // project's Firebase keys), so the guard stays. What changed is that a
    // missing file is now loud instead of silent: without it there is no
    // Crashlytics, no Analytics AND no Google Sign-In, and the only previous
    // symptom was those three quietly doing nothing on every build.
    //
    // To fix: download it from the Firebase console (Project settings > your
    // iOS app) into ios/UstadApp/, then run `npm run link:firebase:ios`.
    if Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil {
      FirebaseApp.configure()
    } else {
      // Logged, not asserted: a contributor without Firebase credentials should
      // still be able to build and run the app locally.
      NSLog("""
        [UstadApp] ====================================================================
        [UstadApp] GoogleService-Info.plist NOT FOUND in the app bundle.
        [UstadApp] Crashlytics, Analytics and Google Sign-In are DISABLED for this build.
        [UstadApp] Fix: put the file in ios/UstadApp/ then run `npm run link:firebase:ios`
        [UstadApp] ====================================================================
        """)
    }

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "UstadApp",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  /**
   Hands the OAuth callback URL back to the Google Sign-In SDK.

   Without this the native Google sheet completes, Safari/the ASWebAuthenticationSession
   redirects to our custom scheme, and nothing is listening — so the flow
   silently never returns a token and `signInWithGoogle()` hangs or throws.
   Unlike Firebase, GIDSignIn does not swizzle the app delegate, so the app has
   to forward the URL itself.

   Pairs with the CFBundleURLTypes entry that `npm run link:firebase:ios`
   writes into Info.plist from GoogleService-Info.plist's REVERSED_CLIENT_ID.
   */
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return GIDSignIn.sharedInstance.handle(url)
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

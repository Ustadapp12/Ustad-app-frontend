# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# Google Sign-In / Play Services Auth — reflection-accessed by the Play
# Services SDK itself when resolving the sign-in result; the standard
# community-documented keep set for this library under R8.
-keep class com.google.android.gms.auth.api.signin.** { *; }
-keep class com.google.android.gms.common.api.** { *; }
-dontwarn com.google.android.gms.**

# Firebase (Analytics / Crashlytics / Auth) — Google ships these as prebuilt
# AARs with their own bundled consumer rules, but keeping the public API
# explicitly is cheap insurance against R8 stripping something the SDK
# reaches via reflection at runtime rather than a compile-time reference.
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

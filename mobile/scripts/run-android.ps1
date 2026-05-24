# Run from mobile/ — sets Android SDK + Java paths, then builds to emulator/device.
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
$jbr = "C:\Program Files\Android\Android Studio\jbr"
if (-not (Test-Path $sdk)) {
  Write-Error "Android SDK not found at $sdk. Install Android Studio first."
  exit 1
}
if (-not (Test-Path "$jbr\bin\java.exe")) {
  Write-Error "Java (JBR) not found at $jbr. Install Android Studio."
  exit 1
}
$env:ANDROID_HOME = $sdk
$env:JAVA_HOME = $jbr
$env:Path = "$jbr\bin;$sdk\platform-tools;$sdk\emulator;$env:Path"
Write-Host "ANDROID_HOME=$env:ANDROID_HOME"
Write-Host "JAVA_HOME=$env:JAVA_HOME"
adb devices
$metro = netstat -ano | findstr ":8081.*LISTENING"
if ($metro) {
  Write-Host "Metro already on 8081 — installing app only."
  npx react-native run-android --no-packager --port 8081
} else {
  npm run android
}

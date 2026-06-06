#!/usr/bin/env bash
# One-time: create android/app/release.keystore for signed release APKs.
set -euo pipefail
cd "$(dirname "$0")/.."

KEYSTORE="android/app/release.keystore"
PROPS="android/keystore.properties"

if [[ -f "$KEYSTORE" ]]; then
  echo "Keystore already exists: $KEYSTORE"
  exit 1
fi

echo "Creating release keystore at $KEYSTORE"
echo "You will be prompted for store password, key password, and certificate details."
echo "Use alias: ustad"
echo ""

keytool -genkeypair -v -storetype PKCS12 \
  -keystore "$KEYSTORE" \
  -alias ustad \
  -keyalg RSA -keysize 2048 -validity 10000

if [[ ! -f "$PROPS" ]]; then
  cp android/keystore.properties.example "$PROPS"
  echo ""
  echo "Created $PROPS — edit storePassword and keyPassword to match what you entered."
fi

echo ""
echo "Base64 for GitHub secret ANDROID_KEYSTORE_BASE64:"
base64 -i "$KEYSTORE" | tr -d '\n'
echo ""
echo ""
echo "Add these GitHub Actions secrets:"
echo "  ANDROID_KEYSTORE_BASE64  (output above)"
echo "  ANDROID_KEYSTORE_PASSWORD"
echo "  ANDROID_KEY_ALIAS        ustad"
echo "  ANDROID_KEY_PASSWORD"

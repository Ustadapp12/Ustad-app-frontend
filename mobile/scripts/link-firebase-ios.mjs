/**
 * Wires GoogleService-Info.plist into the iOS app. Two jobs:
 *
 *  1. Registers the plist as a bundle resource in the Xcode project, the way
 *     Xcode's "Add Files" would. Without this the file sits on disk but never
 *     gets copied into the .app bundle, and FirebaseApp.configure() fails at
 *     runtime with "could not locate config file".
 *
 *  2. Writes the Google Sign-In callback URL scheme into Info.plist, taken from
 *     the plist's own REVERSED_CLIENT_ID. Without it the native Google sheet
 *     completes and then has nowhere to redirect back to, so sign-in never
 *     returns a token. This half lives here rather than being committed by hand
 *     because REVERSED_CLIENT_ID is project-specific and exists only inside the
 *     (deliberately uncommitted) GoogleService-Info.plist.
 *
 * Both steps are idempotent, so re-running after a Firebase project change is
 * safe. Run after downloading GoogleService-Info.plist from the Firebase
 * console into ios/UstadApp/:
 *
 *     npm run link:firebase:ios
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const plistPath = path.join(root, 'ios', 'UstadApp', 'GoogleService-Info.plist');
const pbxprojPath = path.join(root, 'ios', 'UstadApp.xcodeproj', 'project.pbxproj');
const infoPlistPath = path.join(root, 'ios', 'UstadApp', 'Info.plist');

function makeId(seed) {
  return createHash('md5').update(seed).digest('hex').slice(0, 24).toUpperCase();
}

function linkBundleResource() {
  let pbx = fs.readFileSync(pbxprojPath, 'utf8');
  const marker = '/* GoogleService-Info.plist */';
  if (pbx.includes(marker)) {
    console.log('- Xcode project already references GoogleService-Info.plist');
    return;
  }

  const fileRefId = makeId('googleservice-info-ref');
  const buildFileId = makeId('googleservice-info-build');
  const name = 'GoogleService-Info.plist';

  pbx = pbx.replace(
    '/* End PBXBuildFile section */',
    `\t\t${buildFileId} /* ${name} in Resources */ = {isa = PBXBuildFile; fileRef = ${fileRefId} /* ${name} */; };\n/* End PBXBuildFile section */`,
  );
  pbx = pbx.replace(
    '/* End PBXFileReference section */',
    `\t\t${fileRefId} /* ${name} */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xml; name = "${name}"; path = "UstadApp/${name}"; sourceTree = "<group>"; };\n/* End PBXFileReference section */`,
  );
  pbx = pbx.replace(
    /(13B07F8E1A680F5B00A75B9A \/\* Resources \*\/ = \{[\s\S]*?files = \(\n)([\s\S]*?)(\t\t\t\);)/,
    `$1$2\t\t\t\t${buildFileId} /* ${name} in Resources */,\n$3`,
  );
  pbx = pbx.replace(
    /(13B07FAE1A68108700A75B9A \/\* UstadApp \*\/ = \{\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = \(\n)/,
    `$1\t\t\t\t${fileRefId} /* ${name} */,\n`,
  );

  fs.writeFileSync(pbxprojPath, pbx);
  console.log('- Linked GoogleService-Info.plist into the Xcode project.');
}

/**
 * Pulls REVERSED_CLIENT_ID out of GoogleService-Info.plist.
 *
 * Deliberately a regex rather than a plist parser: this is a flat
 * <key>/<string> pair in a file Google generates to a fixed shape, and pulling
 * a plist dependency into a repo that has none is not worth it for one key.
 */
function readReversedClientId() {
  const plist = fs.readFileSync(plistPath, 'utf8');
  const m = plist.match(/<key>REVERSED_CLIENT_ID<\/key>\s*<string>([^<]+)<\/string>/);
  return m ? m[1].trim() : null;
}

/**
 * Adds, or updates, the CFBundleURLTypes entry that Google Sign-In redirects
 * back through. An existing Google scheme is matched by its
 * com.googleusercontent.apps. prefix and replaced, so re-running after a
 * Firebase project change swaps the scheme instead of leaving a stale second
 * one behind (two schemes means the OS picks one, and half the time it is the
 * wrong one).
 */
function linkUrlScheme() {
  const reversed = readReversedClientId();
  if (!reversed) {
    console.warn(
      '- WARNING: no REVERSED_CLIENT_ID in GoogleService-Info.plist.\n' +
      '    That key only appears once Google Sign-In is enabled for the iOS app\n' +
      '    (Firebase console > Authentication > Sign-in method > Google).\n' +
      '    Skipping the URL scheme. "Continue with Google" will NOT work on iOS.',
    );
    return;
  }

  let info = fs.readFileSync(infoPlistPath, 'utf8');

  if (info.includes(reversed)) {
    console.log('- Info.plist already has the correct Google Sign-In URL scheme.');
    return;
  }

  const stale = info.match(/[ \t]*<string>com\.googleusercontent\.apps\.[^<]+<\/string>\n?/);
  if (stale) {
    info = info.replace(stale[0], `\t\t\t\t<string>${reversed}</string>\n`);
    fs.writeFileSync(infoPlistPath, info);
    console.log('- Replaced a stale Google Sign-In URL scheme in Info.plist.');
    return;
  }

  const block = [
    '\t<key>CFBundleURLTypes</key>',
    '\t<array>',
    '\t\t<dict>',
    '\t\t\t<key>CFBundleTypeRole</key>',
    '\t\t\t<string>Editor</string>',
    '\t\t\t<key>CFBundleURLName</key>',
    '\t\t\t<string>com.ustadapp.googlesignin</string>',
    '\t\t\t<key>CFBundleURLSchemes</key>',
    '\t\t\t<array>',
    `\t\t\t\t<string>${reversed}</string>`,
    '\t\t\t</array>',
    '\t\t</dict>',
    '\t</array>',
    '',
  ].join('\n');

  // Inserted before CFBundleVersion so the file stays roughly key-sorted, the
  // way Xcode writes it.
  const anchor = '\t<key>CFBundleVersion</key>';
  if (!info.includes(anchor)) {
    console.error('- ERROR: no CFBundleVersion key in Info.plist; leaving it untouched.');
    process.exit(1);
  }
  info = info.replace(anchor, block + anchor);

  fs.writeFileSync(infoPlistPath, info);
  console.log('- Added the Google Sign-In URL scheme to Info.plist.');
}

function main() {
  if (!fs.existsSync(plistPath)) {
    console.error(
      'Missing', plistPath,
      '\nDownload GoogleService-Info.plist from the Firebase console (Project settings > your iOS app) and save it there first.',
    );
    process.exit(1);
  }

  linkBundleResource();
  linkUrlScheme();
  console.log('Done. Run `cd ios && pod install` next.');
}

main();

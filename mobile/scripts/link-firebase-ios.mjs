/**
 * Registers ios/UstadApp/GoogleService-Info.plist as a bundle resource in the
 * Xcode project, the way Xcode's "Add Files" would. Without this, the file
 * sits on disk but never gets copied into the .app bundle, and
 * FirebaseApp.configure() fails at runtime with "could not locate config file".
 *
 * Run after downloading GoogleService-Info.plist from the Firebase console
 * into ios/UstadApp/: node scripts/link-firebase-ios.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const plistPath = path.join(root, 'ios', 'UstadApp', 'GoogleService-Info.plist');
const pbxprojPath = path.join(root, 'ios', 'UstadApp.xcodeproj', 'project.pbxproj');

function makeId(seed) {
  return createHash('md5').update(seed).digest('hex').slice(0, 24).toUpperCase();
}

function main() {
  if (!fs.existsSync(plistPath)) {
    console.error(
      'Missing', plistPath,
      '\nDownload GoogleService-Info.plist from the Firebase console (Project settings > your iOS app) and save it there first.',
    );
    process.exit(1);
  }

  let pbx = fs.readFileSync(pbxprojPath, 'utf8');
  const marker = '/* GoogleService-Info.plist */';
  if (pbx.includes(marker)) {
    console.log('Xcode project already references GoogleService-Info.plist');
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
  console.log('Linked GoogleService-Info.plist into the Xcode project.');
}

main();

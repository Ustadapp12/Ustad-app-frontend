/**
 * Ensures custom fonts are valid TTF files, then copies them into Android/iOS app bundles.
 * Run: node scripts/link-fonts.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const assetsDir = path.join(root, 'assets', 'fonts');
const androidDir = path.join(root, 'android', 'app', 'src', 'main', 'assets', 'fonts');
const iosFontsDir = path.join(root, 'ios', 'UstadApp', 'Fonts');
const infoPlistPath = path.join(root, 'ios', 'UstadApp', 'Info.plist');
const pbxprojPath = path.join(root, 'ios', 'UstadApp.xcodeproj', 'project.pbxproj');

/** Remote sources for fonts that were previously saved as GitHub HTML pages. */
const DOWNLOADS = {
  'Nunito-Regular.ttf':
    'https://cdn.jsdelivr.net/fontsource/fonts/nunito@5.2.5/latin-400-normal.ttf',
  'Nunito-Bold.ttf':
    'https://cdn.jsdelivr.net/fontsource/fonts/nunito@5.2.5/latin-700-normal.ttf',
  'AmiriQuran.ttf':
    'https://raw.githubusercontent.com/aliftype/amiri/master/fonts/AmiriQuran.ttf',
};

const FONT_NAMES = [
  'Nunito-Regular.ttf',
  'Nunito-Bold.ttf',
  'Amiri-Regular.ttf',
  'AmiriQuran.ttf',
  'NotoNaskhArabic.ttf',
  'NotoNastaliqUrdu.ttf',
];

function isTtf(filePath) {
  const buf = Buffer.alloc(4);
  const fd = fs.openSync(filePath, 'r');
  try {
    fs.readSync(fd, buf, 0, 4, 0);
  } finally {
    fs.closeSync(fd);
  }
  const sig = buf.toString('binary');
  return sig === '\x00\x01\x00\x00' || sig === 'OTTO';
}

async function downloadFont(filename, url, dest) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${filename}: ${res.status} ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 8 || !isTtfFromBuffer(buf)) {
    throw new Error(`Download for ${filename} is not a valid TTF (${url})`);
  }
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  await fs.promises.writeFile(dest, buf);
  console.log('downloaded', filename);
}

function isTtfFromBuffer(buf) {
  const sig = buf.toString('binary', 0, 4);
  return sig === '\x00\x01\x00\x00' || sig === 'OTTO';
}

function makeId(seed) {
  return createHash('md5').update(seed).digest('hex').slice(0, 24).toUpperCase();
}

async function ensureAssetsFonts() {
  await fs.promises.mkdir(assetsDir, { recursive: true });

  const legacyAndroid = androidDir;
  for (const name of FONT_NAMES) {
    const dest = path.join(assetsDir, name);
    const legacy = path.join(legacyAndroid, name);
    if (!fs.existsSync(dest) && fs.existsSync(legacy) && isTtf(legacy)) {
      await fs.promises.copyFile(legacy, dest);
      console.log('seeded', name, 'from android bundle');
    }
  }

  for (const [filename, url] of Object.entries(DOWNLOADS)) {
    const dest = path.join(assetsDir, filename);
    if (!fs.existsSync(dest) || !isTtf(dest)) {
      await downloadFont(filename, url, dest);
    }
  }

  for (const name of FONT_NAMES) {
    const dest = path.join(assetsDir, name);
    if (!fs.existsSync(dest) || !isTtf(dest)) {
      throw new Error(
        `Missing or invalid font: ${name}. Add a valid .ttf to assets/fonts/ or extend DOWNLOADS in link-fonts.mjs.`,
      );
    }
  }
}

async function copyToTargets() {
  await fs.promises.mkdir(androidDir, { recursive: true });
  await fs.promises.mkdir(iosFontsDir, { recursive: true });

  for (const name of FONT_NAMES) {
    const src = path.join(assetsDir, name);
    await fs.promises.copyFile(src, path.join(androidDir, name));
    await fs.promises.copyFile(src, path.join(iosFontsDir, name));
  }
  console.log('copied fonts -> android + ios');
}

function updateInfoPlist() {
  let xml = fs.readFileSync(infoPlistPath, 'utf8');
  const marker = '<key>UIAppFonts</key>';
  const block = [
    '\t<key>UIAppFonts</key>',
    '\t<array>',
    ...FONT_NAMES.map(f => `\t\t<string>${f}</string>`),
    '\t</array>',
  ].join('\n');

  if (xml.includes(marker)) {
    xml = xml.replace(
      /\t<key>UIAppFonts<\/key>\s*<array>[\s\S]*?<\/array>/,
      block,
    );
  } else {
    xml = xml.replace(
      '</dict>\n</plist>',
      `${block}\n</dict>\n</plist>`,
    );
  }
  fs.writeFileSync(infoPlistPath, xml);
  console.log('updated Info.plist UIAppFonts');
}

function updatePbxproj() {
  let pbx = fs.readFileSync(pbxprojPath, 'utf8');
  const fontsGroupName = 'Fonts';

  if (!pbx.includes('/* Fonts */')) {
    const fontsGroupId = makeId('fonts-group');
    const childRefs = FONT_NAMES.map(name => {
      const fileRefId = makeId(`font-ref-${name}`);
      const buildFileId = makeId(`font-build-${name}`);
      return { name, fileRefId, buildFileId };
    });

    const resourceEntries = [];
    for (const { name, fileRefId, buildFileId } of childRefs) {
      resourceEntries.push(`\t\t\t\t${buildFileId} /* ${name} in Resources */,`);
      pbx = pbx.replace(
        '/* End PBXBuildFile section */',
        `\t\t${buildFileId} /* ${name} in Resources */ = {isa = PBXBuildFile; fileRef = ${fileRefId} /* ${name} */; };\n/* End PBXBuildFile section */`,
      );
      pbx = pbx.replace(
        '/* End PBXFileReference section */',
        `\t\t${fileRefId} /* ${name} */ = {isa = PBXFileReference; lastKnownFileType = file; name = "${name}"; path = "Fonts/${name}"; sourceTree = "<group>"; };\n/* End PBXFileReference section */`,
      );
    }

    pbx = pbx.replace(
      /(13B07F8E1A680F5B00A75B9A \/\* Resources \*\/ = \{[\s\S]*?files = \(\n)([\s\S]*?)(\t\t\t\);)/,
      `$1$2${resourceEntries.join('\n')}\n$3`,
    );

    const children = childRefs.map(({ name, fileRefId }) => `\t\t\t\t${fileRefId} /* ${name} */,`).join('\n');
    pbx = pbx.replace(
      '/* End PBXGroup section */',
      `\t\t${fontsGroupId} /* Fonts */ = {\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n${children}\n\t\t\t);\n\t\t\tname = Fonts;\n\t\t\tpath = UstadApp/Fonts;\n\t\t\tsourceTree = "<group>";\n\t\t};\n/* End PBXGroup section */`,
    );
    pbx = pbx.replace(
      /(13B07FAE1A68108700A75B9A \/\* UstadApp \*\/ = \{\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = \(\n)/,
      `$1\t\t\t\t${fontsGroupId} /* Fonts */,\n`,
    );
    console.log('updated Xcode project for fonts');
  } else {
    console.log('Xcode project already references Fonts');
  }
  fs.writeFileSync(pbxprojPath, pbx);
}

async function main() {
  await ensureAssetsFonts();
  await copyToTargets();
  updateInfoPlist();
  updatePbxproj();
  console.log('Fonts linked. Rebuild the APK: npm run build:apk');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

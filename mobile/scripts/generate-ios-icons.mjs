/**
 * Generate the iOS AppIcon set from assets/images/lumo_transparent.png.
 * Run: node scripts/generate-ios-icons.mjs
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'assets', 'images', 'lumo_transparent.png');
const appIconSet = path.join(
  root, 'ios', 'UstadApp', 'Images.xcassets', 'AppIcon.appiconset',
);

// iOS app icons must NOT have transparency — App Store Connect rejects
// icons with an alpha channel, so flatten onto the same navy used by the
// Android launcher icon background.
const BACKGROUND = { r: 15, g: 27, b: 42, alpha: 1 };

// { idiom, size, scale } -> pixel dimension = size * scale
const SLOTS = [
  { idiom: 'iphone', size: 20, scale: 2 },
  { idiom: 'iphone', size: 20, scale: 3 },
  { idiom: 'iphone', size: 29, scale: 2 },
  { idiom: 'iphone', size: 29, scale: 3 },
  { idiom: 'iphone', size: 40, scale: 2 },
  { idiom: 'iphone', size: 40, scale: 3 },
  { idiom: 'iphone', size: 60, scale: 2 },
  { idiom: 'iphone', size: 60, scale: 3 },
  { idiom: 'ios-marketing', size: 1024, scale: 1 },
];

async function icon(px, padding = 0.16) {
  const inner = Math.round(px * (1 - padding * 2));
  const mascot = await sharp(src)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({
    create: { width: px, height: px, channels: 4, background: BACKGROUND },
  })
    .composite([{ input: mascot, gravity: 'centre' }])
    .flatten({ background: BACKGROUND })
    .png()
    .toBuffer();
}

async function main() {
  if (!fs.existsSync(src)) {
    console.error('Missing', src);
    process.exit(1);
  }
  await fs.promises.mkdir(appIconSet, { recursive: true });

  const images = [];
  for (const { idiom, size, scale } of SLOTS) {
    const px = size * scale;
    const filename = `icon-${size}x${size}@${scale}x.png`;
    const buf = await icon(px);
    await fs.promises.writeFile(path.join(appIconSet, filename), buf);
    images.push({ idiom, size: `${size}x${size}`, scale: `${scale}x`, filename });
    console.log('wrote', filename, `(${px}x${px}px)`);
  }

  const contents = {
    images: images.map(({ idiom, size, scale, filename }) => ({
      idiom, size, scale, filename,
    })),
    info: { author: 'xcode', version: 1 },
  };
  await fs.promises.writeFile(
    path.join(appIconSet, 'Contents.json'),
    JSON.stringify(contents, null, 2) + '\n',
  );

  console.log('Done.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

/**
 * Generate the 512x512 Play Store listing icon from assets/images/lumo_kufi.png.
 * This is the "hi-res icon" uploaded on the Play Console store listing page —
 * separate from the launcher (mipmap/adaptive) icons baked into the APK/AAB.
 * Run: node scripts/generate-playstore-icon.mjs
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'assets', 'images', 'lumo_kufi.png');
const out = path.join(root, 'assets', 'images', 'playstore-icon.png');

// Same navy used by the Android adaptive-icon background and the iOS
// launcher icon, so the store listing icon matches the installed app icon.
const BACKGROUND = { r: 15, g: 27, b: 42, alpha: 1 };
const SIZE = 512;
const PADDING = 0.24;

async function main() {
  if (!fs.existsSync(src)) {
    console.error('Missing', src);
    process.exit(1);
  }

  const inner = Math.round(SIZE * (1 - PADDING * 2));
  const mascot = await sharp(src)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const buf = await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: BACKGROUND },
  })
    .composite([{ input: mascot, gravity: 'centre' }])
    .flatten({ background: BACKGROUND })
    .png()
    .toBuffer();

  await fs.promises.writeFile(out, buf);
  console.log('wrote', out, `(${SIZE}x${SIZE}px)`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

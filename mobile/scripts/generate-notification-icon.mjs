/**
 * Generate the Android status-bar notification icon (ic_notification) from
 * assets/images/lumo_transparent.png.
 *
 * Android masks a notification's small icon to a flat colour (white, or the
 * channel/app accent depending on OS version) and only looks at alpha — any
 * RGB info in the source is discarded. Feeding it the regular multi-colour
 * mascot (as generate-android-icons.mjs does for the launcher icon) renders
 * as a grey blob. This rebuilds the image as solid white with the source's
 * original alpha mask, at the standard 24dp status-bar-icon density set.
 *
 * Run: node scripts/generate-notification-icon.mjs
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'assets', 'images', 'lumo_transparent.png');
const res = path.join(root, 'android', 'app', 'src', 'main', 'res');

// Android's 24dp base notification-icon size across density buckets.
const densities = {
  'drawable-mdpi': 24,
  'drawable-hdpi': 36,
  'drawable-xhdpi': 48,
  'drawable-xxhdpi': 72,
  'drawable-xxxhdpi': 96,
};

async function writePng(buffer, outPath) {
  await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
  await fs.promises.writeFile(outPath, buffer);
}

async function whiteSilhouette(size) {
  const { data, info } = await sharp(src)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Force every pixel to white, keep only the source's alpha (the silhouette shape).
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
  }

  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

async function main() {
  if (!fs.existsSync(src)) {
    console.error('Missing', src);
    process.exit(1);
  }

  for (const [folder, size] of Object.entries(densities)) {
    const buf = await whiteSilhouette(size);
    await writePng(buf, path.join(res, folder, 'ic_notification.png'));
    console.log('wrote', folder, `${size}x${size}`);
  }

  console.log('Done.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

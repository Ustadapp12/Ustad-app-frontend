/**
 * Generate launcher icons + splash assets from assets/images/mascot.png
 * Run: node scripts/generate-android-icons.mjs
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'assets', 'images', 'mascot.png');
const res = path.join(root, 'android', 'app', 'src', 'main', 'res');

const densities = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

async function writePng(buffer, outPath) {
  await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
  await fs.promises.writeFile(outPath, buffer);
}

async function icon(size, padding = 0.12) {
  const inner = Math.round(size * (1 - padding * 2));
  const mascot = await sharp(src)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 15, g: 27, b: 42, alpha: 255 },
    },
  })
    .composite([{ input: mascot, gravity: 'centre' }])
    .png()
    .toBuffer();
}

async function main() {
  if (!fs.existsSync(src)) {
    console.error('Missing', src);
    process.exit(1);
  }

  for (const [folder, size] of Object.entries(densities)) {
    const buf = await icon(size);
    await writePng(buf, path.join(res, folder, 'ic_launcher.png'));
    await writePng(buf, path.join(res, folder, 'ic_launcher_round.png'));
    console.log('wrote', folder, size);
  }

  const fg432 = await sharp(src)
    .resize(280, 280, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await writePng(fg432, path.join(res, 'drawable', 'ic_launcher_foreground.png'));

  const splashLogo = await sharp(src)
    .resize(360, 360, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await writePng(splashLogo, path.join(res, 'drawable', 'splash_logo.png'));

  console.log('Done.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

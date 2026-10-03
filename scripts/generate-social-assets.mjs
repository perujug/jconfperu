import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');
const logoPath = join(root, 'src/assets/images/perujug/logo.png');

await mkdir(publicDir, { recursive: true });

const { data: logoPixels, info: logoInfo } = await sharp(logoPath)
  .resize({ width: 210, height: 210, fit: 'contain', background: '#ffffff' })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

// El activo histórico tiene fondo blanco. Lo convertimos en transparencia con
// un borde suavizado para que el personaje funcione sobre cualquier gradiente.
for (let index = 0; index < logoPixels.length; index += 4) {
  const whiteness = Math.min(
    logoPixels[index],
    logoPixels[index + 1],
    logoPixels[index + 2],
  );
  if (whiteness > 220) {
    logoPixels[index + 3] = Math.min(
      logoPixels[index + 3],
      Math.round(((255 - whiteness) / 35) * 255),
    );
  }
}

const logo = await sharp(logoPixels, { raw: logoInfo }).png().toBuffer();

const cover = Buffer.from(`
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1f2a37"/>
      <stop offset="0.52" stop-color="#5382a1"/>
      <stop offset="1" stop-color="#d91023"/>
    </linearGradient>
    <pattern id="andes" width="56" height="56" patternUnits="userSpaceOnUse">
      <path d="M0 28 28 0 56 28 28 56Z" fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="2"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#brand)"/>
  <rect width="1200" height="630" fill="url(#andes)"/>
  <rect x="58" y="58" width="1084" height="514" rx="32" fill="#111827" fill-opacity="0.28" stroke="#ffffff" stroke-opacity="0.22"/>
  <text x="340" y="245" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="78" font-weight="800">JConf Perú</text>
  <text x="340" y="322" fill="#f8fafc" font-family="Inter, Arial, sans-serif" font-size="35" font-weight="600">La conferencia de la comunidad Java peruana</text>
  <text x="340" y="395" fill="#f8fafc" font-family="Inter, Arial, sans-serif" font-size="27">Java · Jakarta EE · Spring · Cloud Native · IA</text>
  <text x="340" y="475" fill="#fbbf24" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="700">Organizada por Peru JUG</text>
</svg>`);

await sharp(cover)
  .composite([{ input: logo, left: 92, top: 188 }])
  .png({ compressionLevel: 9 })
  .toFile(join(publicDir, 'og-cover.png'));

await sharp(logo)
  .resize({ width: 180, height: 180, fit: 'contain' })
  .png({ compressionLevel: 9 })
  .toFile(join(publicDir, 'apple-touch-icon.png'));

console.log('Generated public/og-cover.png and public/apple-touch-icon.png');

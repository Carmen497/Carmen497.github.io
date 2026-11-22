// Copia las fuentes de lectura a /public/fonts y genera los iconos PNG de la app.
// Se ejecuta con: npm run assets
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const pub = path.join(root, 'public');
const fontsDir = path.join(pub, 'fonts');
fs.mkdirSync(fontsDir, { recursive: true });

const fonts = [
  { pkg: 'literata', family: 'Literata' },
  { pkg: 'lora', family: 'Lora' },
  { pkg: 'merriweather', family: 'Merriweather' },
  { pkg: 'atkinson-hyperlegible', family: 'Atkinson Hyperlegible' },
  { pkg: 'eb-garamond', family: 'EB Garamond' },
  { pkg: 'nunito', family: 'Nunito' },
  { pkg: 'lexend', family: 'Lexend' },
  { pkg: 'andika', family: 'Andika' },
  { pkg: 'open-sans', family: 'Open Sans' },
  { pkg: 'noto-serif', family: 'Noto Serif' },
  { pkg: 'source-serif-4', family: 'Source Serif 4' },
  { pkg: 'opendyslexic', family: 'OpenDyslexic' },
  { pkg: 'bitter', family: 'Bitter' },
];

let css = '/* Generado por scripts/setup-assets.mjs */\n';
for (const f of fonts) {
  const dir = path.join(root, 'node_modules', '@fontsource', f.pkg, 'files');
  for (const weight of [400, 700]) {
    for (const style of ['normal', 'italic']) {
      const file = `${f.pkg}-latin-${weight}-${style}.woff2`;
      const src = path.join(dir, file);
      if (!fs.existsSync(src)) continue;
      fs.copyFileSync(src, path.join(fontsDir, file));
      css += `@font-face{font-family:'${f.family}';font-style:${style};font-weight:${weight};font-display:swap;src:url('./${file}') format('woff2');}\n`;
    }
  }
}
fs.writeFileSync(path.join(fontsDir, 'fonts.css'), css);
console.log('Fuentes copiadas');

const iconsDir = path.join(pub, 'icons');
fs.mkdirSync(iconsDir, { recursive: true });
const svg = fs.readFileSync(path.join(pub, 'icon.svg'));
const maskable = fs.readFileSync(path.join(pub, 'icon-maskable.svg'));
await sharp(svg).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-192.png'));
await sharp(svg).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-512.png'));
await sharp(maskable).resize(512, 512).png().toFile(path.join(iconsDir, 'maskable-512.png'));
await sharp(svg).resize(180, 180).png().toFile(path.join(iconsDir, 'apple-touch-icon.png'));
console.log('Iconos generados');

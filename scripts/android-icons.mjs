// Genera los iconos del APK (android/app/src/main/res/mipmap-*) a partir de los iconos de la web.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const res = 'android/app/src/main/res';
const D = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [name, k] of Object.entries(D)) {
  const dir = `${res}/mipmap-${name}`;
  mkdirSync(dir, { recursive: true });
  await sharp('public/icons/icon-512.png').resize(Math.round(48 * k)).png().toFile(`${dir}/ic_launcher.png`);
  // Capa delantera del icono adaptativo: 108dp con margen de seguridad (el icono "maskable" ya lo trae)
  await sharp('public/icons/maskable-512.png').resize(Math.round(108 * k)).png().toFile(`${dir}/ic_launcher_foreground.png`);
}
console.log('Iconos de Android generados');

// Dibujo de la biblioteca en vista isométrica (SVG generado).
// Coordenadas del mundo: x hacia abajo-derecha, y hacia abajo-izquierda, z hacia arriba (en píxeles).

import { WALL_H, proj, f1, pt, poly, shade, box, faceX, faceY, floorM, cyl, hashFrac, skyColors, COMMON_DEFS } from './geom.js';
import { wallScene, floorScene, onWalls } from './scenes.js';
export { WALL_H, proj, shade };
const SHELF_H = 128;
export const SHELF_ROWS = 4;
export const SHELF_PER_ROW = 10;

// ---------- Catálogo de objetos ----------
export const CATALOG = [
  { type: 'shelf', label: 'Estantería', w: 2, d: 1, color: '#8a5a3b', colorable: true },
  { type: 'armchair', label: 'Sillón', w: 1, d: 1, color: '#4f7a6b', colorable: true },
  { type: 'sofa', label: 'Sofá', w: 2, d: 1, color: '#6a5a8c', colorable: true },
  { type: 'pouf', label: 'Puf', w: 1, d: 1, color: '#d08a5a', colorable: true },
  { type: 'table', label: 'Mesita con té', w: 1, d: 1 },
  { type: 'lamp', label: 'Lámpara', w: 1, d: 1 },
  { type: 'plant', label: 'Planta', w: 1, d: 1 },
  { type: 'bigplant', label: 'Planta grande', w: 1, d: 1 },
  { type: 'cactus', label: 'Cactus', w: 1, d: 1 },
  { type: 'cat', label: 'Gato', w: 1, d: 1, color: '#e0a15b', colorable: true },
  { type: 'stack', label: 'Pila de libros', w: 1, d: 1 },
  { type: 'fireplace', label: 'Chimenea', w: 2, d: 1 },
  { type: 'rug', label: 'Alfombra', w: 3, d: 2, color: '#b65b48', colorable: true, flat: true },
  { type: 'roundrug', label: 'Alfombra redonda', w: 2, d: 2, color: '#d9b26a', colorable: true, flat: true },
  { type: 'window', label: 'Ventana', wall: true, span: 2 },
  { type: 'painting', label: 'Cuadro', wall: true, span: 1, color: '#6d9a8b', colorable: true },
  { type: 'clock', label: 'Reloj', wall: true, span: 1 },
  { type: 'lights', label: 'Guirnalda de luces', wall: true, span: 3 },
  { type: 'wallshelf', label: 'Balda', wall: true, span: 2, color: '#8a5a3b', colorable: true },
  // ---- De los temas (cada grupo tiene su pestaña en Decorar) ----
  { type: 'balcony', label: 'Balcón con vistas', wall: true, span: 2, group: 'castillo' },
  { type: 'banner', label: 'Estandarte', wall: true, span: 1, color: '#8c2b3a', colorable: true, group: 'castillo' },
  { type: 'tapestry', label: 'Tapiz', wall: true, span: 2, color: '#6a2c3a', colorable: true, group: 'castillo' },
  { type: 'torch', label: 'Antorcha', wall: true, span: 1, group: 'castillo' },
  { type: 'shield', label: 'Escudo y espadas', wall: true, span: 1, color: '#2e4a7a', colorable: true, group: 'castillo' },
  { type: 'armor', label: 'Armadura', w: 1, d: 1, color: '#b23a3a', colorable: true, group: 'castillo' },
  { type: 'barrel', label: 'Barril', w: 1, d: 1, group: 'castillo' },
  { type: 'chest', label: 'Cofre', w: 1, d: 1, color: '#7a4a2a', colorable: true, group: 'castillo' },
  { type: 'candles', label: 'Velas', w: 1, d: 1, group: 'castillo' },
  { type: 'throne', label: 'Trono', w: 1, d: 1, color: '#8c2b3a', colorable: true, group: 'cuento' },
  { type: 'archwindow', label: 'Ventanal', wall: true, span: 2, group: 'cuento' },
  { type: 'mirror', label: 'Espejo', wall: true, span: 1, group: 'cuento' },
  { type: 'candelabra', label: 'Candelabro', wall: true, span: 1, group: 'cuento' },
  { type: 'fountain', label: 'Fuente', w: 1, d: 1, group: 'cuento' },
  { type: 'mushrooms', label: 'Setas', w: 1, d: 1, color: '#d9443a', colorable: true, group: 'naturaleza' },
  { type: 'stump', label: 'Tocón', w: 1, d: 1, group: 'naturaleza' },
  { type: 'fern', label: 'Helecho', w: 1, d: 1, group: 'naturaleza' },
  { type: 'palm', label: 'Palmera', w: 1, d: 1, group: 'naturaleza' },
  { type: 'bench', label: 'Banco de jardín', w: 2, d: 1, group: 'naturaleza' },
  { type: 'vines', label: 'Enredadera', wall: true, span: 3, overlay: true, group: 'naturaleza' },
  { type: 'fireflies', label: 'Luciérnagas', wall: true, span: 3, overlay: true, group: 'naturaleza' },
  { type: 'crystalball', label: 'Bola de cristal', w: 1, d: 1, group: 'magia' },
  { type: 'cauldron', label: 'Caldero', w: 1, d: 1, group: 'magia' },
  { type: 'globe', label: 'Globo terráqueo', w: 1, d: 1, group: 'magia' },
  { type: 'stars', label: 'Estrellas colgantes', wall: true, span: 3, overlay: true, group: 'magia' },
  { type: 'bonsai', label: 'Bonsái', w: 1, d: 1, group: 'zen' },
  { type: 'stonelantern', label: 'Farol de piedra', w: 1, d: 1, group: 'zen' },
  { type: 'woodpile', label: 'Leñera', w: 1, d: 1, group: 'cabana' },
  { type: 'antlers', label: 'Cornamenta', wall: true, span: 1, group: 'cabana' },
  { type: 'paperlanterns', label: 'Farolillos', wall: true, span: 3, overlay: true, group: 'zen' },
  // ---- De temporada (solo se ofrecen en sus fechas; lo ya colocado se queda) ----
  { type: 'xmastree', label: 'Árbol de Navidad', w: 1, d: 1, season: 'navidad' },
  { type: 'gifts', label: 'Regalos', w: 1, d: 1, color: '#c0392b', colorable: true, season: 'navidad' },
  { type: 'snowman', label: 'Muñeco de nieve', w: 1, d: 1, season: 'navidad' },
  { type: 'poinsettia', label: 'Flor de Pascua', w: 1, d: 1, season: 'navidad' },
  { type: 'wreath', label: 'Corona', wall: true, span: 1, season: 'navidad' },
  { type: 'stockings', label: 'Calcetines', wall: true, span: 2, season: 'navidad' },
  { type: 'xmaslights', label: 'Espumillón', wall: true, span: 3, overlay: true, season: 'navidad' },
  { type: 'hearts', label: 'Guirnalda de corazones', wall: true, span: 3, overlay: true, season: 'sanvalentin' },
  { type: 'roses', label: 'Rosas', w: 1, d: 1, season: 'sanvalentin' },
  { type: 'flowervase', label: 'Jarrón de flores', w: 1, d: 1, season: 'primavera' },
  { type: 'flowergarland', label: 'Guirnalda de flores', wall: true, span: 3, overlay: true, season: 'primavera' },
  { type: 'sunflowers', label: 'Girasoles', w: 1, d: 1, season: 'verano' },
  { type: 'bunting', label: 'Banderines', wall: true, span: 3, overlay: true, season: 'verano' },
  { type: 'leafwreath', label: 'Corona de otoño', wall: true, span: 1, season: 'otono' },
  { type: 'leafpile', label: 'Hojas secas', w: 1, d: 1, flat: true, season: 'otono' },
  { type: 'pumpkin', label: 'Calabaza', w: 1, d: 1, season: 'halloween' },
  { type: 'bats', label: 'Murciélagos', wall: true, span: 2, overlay: true, season: 'halloween' },
];

// Temporadas: [mes, día] de inicio y fin (pueden cruzar el cambio de año)
export const SEASONS = {
  navidad: { label: 'Navidad', emoji: '🎄', from: [11, 15], to: [1, 10] },
  sanvalentin: { label: 'San Valentín', emoji: '💗', from: [2, 1], to: [2, 16] },
  primavera: { label: 'Primavera', emoji: '🌷', from: [3, 15], to: [6, 15] },
  verano: { label: 'Verano', emoji: '☀️', from: [6, 16], to: [9, 15] },
  otono: { label: 'Otoño', emoji: '🍂', from: [9, 16], to: [11, 30] },
  halloween: { label: 'Halloween', emoji: '🎃', from: [10, 10], to: [11, 3] },
};
export const GROUPS = { castillo: '🏰 Castillo', cuento: '👑 Cuento', naturaleza: '🌿 Naturaleza', magia: '🔮 Magia', zen: '🏮 Zen', cabana: '🏔️ Cabaña' };
export function activeSeasons(date = new Date()) {
  const v = (date.getMonth() + 1) * 100 + date.getDate();
  return Object.keys(SEASONS).filter((k) => {
    const { from, to } = SEASONS[k];
    const a = from[0] * 100 + from[1], b = to[0] * 100 + to[1];
    return a <= b ? v >= a && v <= b : v >= a || v <= b;
  });
}
export const catalogOf = (type) => CATALOG.find((c) => c.type === type) || {};

export function footprint(it) {
  const c = catalogOf(it.type);
  if (c.wall) return null;
  return it.rot % 2 ? { w: c.d, d: c.w } : { w: c.w, d: c.d };
}

export function canPlace(room, it, x, y, rot = it.rot || 0) {
  const c = catalogOf(it.type);
  const fp = rot % 2 ? { w: c.d, d: c.w } : { w: c.w, d: c.d };
  if (x < 0 || y < 0 || x + fp.w > room.size || y + fp.d > room.size) return false;
  if (c.flat) return true;
  for (const o of room.items) {
    if (o.id === it.id || catalogOf(o.type).wall || catalogOf(o.type).flat) continue;
    const of = footprint(o);
    if (x < o.x + of.w && x + fp.w > o.x && y < o.y + of.d && y + fp.d > o.y) return false;
  }
  return true;
}

export function canPlaceWall(room, it, wall, p) {
  const c = catalogOf(it.type);
  if (p < 0 || p + c.span > room.size) return false;
  for (const o of room.items) {
    if (o.id === it.id || !catalogOf(o.type).wall || o.wall !== wall) continue;
    // La guirnalda cuelga arriba del todo: puede pasar por encima de cuadros, ventanas y relojes
    if (it.type === 'lights' || o.type === 'lights' || catalogOf(it.type).overlay || catalogOf(o.type).overlay) continue;
    const os = catalogOf(o.type).span;
    if (p < o.p + os && p + c.span > o.p) return false;
  }
  return true;
}

// ---------- Objetos ----------
function shelfFace(W, H, c, books) {
  const pad = 4, top = 6, bottom = 6;
  const rowH = (H - top - bottom) / SHELF_ROWS;
  let s = `<rect x="0" y="0" width="${f1(W)}" height="${H}" fill="${shade(c, 0.98)}"/>`;
  s += `<rect x="${pad}" y="${top}" width="${f1(W - pad * 2)}" height="${H - top - bottom}" fill="${shade(c, 0.42)}"/>`;
  const sw = (W - pad * 2 - 2) / SHELF_PER_ROW;
  for (let r = 0; r < SHELF_ROWS; r++) {
    const rowTop = top + r * rowH;
    const baseY = rowTop + rowH - 3;
    const row = books.slice(r * SHELF_PER_ROW, (r + 1) * SHELF_PER_ROW);
    let x = pad + 1;
    row.forEach((b, i) => {
      const fr = hashFrac(b.id);
      const bh = (rowH - 6) * (0.72 + 0.26 * fr);
      const col = b.spineColor || '#7a5a3b';
      s += `<rect x="${f1(x)}" y="${f1(baseY - bh)}" width="${f1(sw - 0.5)}" height="${f1(bh)}" fill="${col}"/>`;
      s += `<rect x="${f1(x)}" y="${f1(baseY - bh + bh * 0.18)}" width="${f1(sw - 0.5)}" height="1.2" fill="${shade(col, 1.5)}" opacity=".7"/>`;
      if (b.status === 'leyendo') s += `<rect x="${f1(x + sw * 0.3)}" y="${f1(baseY - bh - 3)}" width="${f1(sw * 0.4)}" height="5" fill="#e8c35a"/>`;
      x += sw;
      if (i === row.length - 1 && row.length < SHELF_PER_ROW && row.length > 2 && fr > 0.5) {
        // un libro inclinado al final de la fila
        s += `<rect x="${f1(x + 1)}" y="${f1(baseY - bh * 0.8)}" width="${f1(sw - 0.5)}" height="${f1(bh * 0.8)}" fill="${shade(col, 0.8)}" transform="rotate(14 ${f1(x + 1)} ${f1(baseY)})"/>`;
      }
    });
    s += `<rect x="${pad}" y="${f1(baseY)}" width="${f1(W - pad * 2)}" height="3" fill="${shade(c, 1.1)}"/>`;
  }
  return s;
}

function drawShelf(it, books) {
  const c = it.color || '#8a5a3b';
  if (!(it.rot % 2)) {
    const x0 = it.x + 0.05, y0 = it.y + 0.08, w = 1.9, d = 0.42;
    return box(x0, y0, 0, w, d, SHELF_H, c) + `<g transform="${faceY(y0 + d, x0, SHELF_H)}">${shelfFace(w * 32, SHELF_H, c, books)}</g>`;
  }
  const x0 = it.x + 0.08, y0 = it.y + 0.05, w = 0.42, d = 1.9;
  return box(x0, y0, 0, w, d, SHELF_H, c) + `<g transform="${faceX(x0 + w, y0 + d, SHELF_H)}">${shelfFace(d * 32, SHELF_H, c, books)}</g>`;
}

function drawSeat(it, len) {
  const c = it.color || '#4f7a6b';
  const { x, y } = it;
  const L = len - 0.24;
  if (!(it.rot % 2)) {
    return box(x + 0.12, y + 0.18, 0, L, 0.7, 10, shade(c, 0.6))
      + box(x + 0.12, y + 0.1, 10, L, 0.2, 36, c)
      + box(x + 0.12, y + 0.3, 10, 0.15, 0.58, 18, c)
      + box(x + 0.27, y + 0.3, 10, L - 0.3, 0.58, 9, shade(c, 1.08))
      + (len > 1 ? box(x + len / 2 - 0.02, y + 0.3, 19, 0.04, 0.58, 0.5, shade(c, 0.8)) : '')
      + box(x + 0.12 + L - 0.15, y + 0.3, 10, 0.15, 0.58, 18, c);
  }
  return box(x + 0.18, y + 0.12, 0, 0.7, L, 10, shade(c, 0.6))
    + box(x + 0.1, y + 0.12, 10, 0.2, L, 36, c)
    + box(x + 0.3, y + 0.12, 10, 0.58, 0.15, 18, c)
    + box(x + 0.3, y + 0.27, 10, 0.58, L - 0.3, 9, shade(c, 1.08))
    + box(x + 0.3, y + 0.12 + L - 0.15, 10, 0.58, 0.15, 18, c);
}

function drawLamp(it) {
  const cx = it.x + 0.5, cy = it.y + 0.5;
  const [bx, by] = proj(cx, cy, 3);
  const [, ty] = proj(cx, cy, 72);
  let s = cyl(cx, cy, 0, 0.13, 3, '#3a3a3a');
  s += `<line x1="${f1(bx)}" y1="${f1(by)}" x2="${f1(bx)}" y2="${f1(ty)}" stroke="#3a3a3a" stroke-width="2.2"/>`;
  const rb = 0.24 * 45.25, rt = 0.15 * 45.25, top = ty - 20;
  s += `<path d="M${f1(bx - rb)},${f1(ty)} L${f1(bx - rt)},${f1(top)} L${f1(bx + rt)},${f1(top)} L${f1(bx + rb)},${f1(ty)} Z" fill="#f3dfb0"/>`;
  s += `<ellipse cx="${f1(bx)}" cy="${f1(ty)}" rx="${f1(rb)}" ry="${f1(rb / 2)}" fill="#ffe9a8"/>`;
  return s;
}

function leaves(cx, cy, n, len, spread, greens) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = -spread / 2 + (spread * i) / (n - 1 || 1);
    const rad = (a * Math.PI) / 180;
    const lx = cx + Math.sin(rad) * len * 0.55, ly = cy - Math.cos(rad) * len * 0.55;
    s += `<ellipse cx="${f1(lx)}" cy="${f1(ly)}" rx="${f1(len * 0.22)}" ry="${f1(len * 0.55)}" fill="${greens[i % greens.length]}" transform="rotate(${f1(a)} ${f1(lx)} ${f1(ly)})"/>`;
  }
  return s;
}

function drawPlant(it, big) {
  const cx = it.x + 0.5, cy = it.y + 0.5;
  const potH = big ? 24 : 16, r = big ? 0.22 : 0.17;
  let s = cyl(cx, cy, 0, r, potH, big ? '#e7e0d4' : '#c06a45');
  const [bx, by] = proj(cx, cy, potH);
  if (big) {
    s += `<path d="M${bx},${by} q-4,-30 -10,-52 M${bx},${by} q3,-34 8,-60 M${bx},${by} q1,-20 14,-38" stroke="#3d6b3a" stroke-width="2" fill="none"/>`;
    s += leaves(bx - 10, by - 48, 5, 26, 140, ['#4f8a4b', '#3f7a3f', '#5d9a55']);
    s += leaves(bx + 8, by - 58, 5, 28, 140, ['#3f7a3f', '#5d9a55', '#4f8a4b']);
    s += leaves(bx + 13, by - 36, 4, 20, 120, ['#5d9a55', '#4f8a4b']);
  } else {
    s += leaves(bx, by, 7, 22, 150, ['#5d9a55', '#4f8a4b', '#6aab5f', '#3f7a3f']);
  }
  return s;
}

function drawCactus(it) {
  const cx = it.x + 0.5, cy = it.y + 0.5;
  let s = cyl(cx, cy, 0, 0.15, 12, '#d9a06b');
  const [bx, by] = proj(cx, cy, 12);
  s += `<rect x="${f1(bx - 6)}" y="${f1(by - 34)}" width="12" height="34" rx="6" fill="#5f9a5a"/>`;
  s += `<path d="M${f1(bx - 6)},${f1(by - 16)} h-5 a3,3 0 0 1 -3,-3 v-8 a3,3 0 0 1 6,0 v5 h2" fill="#5f9a5a"/>`;
  s += `<path d="M${f1(bx + 6)},${f1(by - 22)} h5 a3,3 0 0 0 3,-3 v-6 a3,3 0 0 0 -6,0 v3 h-2" fill="#5f9a5a"/>`;
  s += `<circle cx="${f1(bx)}" cy="${f1(by - 35)}" r="3" fill="#e86a8a"/>`;
  return s;
}

function drawTable(it) {
  const { x, y } = it;
  let s = box(x + 0.44, y + 0.44, 0, 0.12, 0.12, 16, '#5a3d2b');
  s += box(x + 0.15, y + 0.15, 16, 0.7, 0.7, 4, '#9a6a45');
  s += box(x + 0.48, y + 0.42, 20, 0.26, 0.18, 3, '#8c3b3b');
  s += box(x + 0.5, y + 0.43, 23, 0.22, 0.16, 2.5, '#3f6e8c');
  s += cyl(x + 0.32, y + 0.36, 20, 0.07, 7, '#f2ede4');
  const [cx, cy] = proj(x + 0.32, y + 0.36, 30);
  s += `<path class="steam" d="M${f1(cx)},${f1(cy)} q-3,-5 0,-10 q3,-5 0,-10" stroke="#ffffff" stroke-width="1.4" fill="none" opacity=".6"/>`;
  return s;
}

function drawPouf(it) {
  const c = it.color || '#d08a5a';
  const s = cyl(it.x + 0.5, it.y + 0.5, 0, 0.3, 16, c);
  const [bx, by] = proj(it.x + 0.5, it.y + 0.5, 16);
  return s + `<circle cx="${f1(bx)}" cy="${f1(by)}" r="1.6" fill="${shade(c, 0.7)}"/>`;
}

function drawCat(it) {
  const c = it.color || '#e0a15b';
  const [bx, by] = proj(it.x + 0.5, it.y + 0.5, 0);
  const dir = it.rot % 2 ? -1 : 1;
  const hx = bx - 6 * dir, hy = by - 22;
  return `<g class="cat">
  <ellipse cx="${bx}" cy="${by - 1}" rx="12" ry="4" fill="rgba(0,0,0,.15)"/>
  <path class="cat-tail" d="M${bx + 7 * dir},${by - 3} q${14 * dir},2 ${12 * dir},-14" stroke="${shade(c, 0.85)}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <ellipse cx="${bx}" cy="${by - 10}" rx="9" ry="11" fill="${c}"/>
  <ellipse cx="${bx - 2 * dir}" cy="${by - 7}" rx="5" ry="7" fill="${shade(c, 1.35)}"/>
  <circle cx="${hx}" cy="${hy}" r="7.5" fill="${c}"/>
  <path d="M${hx - 7},${hy - 3} l1,-8 l5,5 Z M${hx + 7},${hy - 3} l-1,-8 l-5,5 Z" fill="${c}"/>
  <circle cx="${hx - 2.6}" cy="${hy - 0.5}" r="1.1" fill="#2a2a2a"/><circle cx="${hx + 2.6}" cy="${hy - 0.5}" r="1.1" fill="#2a2a2a"/>
  <path d="M${hx - 1},${hy + 2.2} l1,1 l1,-1" stroke="#7a4a3a" stroke-width=".8" fill="none"/>
  </g>`;
}

function drawStack(it) {
  const cols = ['#8c3b3b', '#3f6e8c', '#6b7d4a', '#a0773f', '#5d4a7a'];
  let s = '', z = 0;
  for (let i = 0; i < 5; i++) {
    const fr = hashFrac(it.id + i);
    const w = 0.42 + fr * 0.12, d = 0.3 + fr * 0.08, hh = 4 + fr * 2;
    s += box(it.x + 0.5 - w / 2 + (fr - 0.5) * 0.08, it.y + 0.5 - d / 2, z, w, d, hh, cols[i]);
    z += hh;
  }
  return s;
}

function drawFireplace(it, night) {
  const rot = it.rot % 2;
  const stone = '#b9a48e';
  let s;
  const face = (W) => {
    let f = `<rect x="0" y="0" width="${W}" height="70" fill="${shade(stone, 0.95)}"/>`;
    for (let r = 0; r < 7; r++) for (let c = 0; c < 6; c++) f += `<rect x="${(c * W) / 6 + (r % 2 ? 3 : 0)}" y="${r * 10}" width="${W / 6 - 1}" height="9" fill="${shade(stone, 0.85 + ((r * 7 + c * 3) % 5) * 0.05)}"/>`;
    const ox = W / 2 - 18;
    f += `<path d="M${ox},70 v-26 a18,14 0 0 1 36,0 v26 Z" fill="#2a1d17"/>`;
    f += `<rect x="${ox + 6}" y="63" width="24" height="4" rx="2" fill="#6b4a33"/><rect x="${ox + 9}" y="60" width="18" height="4" rx="2" fill="#7a5638"/>`;
    f += `<g class="flames"><path class="flame f1" d="M${ox + 11},62 q-2,-10 5,-18 q-1,8 4,10 q2,-6 0,-10 q8,8 5,18 Z" fill="#f29b38"/>`;
    f += `<path class="flame f2" d="M${ox + 14},62 q0,-7 4,-11 q0,5 3,7 q2,-3 1,-6 q4,6 2,10 Z" fill="#ffd36b"/></g>`;
    return f;
  };
  if (!rot) {
    s = box(it.x + 0.05, it.y + 0.02, 0, 1.9, 0.5, 70, stone) + `<g transform="${faceY(it.y + 0.52, it.x + 0.05, 70)}">${face(60.8)}</g>`;
    s += box(it.x, it.y, 70, 2, 0.62, 6, '#6b4a33');
  } else {
    s = box(it.x + 0.02, it.y + 0.05, 0, 0.5, 1.9, 70, stone) + `<g transform="${faceX(it.x + 0.52, it.y + 1.95, 70)}">${face(60.8)}</g>`;
    s += box(it.x, it.y, 70, 0.62, 2, 6, '#6b4a33');
  }
  return s;
}

function drawRug(it) {
  const c = it.color || '#b65b48';
  const fp = footprint(it);
  const W = fp.w * 32, D = fp.d * 32;
  let s = `<g transform="${floorM(it.x, it.y, 0.5)}">`;
  if (it.type === 'roundrug') {
    s += `<ellipse cx="${W / 2}" cy="${D / 2}" rx="${W / 2 - 3}" ry="${D / 2 - 3}" fill="${c}"/>`;
    s += `<ellipse cx="${W / 2}" cy="${D / 2}" rx="${W / 2 - 9}" ry="${D / 2 - 9}" fill="none" stroke="${shade(c, 1.35)}" stroke-width="2.5" stroke-dasharray="5 3"/>`;
    s += `<ellipse cx="${W / 2}" cy="${D / 2}" rx="${W / 4}" ry="${D / 4}" fill="${shade(c, 0.85)}"/>`;
  } else {
    s += `<rect x="4" y="4" width="${W - 8}" height="${D - 8}" rx="3" fill="${c}"/>`;
    s += `<rect x="10" y="10" width="${W - 20}" height="${D - 20}" rx="2" fill="none" stroke="${shade(c, 1.4)}" stroke-width="2"/>`;
    const cx = W / 2, cy = D / 2;
    s += `<path d="M${cx},${cy - 14} L${cx + 18},${cy} L${cx},${cy + 14} L${cx - 18},${cy} Z" fill="${shade(c, 0.8)}" stroke="${shade(c, 1.4)}" stroke-width="1.5"/>`;
    for (let i = 8; i < W - 6; i += 5) s += `<line x1="${i}" y1="1" x2="${i}" y2="4" stroke="${shade(c, 1.3)}"/><line x1="${i}" y1="${D - 4}" x2="${i}" y2="${D - 1}" stroke="${shade(c, 1.3)}"/>`;
  }
  return s + '</g>';
}

// ---------- Objetos de pared ----------

function drawWallItem(it) {
  const c = catalogOf(it.type);
  const W = c.span * 32;
  let s = '';
  if (it.type === 'window') {
    const [a, b] = skyColors(new Date().getHours());
    const night = a === '#1c2448';
    s += `<defs><linearGradient id="sky-${it.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`;
    s += `<rect x="8" y="0" width="${W - 16}" height="66" fill="#f7efe2"/>`;
    s += `<rect x="12" y="4" width="${W - 24}" height="58" fill="url(#sky-${it.id})"/>`;
    if (night) s += `<circle cx="${W - 24}" cy="16" r="5" fill="#f4ecc8"/><circle cx="${W - 22}" cy="15" r="4.5" fill="${a}"/><circle cx="22" cy="12" r=".9" fill="#fff"/><circle cx="34" cy="22" r=".7" fill="#fff"/><circle cx="${W - 34}" cy="34" r=".8" fill="#fff"/>`;
    else s += `<circle cx="${W - 22}" cy="18" r="6" fill="#fff6c8" opacity=".9"/><ellipse cx="26" cy="30" rx="9" ry="3.5" fill="#fff" opacity=".8"/>`;
    s += `<path d="M12,${62} q${(W - 24) / 4},-14 ${(W - 24) / 2},-6 q${(W - 24) / 4},8 ${(W - 24) / 2},-8 v14 Z" fill="${night ? '#24304f' : '#7fae7a'}"/>`;
    s += `<rect x="${W / 2 - 1.5}" y="4" width="3" height="58" fill="#f7efe2"/><rect x="12" y="31" width="${W - 24}" height="3" fill="#f7efe2"/>`;
    s += `<rect x="4" y="64" width="${W - 8}" height="5" fill="#e6d9c3"/>`;
    s += `<path d="M2,-4 h12 v74 q-6,-10 -12,0 Z" fill="#c25b4a" opacity=".92"/><path d="M${W - 2},-4 h-12 v74 q6,-10 12,0 Z" fill="#c25b4a" opacity=".92"/>`;
    s += `<rect x="0" y="-6" width="${W}" height="3" rx="1.5" fill="#6b4a33"/>`;
  } else if (it.type === 'painting') {
    const col = it.color || '#6d9a8b';
    s += `<rect x="4" y="0" width="${W - 8}" height="34" fill="#b08a4a"/><rect x="7" y="3" width="${W - 14}" height="28" fill="${shade(col, 1.5)}"/>`;
    s += `<circle cx="${W - 12}" cy="11" r="3.5" fill="#f2c94c"/>`;
    s += `<path d="M7,31 L13,18 L19,26 L23,20 L${W - 7},31 Z" fill="${col}"/><path d="M7,31 L16,24 L${W - 7},31 Z" fill="${shade(col, 0.7)}"/>`;
  } else if (it.type === 'clock') {
    const d = new Date();
    const ha = ((d.getHours() % 12) + d.getMinutes() / 60) * 30, ma = d.getMinutes() * 6;
    s += `<circle cx="16" cy="16" r="12" fill="#6b4a33"/><circle cx="16" cy="16" r="10" fill="#f7efe2"/>`;
    for (let i = 0; i < 12; i++) { const a = (i * 30 * Math.PI) / 180; s += `<line x1="${f1(16 + Math.sin(a) * 8)}" y1="${f1(16 - Math.cos(a) * 8)}" x2="${f1(16 + Math.sin(a) * 9.3)}" y2="${f1(16 - Math.cos(a) * 9.3)}" stroke="#6b4a33" stroke-width="${i % 3 ? 0.6 : 1.2}"/>`; }
    s += `<line x1="16" y1="16" x2="16" y2="10.5" stroke="#2a2a2a" stroke-width="1.6" stroke-linecap="round" transform="rotate(${f1(ha)} 16 16)"/>`;
    s += `<line x1="16" y1="16" x2="16" y2="8" stroke="#2a2a2a" stroke-width="1" stroke-linecap="round" transform="rotate(${f1(ma)} 16 16)"/>`;
    s += `<circle cx="16" cy="16" r="1" fill="#c25b4a"/>`;
  } else if (it.type === 'lights') {
    s += `<path d="M0,0 Q${W / 4},16 ${W / 2},2 Q${(3 * W) / 4},16 ${W},0" stroke="#4a3a2a" stroke-width="0.8" fill="none"/>`;
    const cols = ['#ffd36b', '#ff9b7a', '#9be0ff', '#c3f59a'];
    for (let i = 1; i < 12; i++) {
      const t = i / 12, seg = t < 0.5 ? t * 2 : (t - 0.5) * 2;
      const x = t * W, y = 4 * seg * (1 - seg) * 14 + 1;
      s += `<circle class="twinkle t${i % 3}" cx="${f1(x)}" cy="${f1(y + 3)}" r="2.2" fill="${cols[i % 4]}"/>`;
    }
  } else if (it.type === 'wreath' || it.type === 'leafwreath') {
    const autumn = it.type === 'leafwreath';
    const cols = autumn ? ['#c0602a', '#d9912f', '#8c3b2a', '#b5752b'] : ['#2f6b3a', '#3d8a4a', '#27583a'];
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; s += `<ellipse cx="${f1(16 + Math.cos(a) * 10)}" cy="${f1(18 + Math.sin(a) * 10)}" rx="4.5" ry="2.6" fill="${cols[i % cols.length]}" transform="rotate(${f1((a * 180) / Math.PI + 90)} ${f1(16 + Math.cos(a) * 10)} ${f1(18 + Math.sin(a) * 10)})"/>`; }
    const dots = autumn ? '#7a3a1f' : '#d63a3a';
    for (const a of [0.3, 1.4, 2.6, 3.7, 4.8, 5.8]) s += `<circle cx="${f1(16 + Math.cos(a) * 10)}" cy="${f1(18 + Math.sin(a) * 10)}" r="1.8" fill="${dots}"/>`;
    s += autumn ? `<circle cx="16" cy="28" r="3" fill="#e0a040"/>` : `<path d="M16,28 l-6,-4 v8 Z M16,28 l6,-4 v8 Z" fill="#c62828"/><circle cx="16" cy="28" r="2" fill="#e04848"/>`;
  } else if (it.type === 'stockings') {
    s += `<rect x="2" y="0" width="${W - 4}" height="2.5" rx="1.2" fill="#6b4a33"/>`;
    const cols = ['#c62828', '#2e7d4f', '#c62828'];
    for (let i = 0; i < 3; i++) {
      const x = 10 + i * 19;
      s += `<path d="M${x},3 h9 v14 q0,6 -6,6 h-7 q-3,0 -3,-3 q0,-3 3,-3 h4 Z" fill="${cols[i]}"/><rect x="${x - 1}" y="2" width="11" height="5" rx="2" fill="#f5f0e6"/>`;
    }
  } else if (it.type === 'xmaslights') {
    s += `<path d="M0,0 Q${W / 4},14 ${W / 2},2 Q${(3 * W) / 4},14 ${W},0" stroke="#d4af37" stroke-width="3" stroke-dasharray="2 1.5" fill="none" opacity=".9"/>`;
    s += `<path d="M0,2 Q${W / 4},16 ${W / 2},4 Q${(3 * W) / 4},16 ${W},2" stroke="#c62828" stroke-width="2" stroke-dasharray="1.5 1.5" fill="none" opacity=".85"/>`;
    for (let i = 1; i < 6; i++) { const t = i / 6, seg = t < 0.5 ? t * 2 : (t - 0.5) * 2; s += `<circle cx="${f1(t * W)}" cy="${f1(4 * seg * (1 - seg) * 12 + 6)}" r="2.6" fill="${['#d63a3a', '#d4af37', '#3a7ad6'][i % 3]}"/>`; }
  } else if (it.type === 'hearts' || it.type === 'flowergarland' || it.type === 'bunting') {
    s += `<path d="M0,0 Q${W / 4},14 ${W / 2},2 Q${(3 * W) / 4},14 ${W},0" stroke="#7a6a5a" stroke-width="0.8" fill="none"/>`;
    const n = 9;
    for (let i = 1; i < n; i++) {
      const t = i / n, seg = t < 0.5 ? t * 2 : (t - 0.5) * 2;
      const x = f1(t * W), y = f1(4 * seg * (1 - seg) * 12 + 1);
      if (it.type === 'hearts') s += `<path transform="translate(${x},${y})" d="M0,3 C0,0 -4.5,0 -4.5,3 C-4.5,5.5 0,7.5 0,9 C0,7.5 4.5,5.5 4.5,3 C4.5,0 0,0 0,3Z" fill="${['#e0446a', '#f28aa8', '#c2185b'][i % 3]}"/>`;
      else if (it.type === 'bunting') s += `<path transform="translate(${x},${y})" d="M-4,0 L4,0 L0,9 Z" fill="${['#e8564a', '#f2c94c', '#4aa3df', '#6fbf73'][i % 4]}"/>`;
      else { const c = ['#f28aa8', '#f7d154', '#b39ddb', '#ffffff'][i % 4]; s += `<g transform="translate(${x},${f1(+y + 3)})">${[0, 72, 144, 216, 288].map((a) => `<circle cx="${f1(Math.cos((a * Math.PI) / 180) * 2.4)}" cy="${f1(Math.sin((a * Math.PI) / 180) * 2.4)}" r="1.9" fill="${c}"/>`).join('')}<circle r="1.3" fill="#f2a93b"/></g>`; }
    }
  } else if (it.type === 'bats') {
    const bat = (x, y, k) => `<path transform="translate(${x},${y}) scale(${k})" d="M0,2 q-3,-4 -8,-3 q2,2 1,4 q3,-1 4,1 q1,-2 3,-2 q2,0 3,2 q1,-2 4,-1 q-1,-2 1,-4 q-5,-1 -8,3 Z" fill="#2a2333"/>`;
    s += bat(14, 6, 1) + bat(34, 16, 0.8) + bat(52, 4, 1.1) + bat(26, 28, 0.7);
  } else if (it.type === 'wallshelf') {
    const col = it.color || '#8a5a3b';
    const bc = ['#8c3b3b', '#3f6e8c', '#6b7d4a', '#a0773f', '#5d4a7a', '#2f5d50'];
    let x = 8;
    for (let i = 0; i < 6; i++) { const hh = 14 + (i * 7) % 6; s += `<rect x="${x}" y="${20 - hh}" width="4.5" height="${hh}" fill="${bc[i]}"/>`; x += 5; }
    s += `<path d="M${W - 18},20 h8 v-6 a4,4 0 0 0 -8,0 Z" fill="#c06a45"/>` + leaves(W - 14, 13, 5, 12, 140, ['#5d9a55', '#4f8a4b']);
    s += `<rect x="2" y="20" width="${W - 4}" height="4" fill="${col}"/><rect x="2" y="24" width="${W - 4}" height="1.5" fill="${shade(col, 0.6)}"/>`;
  } else s += themeWallItem(it, W);
  return s;
}

const WALL_ITEM_Z = { window: 140, painting: 120, clock: 135, lights: 160, wallshelf: 105, wreath: 130, leafwreath: 130, stockings: 75, xmaslights: 162, hearts: 160, flowergarland: 160, bunting: 162, bats: 155,
  balcony: 150, antlers: 135, banner: 150, tapestry: 152, torch: 125, shield: 135, archwindow: 160, mirror: 132, candelabra: 120, vines: 168, fireflies: 150, stars: 166, paperlanterns: 166 };

function wallTransform(it) {
  const c = catalogOf(it.type);
  const z = WALL_ITEM_Z[it.type] || 120;
  return it.wall === 'a' ? faceX(0.02, it.p + c.span, z) : faceY(0.02, it.p, z);
}

// ---------- Suelo y paredes ----------
const FLOORS = {
  wood: ['#c89b6d', '#bf9163'],
  darkwood: ['#8a5f42', '#7f563b'],
  tiles: ['#e8e1d6', '#cfc5b6'],
  green: ['#8fa883', '#86a07a'],
  rose: ['#d9a7a0', '#d19c95'],
  flagstone: ['#a39a8d', '#6f685f'],
  moss: ['#7f9f62', '#6c8c52'],
  checker: ['#f6eaf0', '#d9b3cf'],
  marble: ['#efebe4', '#3e3a40'],
  terracotta: ['#c8785a', '#a65f46'],
  tatami: ['#cfc98f', '#55623a'],
  nightstone: ['#353a5e', '#1d2038'],
};
export const FLOOR_OPTIONS = [
  { id: 'wood', label: 'Madera clara' }, { id: 'darkwood', label: 'Madera oscura' },
  { id: 'tiles', label: 'Baldosas' }, { id: 'green', label: 'Moqueta verde' }, { id: 'rose', label: 'Moqueta rosa' },
  { id: 'flagstone', label: 'Losas de piedra' }, { id: 'moss', label: 'Musgo' }, { id: 'checker', label: 'Ajedrez rosa' },
  { id: 'marble', label: 'Mármol blanco y negro' }, { id: 'terracotta', label: 'Barro cocido' }, { id: 'tatami', label: 'Tatami' }, { id: 'nightstone', label: 'Piedra azul noche' },
];
export const WALL_STYLES = [
  { id: 'plain', label: 'Lisa' }, { id: 'stone', label: 'Piedra de castillo' }, { id: 'timber', label: 'Taberna (vigas)' }, { id: 'logs', label: 'Troncos' },
  { id: 'wainscot', label: 'Victoriana' }, { id: 'stripes', label: 'Palacio rosa y dorado' }, { id: 'leaves', label: 'Bosque (al aire libre)' },
  { id: 'glass', label: 'Invernadero de cristal' }, { id: 'wind', label: 'Arcos abiertos al cielo' }, { id: 'stars', label: 'Torre de piedra' }, { id: 'shoji', label: 'Japonesa (shoji)' },
];
export const WALL_OPTIONS = ['#e9d8c0', '#d6c2a8', '#c9d6c3', '#c8d4e0', '#e8c9c0', '#d9d0e6', '#5b4a63', '#3e4a5a'];

const shellCache = new Map();
function drawRoomShell(room, edit, uid = '', night = false) {
  const key = [room.size, room.wall, room.wallStyle, room.floor, edit, uid, night, new Date().getHours()].join('|');
  if (shellCache.has(key)) return shellCache.get(key);
  if (shellCache.size > 30) shellCache.clear();
  const out = buildShell(room, edit, uid, night);
  shellCache.set(key, out);
  return out;
}
function buildShell(room, edit, uid, night) {
  const N = room.size, W = N * 32;
  const [fa, fb] = FLOORS[room.floor] || FLOORS.wood;
  const wall = room.wall || '#e9d8c0';
  const sc = wallScene(room, N, uid, night);
  const fl = floorScene(room, N, uid, fa, fb, night);
  let s = `<defs>${sc.defs || ''}${fl.defs || ''}</defs>` + (sc.bg || '');
  if (!sc.hideWalls) {
    s += poly([[0, 0, 0], [0, N, 0], [0, N, WALL_H], [0, 0, WALL_H]], `fill="${shade(wall, 0.9)}" data-wall="a"`);
    s += poly([[0, 0, 0], [N, 0, 0], [N, 0, WALL_H], [0, 0, WALL_H]], `fill="${wall}" data-wall="b"`);
    s += sc.walls || '';
    // Luz: más clara arriba, más oscura abajo y en la esquina; la pared izquierda un poco en sombra
    s += onWalls(N, (id) => `<rect width="${W}" height="${WALL_H}" fill="url(#wl)"/><rect width="70" height="${WALL_H}" fill="url(#wc)"/>${id === 'a' ? `<rect width="${W}" height="${WALL_H}" fill="#0b0a14" opacity=".12"/>` : ''}`);
    const cap = sc.cap || wall;
    s += poly([[0, 0, WALL_H], [N, 0, WALL_H], [N, -0.25, WALL_H], [-0.25, -0.25, WALL_H], [-0.25, N, WALL_H], [0, N, WALL_H]], `fill="${shade(cap, 0.75)}"`);
    s += poly([[0, N, 0], [0, N, WALL_H], [-0.25, N, WALL_H], [-0.25, N, 0]], `fill="${shade(cap, 0.6)}"`);
    s += poly([[N, 0, 0], [N, 0, WALL_H], [N, -0.25, WALL_H], [N, -0.25, 0]], `fill="${shade(cap, 0.65)}"`);
    if (!sc.noBaseboard) {
      s += poly([[0, 0, 0], [0, N, 0], [0, N, 9], [0, 0, 9]], `fill="${shade(wall, 0.62)}"`);
      s += poly([[0, 0, 0], [N, 0, 0], [N, 0, 9], [0, 0, 9]], `fill="${shade(wall, 0.7)}"`);
    }
  }
  // Suelo
  s += poly([[0, 0, 0], [N, 0, 0], [N, N, 0], [0, N, 0]], `fill="${fa}" data-floor="1"`);
  s += `<g pointer-events="none"><g transform="${floorM(0, 0, 0)}"><svg width="${W}" height="${W}" overflow="hidden">${fl.local}</svg></g>${fl.screen || ''}</g>`;
  s += fl.edge || (poly([[0, N, 0], [N, N, 0], [N, N, -14], [0, N, -14]], `fill="${shade(fa, 0.7)}"`) + poly([[N, 0, 0], [N, N, 0], [N, N, -14], [N, 0, -14]], `fill="${shade(fa, 0.55)}"`));
  if (edit) {
    let g = '';
    for (let i = 0; i <= N; i++) {
      g += `<line x1="${pt(i, 0, 0).split(',')[0]}" y1="${pt(i, 0, 0).split(',')[1]}" x2="${pt(i, N, 0).split(',')[0]}" y2="${pt(i, N, 0).split(',')[1]}"/>`;
      g += `<line x1="${pt(0, i, 0).split(',')[0]}" y1="${pt(0, i, 0).split(',')[1]}" x2="${pt(N, i, 0).split(',')[0]}" y2="${pt(N, i, 0).split(',')[1]}"/>`;
    }
    s += `<g class="grid" pointer-events="none">${g}</g>`;
  }
  s += `<g pointer-events="none">${sc.back3d || ''}</g>`;
  return { shell: s, fore: sc.fore || '', lights: sc.lights || '' };
}

function drawFloorItem(it, books, night) {
  switch (it.type) {
    case 'shelf': return drawShelf(it, books);
    case 'armchair': return drawSeat(it, 1);
    case 'sofa': return drawSeat(it, 2);
    case 'lamp': return drawLamp(it);
    case 'plant': return drawPlant(it, false);
    case 'bigplant': return drawPlant(it, true);
    case 'cactus': return drawCactus(it);
    case 'table': return drawTable(it);
    case 'pouf': return drawPouf(it);
    case 'cat': return drawCat(it);
    case 'stack': return drawStack(it);
    case 'fireplace': return drawFireplace(it, night);
    case 'xmastree': return drawXmasTree(it);
    case 'gifts': return drawGifts(it);
    case 'snowman': return drawSnowman(it);
    case 'poinsettia': return drawPotFlowers(it, 'poinsettia');
    case 'roses': return drawPotFlowers(it, 'roses');
    case 'flowervase': return drawPotFlowers(it, 'vase');
    case 'sunflowers': return drawPotFlowers(it, 'sunflowers');
    case 'pumpkin': return drawPumpkin(it, night);
    case 'armor': return drawArmor(it);
    case 'barrel': return drawBarrel(it);
    case 'chest': return drawChest(it);
    case 'candles': return drawCandles(it);
    case 'mushrooms': return drawMushrooms(it);
    case 'stump': return drawStump(it);
    case 'throne': return drawThrone(it);
    case 'palm': return drawPalm(it);
    case 'fern': return drawFern(it);
    case 'bench': return drawBench(it);
    case 'fountain': return drawFountain(it);
    case 'globe': return drawGlobe(it);
    case 'crystalball': return drawCrystalBall(it);
    case 'cauldron': return drawCauldron(it);
    case 'bonsai': return drawBonsai(it);
    case 'stonelantern': return drawStoneLantern(it);
    case 'woodpile': return drawWoodpile(it);
  }
  return '';
}

// ---------- Decoración de temporada ----------
function drawXmasTree(it) {
  const cx = it.x + 0.5, cy = it.y + 0.5;
  let s = cyl(cx, cy, 0, 0.16, 10, '#b23a3a');
  const [bx, by] = proj(cx, cy, 10);
  s += `<rect x="${f1(bx - 3)}" y="${f1(by - 8)}" width="6" height="8" fill="#6b4a33"/>`;
  const layers = [[26, 8, 30], [21, 26, 26], [15, 42, 22]]; // [semiancho, altura base, alto]
  for (const [w, z, hh] of layers) s += `<path d="M${f1(bx - w)},${f1(by - z)} L${f1(bx)},${f1(by - z - hh)} L${f1(bx + w)},${f1(by - z)} Q${f1(bx)},${f1(by - z + 5)} ${f1(bx - w)},${f1(by - z)} Z" fill="#2f6b3a"/><path d="M${f1(bx)},${f1(by - z - hh)} L${f1(bx + w)},${f1(by - z)} Q${f1(bx + w / 2)},${f1(by - z + 3)} ${f1(bx)},${f1(by - z + 2.5)} Z" fill="#27583a"/>`;
  const balls = [[-14, 12, '#d63a3a'], [10, 14, '#d4af37'], [-4, 22, '#3a7ad6'], [14, 30, '#d63a3a'], [-12, 32, '#d4af37'], [3, 40, '#e8e8f0'], [-7, 48, '#d63a3a'], [7, 52, '#3a7ad6']];
  balls.forEach(([dx, dz, c], i) => { s += `<circle class="twinkle t${i % 3}" cx="${f1(bx + dx)}" cy="${f1(by - dz)}" r="2.4" fill="${c}"/>`; });
  const ty = by - 68;
  s += `<path d="M${f1(bx)},${f1(ty - 6)} l1.8,4 4.3,.4 -3.3,2.8 1,4.2 -3.8,-2.3 -3.8,2.3 1,-4.2 -3.3,-2.8 4.3,-.4 Z" fill="#f2c94c"/>`;
  return s;
}

function drawGifts(it) {
  const col = it.color || '#c0392b';
  const g = (x0, y0, w, d, hh, c, rib) => box(x0, y0, 0, w, d, hh, c) + box(x0 + w / 2 - 0.035, y0 - 0.005, 0, 0.07, d + 0.01, hh + 0.4, rib) + box(x0 - 0.005, y0 + d / 2 - 0.035, 0, w + 0.01, 0.07, hh + 0.4, rib);
  return g(it.x + 0.12, it.y + 0.1, 0.5, 0.5, 18, col, '#f2c94c') + g(it.x + 0.55, it.y + 0.5, 0.36, 0.36, 12, '#2e7d4f', '#f5f0e6') + g(it.x + 0.12, it.y + 0.62, 0.3, 0.3, 9, '#3f6e8c', '#e8564a');
}

function drawSnowman(it) {
  const cx = it.x + 0.5, cy = it.y + 0.5;
  const [bx, by] = proj(cx, cy, 0);
  let s = `<ellipse cx="${f1(bx)}" cy="${f1(by)}" rx="15" ry="6" fill="#000" opacity=".12"/>`;
  s += `<circle cx="${f1(bx)}" cy="${f1(by - 11)}" r="12" fill="#f4f6fa"/><circle cx="${f1(bx)}" cy="${f1(by - 28)}" r="9" fill="#fbfcff"/><circle cx="${f1(bx)}" cy="${f1(by - 42)}" r="7" fill="#ffffff"/>`;
  s += `<path d="M${f1(bx + 6)},${f1(by - 13)} a12,12 0 0 1 -12,10" stroke="#d8dee8" stroke-width="3" fill="none"/>`;
  s += `<path d="M${f1(bx - 9)},${f1(by - 35)} h18 v4 h-18 Z M${f1(bx + 5)},${f1(by - 33)} l3,10 h-4 Z" fill="#c62828"/>`;
  s += `<circle cx="${f1(bx - 2.5)}" cy="${f1(by - 44)}" r="1" fill="#2a2a2a"/><circle cx="${f1(bx + 2.5)}" cy="${f1(by - 44)}" r="1" fill="#2a2a2a"/><path d="M${f1(bx)},${f1(by - 42)} l7,1.5 -7,1 Z" fill="#f08a24"/>`;
  s += `<circle cx="${f1(bx)}" cy="${f1(by - 27)}" r="1.2" fill="#2a2a2a"/><circle cx="${f1(bx)}" cy="${f1(by - 23)}" r="1.2" fill="#2a2a2a"/>`;
  s += `<rect x="${f1(bx - 8)}" y="${f1(by - 50)}" width="16" height="2.5" fill="#2a2a2a"/><rect x="${f1(bx - 5)}" y="${f1(by - 60)}" width="10" height="10" fill="#2a2a2a"/><rect x="${f1(bx - 5)}" y="${f1(by - 53)}" width="10" height="2" fill="#c62828"/>`;
  return s;
}

function drawPotFlowers(it, kind) {
  const cx = it.x + 0.5, cy = it.y + 0.5;
  const vase = kind === 'vase';
  let s = vase ? cyl(cx, cy, 0, 0.12, 22, '#7fa7c9') : cyl(cx, cy, 0, 0.15, 12, kind === 'poinsettia' ? '#d4af37' : '#c06a45');
  const [bx, by] = proj(cx, cy, vase ? 22 : 12);
  if (kind === 'poinsettia') {
    s += leaves(bx, by, 7, 22, 200, ['#2f6b3a', '#3d8a4a']);
    s += leaves(bx, by - 6, 6, 18, 170, ['#d32f2f', '#e53935', '#c62828']);
    s += `<circle cx="${f1(bx)}" cy="${f1(by - 12)}" r="2.2" fill="#f2c94c"/>`;
    return s;
  }
  const heads = kind === 'sunflowers'
    ? [[-9, 40], [4, 48], [11, 34]]
    : [[-8, 26], [0, 34], [8, 28], [-3, 20], [5, 22]];
  for (const [dx, hh] of heads) s += `<path d="M${f1(bx)},${f1(by)} Q${f1(bx + dx / 2)},${f1(by - hh / 2)} ${f1(bx + dx)},${f1(by - hh)}" stroke="#4f8a4b" stroke-width="1.6" fill="none"/>`;
  s += leaves(bx, by, 4, 12, 120, ['#5d9a55', '#4f8a4b']);
  heads.forEach(([dx, hh], i) => {
    const x = bx + dx, y = by - hh;
    if (kind === 'sunflowers') s += [0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<ellipse cx="${f1(x + Math.cos((a * Math.PI) / 180) * 5)}" cy="${f1(y + Math.sin((a * Math.PI) / 180) * 5)}" rx="3" ry="1.6" fill="#f7c531" transform="rotate(${a} ${f1(x + Math.cos((a * Math.PI) / 180) * 5)} ${f1(y + Math.sin((a * Math.PI) / 180) * 5)})"/>`).join('') + `<circle cx="${f1(x)}" cy="${f1(y)}" r="3.4" fill="#6b4226"/>`;
    else if (kind === 'roses') s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="4" fill="${['#c2185b', '#e0446a', '#ad1457'][i % 3]}"/><path d="M${f1(x - 2)},${f1(y)} a2,2 0 1 1 4,0" stroke="#7a0f3a" stroke-width=".8" fill="none"/>`;
    else s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="3.6" fill="${['#f28aa8', '#f7d154', '#b39ddb', '#ffffff', '#ff8a65'][i % 5]}"/><circle cx="${f1(x)}" cy="${f1(y)}" r="1.3" fill="#f2a93b"/>`;
  });
  return s;
}

function drawPumpkin(it, night) {
  const cx = it.x + 0.5, cy = it.y + 0.5;
  const [bx, by] = proj(cx, cy, 0);
  let s = `<ellipse cx="${f1(bx)}" cy="${f1(by)}" rx="16" ry="6" fill="#000" opacity=".12"/>`;
  for (const [dx, rx, c] of [[-7, 9, '#d9661f'], [7, 9, '#d9661f'], [0, 10, '#ef7d2a']]) s += `<ellipse cx="${f1(bx + dx)}" cy="${f1(by - 11)}" rx="${rx}" ry="11" fill="${c}"/>`;
  s += `<path d="M${f1(bx)},${f1(by - 21)} q1,-6 4,-7" stroke="#4f6b2a" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  const face = night ? '#ffd27a' : '#5a2a0a';
  s += `<path d="M${f1(bx - 6)},${f1(by - 14)} l2.5,-4 2.5,4 Z M${f1(bx + 1)},${f1(by - 14)} l2.5,-4 2.5,4 Z M${f1(bx - 6)},${f1(by - 8)} q6,5 12,0 l-2,1 -2,-1.5 -2,1.5 -2,-1.5 -2,1.5 Z" fill="${face}"/>`;
  return s;
}

function drawLeafPile(it) {
  let s = '';
  const cols = ['#c0602a', '#d9912f', '#8c3b2a', '#e0b040', '#a0522d'];
  for (let i = 0; i < 26; i++) {
    const fx = it.x + 0.15 + hashFrac(it.id + 'x' + i) * 0.7, fy = it.y + 0.15 + hashFrac(it.id + 'y' + i) * 0.7;
    const [x, y] = proj(fx, fy, 1 + hashFrac(it.id + 'z' + i) * 4);
    s += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="4" ry="2" fill="${cols[i % cols.length]}" transform="rotate(${Math.round(hashFrac(it.id + 'r' + i) * 180)} ${f1(x)} ${f1(y)})"/>`;
  }
  return s;
}

// Dibujo suelto de un objeto (para el catálogo de decoración)
export function itemPreview(type, color) {
  const c = catalogOf(type);
  const it = { id: 'prev-' + type, type, x: 0, y: 0, rot: 0, wall: 'b', p: 0, color: color || c.color };
  if (c.wall) return `<g transform="${faceY(0, 0, 0)}">${drawWallItem(it)}</g>`;
  if (c.flat) return it.type === 'leafpile' ? drawLeafPile(it) : drawRug(it);
  const fake = type === 'shelf'
    ? Array.from({ length: 26 }, (_, i) => ({ id: 'p' + i, spineColor: ['#8c3b3b', '#3f6e8c', '#6b7d4a', '#a0773f', '#5d4a7a'][i % 5] }))
    : [];
  return drawFloorItem(it, fake, false);
}

// ---------- Escena completa ----------
export function renderRoom(room, booksByShelf, { edit = false, selectedId = null, night = false, labels = true, uid = '' } = {}) {
  const N = room.size;
  let s = `<defs>
    <radialGradient id="glow"><stop offset="0" stop-color="#ffd27a" stop-opacity=".32"/><stop offset=".5" stop-color="#ffb84d" stop-opacity=".08"/><stop offset="1" stop-color="#ffb84d" stop-opacity="0"/></radialGradient>
    <radialGradient id="fireglow"><stop offset="0" stop-color="#ff9a3c" stop-opacity=".3"/><stop offset="1" stop-color="#ff7a2c" stop-opacity="0"/></radialGradient>
  </defs>`;
  s = s.replace('</defs>', COMMON_DEFS + '</defs>');
  const shell = drawRoomShell(room, edit, uid, night);
  s += shell.shell;

  const items = room.items;
  // Objetos de pared
  for (const it of items.filter((i) => catalogOf(i.type).wall)) {
    // Zona invisible para poder tocarlo con el dedo aunque el dibujo sea fino (la guirnalda)
    const W = catalogOf(it.type).span * 32;
    s += `<g class="item ${it.id === selectedId ? 'selected' : ''}" data-id="${it.id}"><g transform="${wallTransform(it)}"><rect x="0" y="-8" width="${W}" height="${it.type === 'lights' || catalogOf(it.type).overlay ? 34 : 24}" fill="#fff" fill-opacity="0"/>${drawWallItem(it)}</g></g>`;
  }
  // Alfombras
  for (const it of items.filter((i) => catalogOf(i.type).flat)) {
    s += `<g class="item ${it.id === selectedId ? 'selected' : ''}" data-id="${it.id}">${it.type === 'leafpile' ? drawLeafPile(it) : drawRug(it)}</g>`;
  }
  // Huella del seleccionado
  if (edit && selectedId) {
    const it = items.find((i) => i.id === selectedId);
    const fp = it && footprint(it);
    if (fp) s += poly([[it.x, it.y, 1], [it.x + fp.w, it.y, 1], [it.x + fp.w, it.y + fp.d, 1], [it.x, it.y + fp.d, 1]], 'class="footprint" pointer-events="none"');
  }
  // Muebles ordenados de atrás hacia delante
  const floorItems = items.filter((i) => !catalogOf(i.type).wall && !catalogOf(i.type).flat);
  floorItems.sort((a, b) => {
    const fa = footprint(a), fb = footprint(b);
    return (a.x + a.y + (fa.w + fa.d) / 2) - (b.x + b.y + (fb.w + fb.d) / 2);
  });
  // Sombra suave bajo cada mueble
  for (const it of floorItems) {
    const fp = footprint(it);
    s += `<g transform="${floorM(it.x, it.y, 0)}" pointer-events="none"><ellipse cx="${fp.w * 16 + 3}" cy="${fp.d * 16 + 3}" rx="${fp.w * 16 + 6}" ry="${fp.d * 16 + 6}" fill="url(#softshadow)"/></g>`;
  }
  for (const it of floorItems) {
    const g = drawFloorItem(it, booksByShelf[it.id] || [], night);
    s += `<g class="item ${it.type === 'shelf' ? 'shelf' : ''} ${it.id === selectedId ? 'selected' : ''}" data-id="${it.id}">${g}</g>`;
  }

  s += shell.fore ? `<g pointer-events="none">${shell.fore}</g>` : '';
  // Luz nocturna
  if (night) {
    s += `<rect x="-4000" y="-4000" width="8000" height="8000" fill="#0d1230" opacity=".38" pointer-events="none"/>`;
    for (const it of items) {
      if (it.type === 'lamp') { const [x, y] = proj(it.x + 0.5, it.y + 0.5, 60); s += `<circle class="glow" cx="${x}" cy="${y}" r="60" fill="url(#glow)" pointer-events="none"/>`; }
      if (it.type === 'fireplace') { const fp = footprint(it); const [x, y] = proj(it.x + fp.w / 2, it.y + fp.d, 20); s += `<circle class="glow fire" cx="${x}" cy="${y}" r="65" fill="url(#fireglow)" pointer-events="none"/>`; }
      if (it.type === 'xmastree') { const [x, y] = proj(it.x + 0.5, it.y + 0.5, 45); s += `<circle class="glow" cx="${x}" cy="${y}" r="38" fill="url(#glow)" fill-opacity=".6" pointer-events="none"/>`; }
      if (it.type === 'lights') { const c = catalogOf('lights'); const [x, y] = it.wall === 'a' ? proj(0, it.p + c.span / 2, 150) : proj(it.p + c.span / 2, 0, 150); s += `<circle class="glow" cx="${x}" cy="${y}" r="40" fill="url(#glow)" fill-opacity=".5" pointer-events="none"/>`; }
      const wallAt = (z) => { const sp = catalogOf(it.type).span; return it.wall === 'a' ? proj(0.1, it.p + sp / 2, z) : proj(it.p + sp / 2, 0.1, z); };
      const glowAt = ([x, y], r, o = 1) => { s += `<circle class="glow" cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="url(#glow)" fill-opacity="${o}" pointer-events="none"/>`; };
      if (it.type === 'torch') glowAt(wallAt(128), 50);
      if (it.type === 'candelabra') glowAt(wallAt(112), 42, 0.8);
      if (it.type === 'paperlanterns') glowAt(wallAt(150), 46, 0.6);
      if (it.type === 'fireflies') glowAt(wallAt(115), 48, 0.45);
      if (it.type === 'candles') glowAt(proj(it.x + 0.5, it.y + 0.5, 22), 34, 0.8);
      if (it.type === 'crystalball') glowAt(proj(it.x + 0.5, it.y + 0.5, 36), 30, 0.7);
      if (it.type === 'stonelantern') glowAt(proj(it.x + 0.5, it.y + 0.5, 40), 30, 0.8);
      if (it.type === 'balcony') { const [x, y] = wallAt(40); s += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="60" ry="42" fill="#9fb4ff" opacity=".1" pointer-events="none"/>`; }
      if (it.type === 'archwindow') { const [x, y] = wallAt(90); s += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="50" ry="40" fill="#9fb4ff" opacity=".08" pointer-events="none"/>`; }
      if (it.type === 'window') { const c = catalogOf('window'); const [x, y] = it.wall === 'a' ? proj(0.3, it.p + c.span / 2, 100) : proj(it.p + c.span / 2, 0.3, 100); s += `<ellipse cx="${x}" cy="${y}" rx="50" ry="40" fill="#9fb4ff" opacity=".08" pointer-events="none"/>`; }
    }
  }

  if (shell.lights) s += `<g pointer-events="none">${shell.lights}</g>`;
  // Nombres de las estanterías
  if (labels && !edit) {
    for (const it of items.filter((i) => i.type === 'shelf' && i.name)) {
      const fp = footprint(it);
      const [x, y] = proj(it.x + fp.w / 2, it.y + fp.d / 2, SHELF_H + 18);
      const name = it.name.length > 18 ? it.name.slice(0, 17) + '…' : it.name;
      const w = name.length * 5.6 + 16;
      s += `<g class="shelf-label" data-id="${it.id}"><rect x="${f1(x - w / 2)}" y="${f1(y - 11)}" width="${f1(w)}" height="17" rx="8.5"/><text x="${f1(x)}" y="${f1(y + 1.5)}" text-anchor="middle">${escapeXml(name)}</text></g>`;
    }
  }
  return s;
}

function escapeXml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

export function roomViewBox(N) {
  return { x: -N * 32 - 24, y: -WALL_H - 40, w: N * 64 + 48, h: N * 32 + WALL_H + 70 };
}

// De pantalla (coordenadas SVG) al suelo
export function screenToFloor(sx, sy) {
  const a = sx / 32, b = sy / 16;
  return { x: (a + b) / 2, y: (b - a) / 2 };
}
// loose: al arrastrar no exige que el dedo siga dentro de la pared (solo elige pared por el lado)
export function screenToWall(sx, sy, N, loose = false) {
  if (sx >= 0) {
    const x = sx / 32, z = 16 * x - sy;
    if (loose || (x >= 0 && x <= N && z >= 0 && z <= WALL_H)) return { wall: 'b', p: Math.floor(x), t: x };
  } else {
    const y = -sx / 32, z = 16 * y - sy;
    if (loose || (y >= 0 && y <= N && z >= 0 && z <= WALL_H)) return { wall: 'a', p: Math.floor(y), t: y };
  }
  return null;
}

// ---------- Objetos de los temas ----------
const center = (it, z = 0) => proj(it.x + 0.5, it.y + 0.5, z);
const shadowEl = (bx, by, rx = 14) => `<ellipse cx="${f1(bx)}" cy="${f1(by)}" rx="${rx}" ry="${f1(rx * 0.45)}" fill="#000" opacity=".13"/>`;

// Hoja con foliolos a lo largo de una curva (helechos y palmeras)
function frond(x0, y0, qx, qy, x1, y1, col, n = 7, size = 4) {
  let s = `<path d="M${f1(x0)},${f1(y0)} Q${f1(qx)},${f1(qy)} ${f1(x1)},${f1(y1)}" stroke="${shade(col, 0.75)}" stroke-width="1.2" fill="none"/>`;
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1), u = 1 - t;
    const px = u * u * x0 + 2 * u * t * qx + t * t * x1, py = u * u * y0 + 2 * u * t * qy + t * t * y1;
    const dx = 2 * u * (qx - x0) + 2 * t * (x1 - qx), dy = 2 * u * (qy - y0) + 2 * t * (y1 - qy);
    const ang = (Math.atan2(dy, dx) * 180) / Math.PI, k = size * (1 - t * 0.55);
    s += `<ellipse cx="${f1(px)}" cy="${f1(py)}" rx="${f1(k * 0.42)}" ry="${f1(k * 1.4)}" fill="${col}" transform="rotate(${f1(ang)} ${f1(px)} ${f1(py)})"/>`;
  }
  return s;
}

function drawArmor(it) {
  const [bx, by0] = center(it);
  let s = box(it.x + 0.28, it.y + 0.28, 0, 0.44, 0.44, 6, '#6a625a');
  const by = by0 - 6, m = '#c3c8cf', d = '#8e959e', k = '#5d636b';
  s += `<line x1="${bx + 17}" y1="${by + 4}" x2="${bx + 17}" y2="${by - 80}" stroke="#6b4a33" stroke-width="2.2"/><path d="M${bx + 17},${by - 90} l3.5,10 h-7 Z" fill="${m}"/>`;
  s += `<rect x="${bx - 7}" y="${by - 28}" width="6" height="28" rx="1.5" fill="${d}"/><rect x="${bx + 1}" y="${by - 28}" width="6" height="28" rx="1.5" fill="${m}"/>`;
  s += `<path d="M${bx - 9},${by - 2} h8 v2 h-8 Z M${bx + 1},${by - 2} h8 v2 h-8 Z" fill="${k}"/>`;
  s += `<path d="M${bx - 11},${by - 52} h22 l-2,20 q-9,5 -18,0 Z" fill="${m}"/><path d="M${bx},${by - 52} h11 l-2,20 q-4,2.5 -9,2.5 Z" fill="${d}"/>`;
  s += `<rect x="${bx - 9}" y="${by - 34}" width="18" height="4" fill="${k}"/>`;
  s += `<rect x="${bx - 16}" y="${by - 51}" width="5" height="22" rx="2.5" fill="${d}"/><rect x="${bx + 11}" y="${by - 51}" width="5" height="22" rx="2.5" fill="${m}"/>`;
  s += `<circle cx="${bx - 13.5}" cy="${by - 51}" r="4.5" fill="${m}"/><circle cx="${bx + 13.5}" cy="${by - 51}" r="4.5" fill="${d}"/>`;
  s += `<path d="M${bx - 7},${by - 52} v-11 a7,7 0 0 1 14,0 v11 Z" fill="${m}"/><path d="M${bx},${by - 70} a7,7 0 0 1 7,7 v11 h-7 Z" fill="${d}"/>`;
  s += `<rect x="${bx - 5}" y="${by - 62}" width="10" height="2" fill="#2a2a2a"/><rect x="${bx - 0.7}" y="${by - 62}" width="1.4" height="7" fill="#2a2a2a"/>`;
  s += `<path d="M${bx},${by - 69} q5,-10 13,-7 q-7,1 -11,8 Z" fill="${it.color || '#b23a3a'}"/>`;
  return s;
}

function drawBarrel(it) {
  const cx = it.x + 0.5, cy = it.y + 0.5, c = '#9a6840', rx = 0.24 * 45.25;
  let s = cyl(cx, cy, 0, 0.24, 32, c);
  const [x0, y0] = proj(cx, cy, 0);
  for (const k of [-0.5, 0, 0.5]) {
    const yb = y0 + Math.sqrt(1 - k * k) * rx / 2;
    s += `<line x1="${f1(x0 + k * rx)}" y1="${f1(yb - 32)}" x2="${f1(x0 + k * rx)}" y2="${f1(yb)}" stroke="${shade(c, 0.7)}" stroke-width="0.8"/>`;
  }
  for (const z of [6, 26]) { const [x, y] = proj(cx, cy, z); s += `<path d="M${f1(x - rx)},${f1(y)} A${f1(rx)},${f1(rx / 2)} 0 0 0 ${f1(x + rx)},${f1(y)}" stroke="#3d3833" stroke-width="2.4" fill="none"/>`; }
  const [tx, ty] = proj(cx, cy, 32);
  s += `<ellipse cx="${f1(tx)}" cy="${f1(ty)}" rx="${f1(rx - 2.5)}" ry="${f1(rx / 2 - 1.3)}" fill="none" stroke="${shade(c, 0.75)}" stroke-width="1.2"/>`;
  return s;
}

function drawChest(it) {
  const c = it.color || '#7a4a2a', g = '#d4af37', { x, y } = it;
  let s = box(x + 0.2, y + 0.3, 0, 0.6, 0.42, 15, c) + box(x + 0.18, y + 0.28, 15, 0.64, 0.46, 8, shade(c, 1.12));
  for (const dx of [0.3, 0.63]) {
    const a = x + dx, b = a + 0.07;
    s += poly([[a, y + 0.72, 0], [b, y + 0.72, 0], [b, y + 0.72, 15], [a, y + 0.72, 15]], `fill="${shade(g, 0.92)}"`);
    s += poly([[a, y + 0.74, 15], [b, y + 0.74, 15], [b, y + 0.74, 23], [a, y + 0.74, 23]], `fill="${shade(g, 0.92)}"`);
    s += poly([[a, y + 0.28, 23], [b, y + 0.28, 23], [b, y + 0.74, 23], [a, y + 0.74, 23]], `fill="${shade(g, 1.12)}"`);
  }
  const [lx, ly] = proj(x + 0.5, y + 0.74, 16);
  s += `<rect x="${f1(lx - 3)}" y="${f1(ly - 2)}" width="6" height="7" rx="1" fill="${g}"/><circle cx="${f1(lx)}" cy="${f1(ly + 1.5)}" r="1.2" fill="#3a2a1a"/>`;
  return s;
}

function drawCandles(it) {
  const { x, y } = it;
  const [px, py] = proj(x + 0.5, y + 0.5, 0);
  let s = `<ellipse cx="${px}" cy="${py}" rx="18" ry="9" fill="#a37f42"/><ellipse cx="${px}" cy="${py - 1.5}" rx="16" ry="8" fill="#c9a25a"/>`;
  for (const [dx, dy, hh] of [[0.36, 0.38, 26], [0.6, 0.44, 18], [0.42, 0.62, 12]]) {
    s += cyl(x + dx, y + dy, 1.5, 0.055, hh, '#f3ead8');
    const [fx, fy] = proj(x + dx, y + dy, hh + 1.5);
    s += `<path class="flame" d="M${f1(fx)},${f1(fy - 1)} q-3,-4 0,-10 q3,6 0,10 Z" fill="#ffb84d"/><path class="flame f2" d="M${f1(fx)},${f1(fy - 1.5)} q-1.5,-2 0,-5 q1.5,3 0,5 Z" fill="#fff2b0"/>`;
  }
  return s;
}

function drawMushrooms(it) {
  const { x, y } = it, c = it.color || '#d9443a';
  let s = '';
  for (const [dx, dy, hh, r] of [[0.35, 0.35, 22, 11], [0.4, 0.7, 10, 6], [0.68, 0.45, 14, 8]]) {
    const [mx, my] = proj(x + dx, y + dy, 0);
    s += `<ellipse cx="${f1(mx)}" cy="${f1(my)}" rx="${f1(r * 0.7)}" ry="${f1(r * 0.3)}" fill="#000" opacity=".15"/>`;
    s += `<path d="M${f1(mx - r * 0.28)},${f1(my)} q-1,${f1(-hh / 2)} 0,${-hh} h${f1(r * 0.56)} q1,${f1(hh / 2)} 0,${hh} Z" fill="#f1e6d2"/>`;
    const yb = my - hh + 1;
    s += `<path d="M${f1(mx - r)},${f1(yb)} q0,${f1(-r * 1.1)} ${r},${f1(-r * 1.1)} q${r},0 ${r},${f1(r * 1.1)} q${-r},${f1(r * 0.35)} ${-2 * r},0 Z" fill="${c}"/>`;
    s += [[-0.5, -0.45, 0.16], [0.2, -0.85, 0.13], [0.55, -0.35, 0.11], [-0.05, -0.35, 0.1]].map(([u, v, k]) => `<circle cx="${f1(mx + u * r)}" cy="${f1(yb + v * r)}" r="${f1(k * r + 0.4)}" fill="#fbf4e6"/>`).join('');
  }
  return s;
}

function drawStump(it) {
  const cx = it.x + 0.5, cy = it.y + 0.5, c = '#7a5236', rx = 0.27 * 45.25;
  const [bx, by] = proj(cx, cy, 0);
  let s = `<path d="M${f1(bx - rx - 5)},${f1(by + 1)} q4,-2 6,-9 v9 Z M${f1(bx + rx + 5)},${f1(by)} q-4,-2 -6,-9 v9 Z" fill="${shade(c, 0.8)}"/>`;
  s += cyl(cx, cy, 0, 0.27, 20, c);
  for (const k of [-0.6, -0.15, 0.35, 0.75]) { const yb = by + Math.sqrt(1 - k * k) * rx / 2; s += `<path d="M${f1(bx + k * rx)},${f1(yb - 19)} v17" stroke="${shade(c, 0.65)}" stroke-width="1"/>`; }
  s += `<path d="M${f1(bx - 3)},${f1(by + rx / 2 + 3)} q2,-3 0,-8 h6 q-2,5 0,8 Z" fill="${shade(c, 0.8)}"/>`;
  const [tx, ty] = proj(cx, cy, 20);
  s += `<ellipse cx="${f1(tx)}" cy="${f1(ty)}" rx="${f1(rx)}" ry="${f1(rx / 2)}" fill="#d8b98a"/>`;
  for (const k of [0.7, 0.45, 0.2]) s += `<ellipse cx="${f1(tx)}" cy="${f1(ty)}" rx="${f1(rx * k)}" ry="${f1(rx * k / 2)}" fill="none" stroke="#b08a5a" stroke-width=".8"/>`;
  s += `<path d="M${f1(bx - rx)},${f1(by - 3)} q2,-8 7,-6 q3,-4 6,0 v8 Z" fill="#6f9a4a"/>`;
  return s;
}

function drawThrone(it) {
  const c = it.color || '#8c2b3a', g = '#c9a227', { x, y } = it;
  let s = box(x + 0.15, y + 0.2, 0, 0.7, 0.62, 14, shade(g, 0.85));
  s += box(x + 0.15, y + 0.06, 0, 0.7, 0.14, 84, g);
  s += `<g transform="${faceY(y + 0.2, x + 0.15, 84)}"><path d="M0,0 l3,-8 4,5 4.2,-10 4.2,10 4,-5 3,8 Z" fill="${g}"/><rect x="4" y="8" width="14.4" height="56" rx="6" fill="${c}"/><circle cx="11.2" cy="16" r="2.4" fill="#e8d27a"/></g>`;
  s += box(x + 0.2, y + 0.22, 14, 0.6, 0.58, 6, c);
  s += box(x + 0.15, y + 0.24, 14, 0.1, 0.56, 18, g) + box(x + 0.75, y + 0.24, 14, 0.1, 0.56, 18, g);
  return s;
}

function drawPalm(it) {
  const cx = it.x + 0.5, cy = it.y + 0.5;
  let s = cyl(cx, cy, 0, 0.2, 20, '#c06a45');
  const [bx, by] = proj(cx, cy, 20);
  const tx = bx + 7, ty = by - 80;
  s += `<path d="M${bx - 3.5},${by} Q${bx - 4},${by - 44} ${tx - 2.5},${ty} L${tx + 2.5},${ty + 1} Q${bx + 2},${by - 44} ${bx + 3.5},${by} Z" fill="#8a6a45"/>`;
  for (let i = 1; i < 9; i++) { const t = i / 9, px = bx + (tx - bx) * t * t, py = by + (ty - by) * t; s += `<path d="M${f1(px - 3.5)},${f1(py)} q3.5,2.5 7,0" stroke="#6b5034" stroke-width="1" fill="none"/>`; }
  const greens = ['#3f7a3f', '#5d9a55', '#4f8a4b'];
  [[-40, 18], [38, 20], [-30, -4], [30, -2], [-14, -16], [14, -16], [-20, 26], [22, 28]].forEach(([dx, dy], i) => {
    s += frond(tx, ty, tx + dx * 0.5, ty + Math.min(dy, 0) - 16, tx + dx, ty + dy, greens[i % 3], 9, 6);
  });
  s += `<circle cx="${tx - 3}" cy="${ty + 3}" r="3" fill="#7a5a32"/><circle cx="${tx + 3}" cy="${ty + 4}" r="3" fill="#6b4e2a"/>`;
  return s;
}

function drawFern(it) {
  const cx = it.x + 0.5, cy = it.y + 0.5;
  const [bx, by] = proj(cx, cy, 0);
  let s = `<path d="M${bx - 9},${by + 2} L${bx - 4},${by - 28} M${bx + 9},${by + 2} L${bx + 4},${by - 28} M${bx},${by + 6} V${by - 28}" stroke="#5a3d2b" stroke-width="2.2" stroke-linecap="round"/>`;
  s += cyl(cx, cy, 28, 0.17, 12, '#e7e0d4');
  const [px, py] = proj(cx, cy, 40);
  const greens = ['#4f8a4b', '#5d9a55', '#3f7a3f', '#6aab5f'];
  [[-30, 16], [30, 18], [-22, 30], [22, 32], [-12, -22], [12, -20], [-26, -6], [26, -4], [0, -26]].forEach(([dx, dy], i) => {
    s += frond(px, py, px + dx * 0.55, py + Math.min(dy, 0) - 12, px + dx, py + dy, greens[i % 4], 8, 4);
  });
  return s;
}

function drawBench(it) {
  const { x, y } = it, wood = '#a0703f', iron = '#2f3a36';
  let s = '';
  if (!(it.rot % 2)) {
    for (const [dx, dy] of [[0.15, 0.3], [1.77, 0.3], [0.15, 0.7], [1.77, 0.7]]) s += box(x + dx, y + dy, 0, 0.08, 0.08, 14, iron);
    s += box(x + 0.1, y + 0.28, 14, 1.8, 0.52, 3, wood);
    s += box(x + 0.15, y + 0.2, 14, 0.07, 0.07, 36, iron) + box(x + 1.78, y + 0.2, 14, 0.07, 0.07, 36, iron);
    s += box(x + 0.1, y + 0.19, 26, 1.8, 0.05, 5, wood) + box(x + 0.1, y + 0.19, 36, 1.8, 0.05, 6, wood);
    s += box(x + 0.08, y + 0.3, 24, 0.08, 0.48, 3, iron) + box(x + 1.84, y + 0.3, 24, 0.08, 0.48, 3, iron);
    return s;
  }
  for (const [dx, dy] of [[0.3, 0.15], [0.3, 1.77], [0.7, 0.15], [0.7, 1.77]]) s += box(x + dx, y + dy, 0, 0.08, 0.08, 14, iron);
  s += box(x + 0.28, y + 0.1, 14, 0.52, 1.8, 3, wood);
  s += box(x + 0.2, y + 0.15, 14, 0.07, 0.07, 36, iron) + box(x + 0.2, y + 1.78, 14, 0.07, 0.07, 36, iron);
  s += box(x + 0.19, y + 0.1, 26, 0.05, 1.8, 5, wood) + box(x + 0.19, y + 0.1, 36, 0.05, 1.8, 6, wood);
  s += box(x + 0.3, y + 0.08, 24, 0.48, 0.08, 3, iron) + box(x + 0.3, y + 1.84, 24, 0.48, 0.08, 3, iron);
  return s;
}

function drawFountain(it) {
  const cx = it.x + 0.5, cy = it.y + 0.5, st = '#cfc7b8', R = 0.4 * 45.25, r2 = 0.17 * 45.25;
  let s = cyl(cx, cy, 0, 0.4, 14, st);
  const [wx, wy] = proj(cx, cy, 14);
  s += `<ellipse cx="${f1(wx)}" cy="${f1(wy)}" rx="${f1(R - 3)}" ry="${f1(R / 2 - 1.5)}" fill="#7cc4e4"/>`;
  s += `<ellipse cx="${f1(wx)}" cy="${f1(wy)}" rx="${f1(R - 9)}" ry="${f1(R / 2 - 4.5)}" fill="none" stroke="#c4ecfa" stroke-width="1"/>`;
  s += cyl(cx, cy, 14, 0.06, 22, st) + cyl(cx, cy, 36, 0.17, 4, shade(st, 1.05));
  const [ux, uy] = proj(cx, cy, 40);
  s += `<ellipse cx="${f1(ux)}" cy="${f1(uy)}" rx="${f1(r2 - 2)}" ry="${f1(r2 / 2 - 1)}" fill="#7cc4e4"/>`;
  s += cyl(cx, cy, 40, 0.035, 8, st);
  const drop = f1(wy - uy - 2);
  s += `<g class="water" fill="none" stroke="#a8dcf0" stroke-width="1.6" stroke-linecap="round"><path d="M${f1(ux)},${f1(uy - 9)} q-6,-6 -${f1(r2)},7 M${f1(ux)},${f1(uy - 9)} q6,-6 ${f1(r2)},7"/><path d="M${f1(ux - r2)},${f1(uy + 1)} q-3,8 -5,${drop} M${f1(ux + r2)},${f1(uy + 1)} q3,8 5,${drop}"/></g>`;
  return s;
}

function drawGlobe(it) {
  const [bx, by] = center(it);
  const wood = '#6b4630', g = '#c9a227', gy = by - 44;
  let s = shadowEl(bx, by, 14);
  s += `<path d="M${bx - 12},${by + 2} L${bx - 3},${by - 26} M${bx + 12},${by + 2} L${bx + 3},${by - 26} M${bx},${by + 6} V${by - 26}" stroke="${wood}" stroke-width="3" stroke-linecap="round"/>`;
  s += `<path d="M${bx - 5},${by - 25} h10 l-2,-4 h-6 Z" fill="${g}"/>`;
  s += `<circle cx="${bx}" cy="${gy}" r="15" fill="#4d87b5"/>`;
  s += `<path d="M${bx - 9},${gy - 9} q5,-3 9,1 q2,5 -3,7 q-3,4 -6,1 q-3,-4 0,-9 Z M${bx + 3},${gy + 1} q6,-2 9,3 q-1,6 -6,7 q-4,-3 -3,-10 Z M${bx + 4},${gy - 12} q4,1 6,4 q-3,1 -6,-4 Z" fill="#8fbf6a"/>`;
  s += `<path d="M${bx + 4},${gy - 12} a14,14 0 0 1 7,18" stroke="#fff" stroke-opacity=".3" stroke-width="2.5" fill="none"/>`;
  s += `<path d="M${bx - 8},${gy + 16} A18,18 0 0 1 ${bx + 8},${gy - 16}" stroke="${g}" stroke-width="2.2" fill="none"/>`;
  return s;
}

function drawCrystalBall(it) {
  const { x, y } = it, cx = x + 0.5, cy = y + 0.5;
  let s = cyl(cx, cy, 0, 0.16, 2, '#3a2a40') + box(x + 0.46, y + 0.46, 2, 0.08, 0.08, 16, '#3a2a40');
  s += box(x + 0.2, y + 0.2, 18, 0.6, 0.6, 3, '#5a3d6b');
  const [bx, by] = proj(cx, cy, 21);
  const gid = `cb-${it.id}`;
  s += `<defs><radialGradient id="${gid}" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#c8b6ff"/><stop offset="1" stop-color="#6a4fb5"/></radialGradient></defs>`;
  s += `<path d="M${bx - 7},${by} l2,-5 h10 l2,5 Z" fill="#c9a227"/>`;
  s += `<circle cx="${bx}" cy="${by - 15}" r="11" fill="url(#${gid})"/><circle class="twinkle" cx="${bx + 3}" cy="${by - 17}" r="1.6" fill="#fff"/><circle class="twinkle t1" cx="${bx - 3}" cy="${by - 12}" r="1" fill="#fff"/>`;
  return s;
}

function drawCauldron(it) {
  const [bx, by] = center(it);
  let s = shadowEl(bx, by, 18);
  s += `<path d="M${bx - 14},${by + 2} l3,-8 M${bx + 14},${by + 2} l-3,-8 M${bx},${by + 6} v-8" stroke="#1e1e22" stroke-width="3" stroke-linecap="round"/>`;
  s += `<path d="M${bx - 19},${by - 24} q0,22 19,22 q19,0 19,-22 Z" fill="#2b2b31"/><path d="M${bx + 6},${by - 22} q8,2 9,-1 q-1,15 -12,18 q6,-6 3,-17 Z" fill="#3a3a42"/>`;
  s += `<ellipse cx="${bx}" cy="${by - 24}" rx="20" ry="7" fill="#45454e"/><ellipse cx="${bx}" cy="${by - 24}" rx="16" ry="5" fill="#5fcf6a"/>`;
  s += `<circle class="bubble" cx="${bx - 5}" cy="${by - 25}" r="2.2" fill="#a6f0a8"/><circle class="bubble b1" cx="${bx + 6}" cy="${by - 24}" r="1.6" fill="#a6f0a8"/><circle class="bubble b2" cx="${bx + 1}" cy="${by - 27}" r="1.3" fill="#a6f0a8"/>`;
  s += `<path class="steam" d="M${bx - 2},${by - 30} q-4,-6 0,-12 q4,-6 0,-12" stroke="#b8f5b0" stroke-width="1.6" fill="none" opacity=".6"/>`;
  return s;
}

function drawBonsai(it) {
  const { x, y } = it, cx = x + 0.5, cy = y + 0.5;
  let s = box(x + 0.14, y + 0.2, 0, 0.72, 0.6, 5, '#5a3d2b');
  s += box(x + 0.25, y + 0.32, 5, 0.5, 0.36, 8, '#3f5a6b');
  const [bx, by] = proj(cx, cy, 13);
  s += `<ellipse cx="${bx}" cy="${by}" rx="9" ry="3.5" fill="#6f8f4a"/>`;
  s += `<path d="M${bx - 1},${by} q-9,-9 1,-17 q8,-6 -1,-14 M${bx},${by - 17} q8,-2 12,-10" stroke="#5a3d2b" stroke-width="3.6" fill="none" stroke-linecap="round"/>`;
  for (const [dx, dy, rx, ry, c] of [[-10, -22, 11, 6, '#4f7a3a'], [12, -28, 9, 5.5, '#5f8f45'], [-2, -36, 10, 6, '#5f8f45'], [-6, -38, 5, 3, '#7aa85a'], [14, -30, 4, 2.5, '#7aa85a'], [-12, -24, 5, 2.5, '#6a9a50']]) {
    s += `<ellipse cx="${bx + dx}" cy="${by + dy}" rx="${rx}" ry="${ry}" fill="${c}"/>`;
  }
  return s;
}

function drawStoneLantern(it) {
  const { x, y } = it, st = '#a8a49b';
  let s = box(x + 0.28, y + 0.28, 0, 0.44, 0.44, 6, shade(st, 0.9));
  s += box(x + 0.42, y + 0.42, 6, 0.16, 0.16, 22, st);
  s += box(x + 0.3, y + 0.3, 28, 0.4, 0.4, 4, shade(st, 1.05));
  s += box(x + 0.34, y + 0.34, 32, 0.32, 0.32, 14, st);
  s += poly([[x + 0.44, y + 0.66, 35], [x + 0.56, y + 0.66, 35], [x + 0.56, y + 0.66, 43], [x + 0.44, y + 0.66, 43]], 'fill="#ffd27a"');
  s += poly([[x + 0.66, y + 0.44, 35], [x + 0.66, y + 0.56, 35], [x + 0.66, y + 0.56, 43], [x + 0.66, y + 0.44, 43]], 'fill="#e8a94a"');
  s += box(x + 0.2, y + 0.2, 46, 0.6, 0.6, 2, shade(st, 0.85));
  s += poly([[x + 0.2, y + 0.8, 48], [x + 0.8, y + 0.8, 48], [x + 0.5, y + 0.5, 60]], `fill="${shade(st, 0.95)}"`);
  s += poly([[x + 0.8, y + 0.2, 48], [x + 0.8, y + 0.8, 48], [x + 0.5, y + 0.5, 60]], `fill="${shade(st, 0.75)}"`);
  s += cyl(x + 0.5, y + 0.5, 59, 0.04, 5, st);
  return s;
}

// ---------- Objetos de pared de los temas ----------
function starPath(cx, cy, r) {
  let d = '';
  for (let i = 0; i < 10; i++) { const a = (Math.PI / 5) * i - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; d += `${i ? 'L' : 'M'}${f1(cx + Math.cos(a) * rr)},${f1(cy + Math.sin(a) * rr)}`; }
  return d + 'Z';
}

function themeWallItem(it, W) {
  let s = '';
  const gold = '#d4af37';
  switch (it.type) {
    case 'balcony': {
      const [a, b] = skyColors(new Date().getHours()), night = a === '#1c2448', st = '#a39a8d', cid = 'bc-' + it.id;
      const op = 'M9,150 V36 A23,23 0 0 1 55,36 V150 Z';
      s += `<defs><linearGradient id="${cid}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><clipPath id="${cid}c"><path d="${op}"/></clipPath></defs>`;
      s += `<path d="M2,150 V36 A30,30 0 0 1 62,36 V150 Z" fill="${shade(st, 0.88)}"/>`;
      for (let v = 40; v < 150; v += 14) s += `<path d="M2,${v} h7 M55,${v} h7" stroke="${shade(st, 0.65)}" stroke-width="1"/>`;
      s += `<g clip-path="url(#${cid}c)"><rect width="64" height="150" fill="url(#${cid}s)"/>`;
      s += night ? `<circle cx="44" cy="30" r="5" fill="#f4ecc8"/><circle cx="46" cy="29" r="4.5" fill="${a}"/><circle cx="18" cy="26" r=".8" fill="#fff"/><circle cx="30" cy="40" r=".7" fill="#fff"/><circle cx="50" cy="48" r=".7" fill="#fff"/>`
        : `<circle cx="44" cy="32" r="6" fill="#fff6c8" opacity=".9"/><ellipse cx="22" cy="40" rx="9" ry="3" fill="#fff" opacity=".85"/>`;
      s += `<path d="M9,72 L20,52 L28,62 L40,42 L55,66 V150 H9 Z" fill="${night ? '#2a3350' : '#8fa3b8'}"/><path d="M36.5,48 L40,42 L44,49 L41,47 Z M17.5,57 L20,52 L23,57 Z" fill="#fff" opacity=".9"/>`;
      s += `<path d="M9,84 Q22,72 34,80 T55,76 V150 H9 Z" fill="${night ? '#1d2a3a' : '#6f9f5f'}"/>`;
      s += `<path d="M9,94 Q30,86 55,96 V150 H9 Z" fill="${night ? '#1a2633' : '#93c27a'}"/>`;
      s += `<path d="M28,150 Q22,122 32,106 T29,90" stroke="${night ? '#4a5a8a' : '#7fc3e8'}" stroke-width="3.5" fill="none"/>`;
      for (const [x, y] of [[14, 84], [18, 86], [46, 82], [50, 85], [40, 98], [16, 104]]) s += `<circle cx="${x}" cy="${y}" r="2.6" fill="${night ? '#16222c' : '#4f7f45'}"/>`;
      s += `<path d="M40,104 h6 v-4 l-3,-3 -3,3 Z M47,106 h5 v-3 l-2.5,-2.5 -2.5,2.5 Z" fill="${night ? '#ffd27a' : '#e8dcc4'}"/></g>`;
      // Suelo del balcón y balaustrada
      s += `<path d="M9,150 V131 H55 V150 Z" fill="${shade(st, 1.08)}"/><rect x="9" y="108" width="46" height="4" fill="${shade(st, 1.15)}"/><rect x="9" y="127" width="46" height="4" fill="${shade(st, 0.95)}"/>`;
      for (let x = 12; x < 53; x += 5.5) s += `<path d="M${x},112 q-1.6,3 0,7.5 q1.6,4.5 0,7.5 h2.8 q-1.6,-3 0,-7.5 q1.6,-4.5 0,-7.5 Z" fill="${st}"/>`;
      s += `<rect x="9" y="108" width="4" height="23" fill="${shade(st, 1.05)}"/><rect x="51" y="108" width="4" height="23" fill="${shade(st, 1.05)}"/>`;
      // Cortinas de terciopelo recogidas y arco
      s += `<path d="M9,30 q11,36 1,80 l-1,40 V30 Z" fill="#7a2230"/><path d="M55,30 q-11,36 -1,80 l1,40 V30 Z" fill="#7a2230"/><path d="M9,30 q7,30 3,64" stroke="#9a3444" stroke-width="1.4" fill="none"/>`;
      s += `<path d="M9,150 V36 A23,23 0 0 1 55,36 V150" stroke="${shade(st, 1.15)}" stroke-width="2" fill="none"/><path d="M28,6 h8 l-1,9 h-6 Z" fill="${shade(st, 1.12)}"/>`;
      break;
    }
    case 'antlers':
      s += `<path d="M10,20 h12 l-1.5,13 q-4.5,3 -9,0 Z" fill="#6b4630"/><path d="M11,20 h10" stroke="#8a6244" stroke-width="1.2"/>`;
      s += `<path d="M14,21 C9,15 5,10 5,1 M8,12 L2,10 M6,7 L1,3 M18,21 C23,15 27,10 27,1 M24,12 L30,10 M26,7 L31,3" stroke="#eadcc0" stroke-width="2.4" stroke-linecap="round" fill="none"/>`;
      break;
    case 'banner': {
      const col = it.color || '#8c2b3a';
      s += `<path d="M6,3 h20 v60 l-10,-8 l-10,8 Z" fill="${col}"/><path d="M6,3 h20 v5 h-20 Z" fill="${shade(col, 0.7)}"/>`;
      s += `<path d="M8,10 h16 M8,10 v48 M24,10 v48" stroke="${gold}" stroke-width=".9" fill="none"/>`;
      s += `<path d="M10,32 l2.5,-9 3.5,5 3.5,-5 2.5,9 Z" fill="${gold}"/><rect x="10" y="33" width="12" height="2.5" fill="${gold}"/>`;
      s += `<rect x="2" y="0" width="28" height="3" rx="1.5" fill="#6b4a33"/><circle cx="2.5" cy="1.5" r="2.2" fill="${gold}"/><circle cx="29.5" cy="1.5" r="2.2" fill="${gold}"/>`;
      break;
    }
    case 'tapestry': {
      const col = it.color || '#6a2c3a';
      s += `<rect x="6" y="3" width="52" height="78" fill="${col}"/><rect x="9" y="6" width="46" height="72" fill="none" stroke="${gold}" stroke-width="1.5"/>`;
      s += `<rect x="12" y="9" width="40" height="66" fill="${shade(col, 1.3)}"/><circle cx="44" cy="20" r="4.5" fill="${gold}"/>`;
      s += `<path d="M12,62 q10,-10 20,-4 q10,6 20,-4 v21 h-40 Z" fill="${shade(col, 0.8)}"/>`;
      s += `<path d="M20,64 V44 h2 v-3 h2 v3 h2 v-3 h2 v3 h2 V52 h4 V38 h2 v-3 h2 v3 h2 v-3 h2 v3 h2 V64 Z" fill="${gold}" opacity=".9"/><path d="M29,64 v-6 a3,3 0 0 1 6,0 v6 Z" fill="${shade(col, 0.8)}"/>`;
      for (let i = 0; i < 13; i++) s += `<line x1="${8 + i * 4}" y1="81" x2="${8 + i * 4}" y2="86" stroke="${gold}" stroke-width="1.2"/>`;
      s += `<rect x="0" y="0" width="64" height="3.5" rx="1.7" fill="#6b4a33"/><circle cx="1.5" cy="1.7" r="2.4" fill="${gold}"/><circle cx="62.5" cy="1.7" r="2.4" fill="${gold}"/>`;
      break;
    }
    case 'torch':
      s += `<rect x="13" y="24" width="6" height="10" rx="1" fill="#3a3a3a"/><path d="M12.5,10 h7 l-1.5,17 h-4 Z" fill="#6b4a33"/><path d="M11,7 h10 l-1.5,4 h-7 Z" fill="#3a3a3a"/>`;
      s += `<path class="flame" d="M16,8 q-8,-6 -2,-17 q0,6 3,7 q1,-5 -1,-9 q8,7 4,19 Z" fill="#f29b38"/><path class="flame f2" d="M16,8 q-3,-4 -1,-9 q1,4 2,5 q2,-2 1,-4 q3,5 1,8 Z" fill="#ffd36b"/>`;
      break;
    case 'shield': {
      const col = it.color || '#2e4a7a';
      s += `<path d="M4,4 L28,42 M28,4 L4,42" stroke="#c3c8cf" stroke-width="2.4" stroke-linecap="round"/><path d="M3,9 l6,-4 M23,5 l6,4" stroke="#6b4a33" stroke-width="3" stroke-linecap="round"/>`;
      s += `<path d="M7,11 h18 v12 q0,11 -9,16 q-9,-5 -9,-16 Z" fill="${col}" stroke="${gold}" stroke-width="1.6"/><path d="M16,11 v27 M7,21 h18" stroke="${gold}" stroke-width="1.6"/>`;
      break;
    }
    case 'archwindow': {
      const [a, b] = skyColors(new Date().getHours());
      const night = a === '#1c2448', fr = '#ddd5c6';
      s += `<defs><linearGradient id="sky-${it.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`;
      s += `<path d="M6,92 V32 a26,26 0 0 1 52,0 V92 Z" fill="${fr}"/><path d="M11,88 V33 a21,21 0 0 1 42,0 V88 Z" fill="url(#sky-${it.id})"/>`;
      s += night ? `<circle cx="42" cy="26" r="5" fill="#f4ecc8"/><circle cx="44" cy="25" r="4.5" fill="${a}"/><circle cx="20" cy="30" r=".9" fill="#fff"/><circle cx="26" cy="46" r=".7" fill="#fff"/>`
        : `<circle cx="42" cy="28" r="6" fill="#fff6c8" opacity=".9"/><ellipse cx="22" cy="44" rx="8" ry="3" fill="#fff" opacity=".8"/>`;
      s += `<path d="M11,88 q10,-14 21,-8 q11,6 21,-10 v18 Z" fill="${night ? '#24304f' : '#7fae7a'}"/>`;
      s += `<path d="M32,12 V88 M11,52 H53 M11,70 H53" stroke="${fr}" stroke-width="2.5"/><rect x="2" y="88" width="60" height="6" fill="${shade(fr, 0.85)}"/>`;
      break;
    }
    case 'mirror':
      s += `<ellipse cx="16" cy="22" rx="12" ry="17" fill="#c9a227"/><ellipse cx="16" cy="22" rx="9.5" ry="14.5" fill="#cfe3ec"/>`;
      s += `<path d="M10,15 q3,-6 8,-7" stroke="#fff" stroke-width="2" fill="none" opacity=".8"/><path d="M11,28 l8,-10" stroke="#fff" stroke-width="1.2" opacity=".5"/>`;
      s += `<circle cx="16" cy="4" r="3" fill="#c9a227"/><path d="M16,39 l3,4 h-6 Z" fill="#c9a227"/>`;
      break;
    case 'candelabra':
      s += `<ellipse cx="16" cy="28" rx="3" ry="6" fill="#c9a227"/><path d="M16,32 q-11,0 -11,-10 M16,32 q11,0 11,-10 M16,32 v-14" stroke="#c9a227" stroke-width="1.8" fill="none"/>`;
      for (const [cx, top] of [[5, 22], [16, 18], [27, 22]]) {
        s += `<rect x="${cx - 2.5}" y="${top - 1}" width="5" height="2" fill="#c9a227"/><rect x="${cx - 1.5}" y="${top - 10}" width="3" height="9" fill="#f3ead8"/>`;
        s += `<path class="flame" d="M${cx},${top - 10} q-2.5,-3 0,-7 q2.5,4 0,7 Z" fill="#ffb84d"/>`;
      }
      break;
    case 'vines': {
      s += `<path d="M0,3 Q24,10 48,4 T96,4" stroke="#4f7a3a" stroke-width="1.8" fill="none"/>`;
      const greens = ['#4f8a4b', '#5d9a55', '#3f7a3f', '#6aab5f'];
      [8, 21, 34, 50, 63, 77, 90].forEach((x, i) => {
        const L = 20 + ((i * 17) % 34);
        s += `<path d="M${x},5 q-5,${L / 2} 2,${L}" stroke="#4f7a3a" stroke-width="1.1" fill="none"/>`;
        for (let k = 1; k <= Math.floor(L / 7); k++) {
          const ly = 5 + k * 7, lx = x - 2 + (k % 2 ? -3 : 3);
          s += `<ellipse cx="${lx}" cy="${ly}" rx="2.6" ry="4" fill="${greens[(i + k) % 4]}" transform="rotate(${k % 2 ? 40 : -40} ${lx} ${ly})"/>`;
        }
        if (i % 3 === 1) s += `<circle cx="${x + 2}" cy="${5 + L}" r="2.4" fill="${['#f6c6d8', '#f7e7a6', '#ffffff'][i % 3]}"/>`;
      });
      break;
    }
    case 'fireflies':
      for (let i = 0; i < 14; i++) {
        const fx = f1(6 + hashFrac(it.id + 'f' + i) * 84), fy = f1(4 + hashFrac(it.id + 'g' + i) * 70);
        s += `<circle class="twinkle t${i % 3}" cx="${fx}" cy="${fy}" r="3.4" fill="#fff6a8" opacity=".35"/><circle class="twinkle t${i % 3}" cx="${fx}" cy="${fy}" r="1.3" fill="#fffbd6"/>`;
      }
      break;
    case 'stars':
      [[10, 18], [26, 34], [44, 14], [60, 40], [78, 22], [90, 10]].forEach(([x, L], i) => {
        s += `<line x1="${x}" y1="0" x2="${x}" y2="${L}" stroke="#c9b98a" stroke-width=".6"/>`;
        s += i === 3 ? `<path d="M${x + 1},${L} a7,7 0 1 0 0,14 a5.5,5.5 0 1 1 0,-14 Z" fill="#f4ecc8"/>`
          : `<path class="twinkle t${i % 3}" d="${starPath(x, L + 5, 5.5)}" fill="#f2d36b"/>`;
      });
      break;
    case 'paperlanterns': {
      s += `<path d="M0,0 Q48,16 96,0" stroke="#3a2a20" stroke-width=".8" fill="none"/>`;
      for (const [x, c] of [[18, '#d8402f'], [48, '#f3ead8'], [78, '#d8402f']]) {
        const t = x / 96, y = f1(2 * (1 - t) * t * 16);
        s += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + 4}" stroke="#3a2a20" stroke-width=".8"/><rect x="${x - 5}" y="${y + 3}" width="10" height="2.5" fill="#2a2a2a"/>`;
        s += `<ellipse cx="${x}" cy="${y + 15}" rx="9" ry="10.5" fill="${c}"/>`;
        s += `<path d="M${x - 9},${y + 15} q9,3 18,0 M${x - 8},${y + 9.5} q8,2.5 16,0 M${x - 8},${y + 20.5} q8,2.5 16,0" stroke="${shade(c, 0.78)}" stroke-width=".7" fill="none"/>`;
        s += `<rect x="${x - 5}" y="${y + 24.5}" width="10" height="2.5" fill="#2a2a2a"/><line x1="${x}" y1="${y + 27}" x2="${x}" y2="${y + 33}" stroke="#c9a227" stroke-width="1.2"/>`;
      }
      break;
    }
  }
  return s;
}

function drawWoodpile(it) {
  const { x, y } = it;
  let s = box(x + 0.12, y + 0.1, 0, 0.76, 0.8, 3, '#5a3d2b');
  for (const [z, xs] of [[8, [0.24, 0.41, 0.58, 0.75]], [17, [0.32, 0.49, 0.66]], [26, [0.41, 0.58]]]) {
    for (const lx of xs) {
      const [bx, by] = proj(x + lx, y + 0.16, z), [fx, fy] = proj(x + lx, y + 0.86, z);
      s += `<line x1="${f1(bx)}" y1="${f1(by)}" x2="${f1(fx)}" y2="${f1(fy)}" stroke="#6b4a33" stroke-width="10.5" stroke-linecap="round"/>`;
      s += `<line x1="${f1(bx)}" y1="${f1(by - 3)}" x2="${f1(fx)}" y2="${f1(fy - 3)}" stroke="#8a6244" stroke-width="2.4" stroke-linecap="round"/>`;
      s += `<g transform="${faceY(y + 0.86, x + lx - 5.2 / 32, z + 5.2)}"><circle cx="5.2" cy="5.2" r="5.2" fill="#d9b07a" stroke="#7a5236" stroke-width="1"/><circle cx="5.2" cy="5.2" r="2.6" fill="none" stroke="#b98a52" stroke-width=".7"/></g>`;
    }
  }
  return s;
}

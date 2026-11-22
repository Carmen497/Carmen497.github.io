// Dibujo de la biblioteca en vista isométrica (SVG generado).
// Coordenadas del mundo: x hacia abajo-derecha, y hacia abajo-izquierda, z hacia arriba (en píxeles).

export const WALL_H = 170;
const SHELF_H = 128;
export const SHELF_ROWS = 4;
export const SHELF_PER_ROW = 10;

export const proj = (x, y, z = 0) => [(x - y) * 32, (x + y) * 16 - z];
const f1 = (n) => Math.round(n * 10) / 10;
const pt = (x, y, z) => proj(x, y, z).map(f1).join(',');
const poly = (pts, attrs) => `<polygon points="${pts.map((p) => pt(...p)).join(' ')}" ${attrs}/>`;

export function shade(hex, f) {
  const n = parseInt((hex || '#888888').slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (f <= 1) { r *= f; g *= f; b *= f; } else { const k = f - 1; r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}

function box(x0, y0, z0, w, d, hh, color) {
  const z1 = z0 + hh;
  return poly([[x0, y0, z1], [x0 + w, y0, z1], [x0 + w, y0 + d, z1], [x0, y0 + d, z1]], `fill="${shade(color, 1.15)}"`)
    + poly([[x0, y0 + d, z0], [x0 + w, y0 + d, z0], [x0 + w, y0 + d, z1], [x0, y0 + d, z1]], `fill="${shade(color, 0.92)}"`)
    + poly([[x0 + w, y0, z0], [x0 + w, y0 + d, z0], [x0 + w, y0 + d, z1], [x0 + w, y0, z1]], `fill="${shade(color, 0.74)}"`);
}
const faceY = (yc, xStart, zTop) => { const [ox, oy] = proj(xStart, yc, zTop); return `matrix(1,0.5,0,1,${f1(ox)},${f1(oy)})`; };
const faceX = (xc, yEnd, zTop) => { const [ox, oy] = proj(xc, yEnd, zTop); return `matrix(1,-0.5,0,1,${f1(ox)},${f1(oy)})`; };
const floorM = (x, y, z = 0) => { const [ox, oy] = proj(x, y, z); return `matrix(1,0.5,-1,0.5,${f1(ox)},${f1(oy)})`; };

function cyl(cx, cy, z0, r, hh, color) {
  const rx = r * 45.25, ry = rx / 2;
  const [bx, by] = proj(cx, cy, z0);
  const ty = by - hh;
  return `<path d="M${f1(bx - rx)},${f1(ty)} L${f1(bx - rx)},${f1(by)} A${f1(rx)},${f1(ry)} 0 0 0 ${f1(bx + rx)},${f1(by)} L${f1(bx + rx)},${f1(ty)} Z" fill="${shade(color, 0.82)}"/>`
    + `<ellipse cx="${f1(bx)}" cy="${f1(ty)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${shade(color, 1.1)}"/>`;
}

function hashFrac(str) {
  let h = 2166136261;
  for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000;
}

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
];
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
function skyColors(hour) {
  if (hour >= 7 && hour < 18) return ['#8fc4ea', '#d6ecf7'];
  if (hour >= 18 && hour < 21) return ['#e9906a', '#f6cf8f'];
  if (hour >= 5 && hour < 7) return ['#a99ed0', '#f3c6a5'];
  return ['#1c2448', '#3a4372'];
}

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
  } else if (it.type === 'wallshelf') {
    const col = it.color || '#8a5a3b';
    const bc = ['#8c3b3b', '#3f6e8c', '#6b7d4a', '#a0773f', '#5d4a7a', '#2f5d50'];
    let x = 8;
    for (let i = 0; i < 6; i++) { const hh = 14 + (i * 7) % 6; s += `<rect x="${x}" y="${20 - hh}" width="4.5" height="${hh}" fill="${bc[i]}"/>`; x += 5; }
    s += `<path d="M${W - 18},20 h8 v-6 a4,4 0 0 0 -8,0 Z" fill="#c06a45"/>` + leaves(W - 14, 13, 5, 12, 140, ['#5d9a55', '#4f8a4b']);
    s += `<rect x="2" y="20" width="${W - 4}" height="4" fill="${col}"/><rect x="2" y="24" width="${W - 4}" height="1.5" fill="${shade(col, 0.6)}"/>`;
  }
  return s;
}

const WALL_ITEM_Z = { window: 140, painting: 120, clock: 135, lights: 160, wallshelf: 105 };

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
};
export const FLOOR_OPTIONS = [
  { id: 'wood', label: 'Madera clara' }, { id: 'darkwood', label: 'Madera oscura' },
  { id: 'tiles', label: 'Baldosas' }, { id: 'green', label: 'Moqueta verde' }, { id: 'rose', label: 'Moqueta rosa' },
];
export const WALL_OPTIONS = ['#e9d8c0', '#d6c2a8', '#c9d6c3', '#c8d4e0', '#e8c9c0', '#d9d0e6', '#5b4a63', '#3e4a5a'];

function drawRoomShell(room, edit) {
  const N = room.size;
  const [fa, fb] = FLOORS[room.floor] || FLOORS.wood;
  const wall = room.wall || '#e9d8c0';
  let s = '';
  // Paredes
  s += poly([[0, 0, 0], [0, N, 0], [0, N, WALL_H], [0, 0, WALL_H]], `fill="${shade(wall, 0.9)}" data-wall="a"`);
  s += poly([[0, 0, 0], [N, 0, 0], [N, 0, WALL_H], [0, 0, WALL_H]], `fill="${wall}" data-wall="b"`);
  // Grosor superior de la pared
  s += poly([[0, 0, WALL_H], [N, 0, WALL_H], [N, -0.25, WALL_H], [-0.25, -0.25, WALL_H], [-0.25, N, WALL_H], [0, N, WALL_H]], `fill="${shade(wall, 0.7)}"`);
  s += poly([[0, N, 0], [0, N, WALL_H], [-0.25, N, WALL_H], [-0.25, N, 0]], `fill="${shade(wall, 0.6)}"`);
  s += poly([[N, 0, 0], [N, 0, WALL_H], [N, -0.25, WALL_H], [N, -0.25, 0]], `fill="${shade(wall, 0.65)}"`);
  // Rodapiés
  s += poly([[0, 0, 0], [0, N, 0], [0, N, 9], [0, 0, 9]], `fill="${shade(wall, 0.62)}"`);
  s += poly([[0, 0, 0], [N, 0, 0], [N, 0, 9], [0, 0, 9]], `fill="${shade(wall, 0.7)}"`);
  // Suelo
  s += poly([[0, 0, 0], [N, 0, 0], [N, N, 0], [0, N, 0]], `fill="${fa}" data-floor="1"`);
  // Borde del suelo (grosor)
  s += poly([[0, N, 0], [N, N, 0], [N, N, -14], [0, N, -14]], `fill="${shade(fa, 0.7)}"`);
  s += poly([[N, 0, 0], [N, N, 0], [N, N, -14], [N, 0, -14]], `fill="${shade(fa, 0.55)}"`);
  if (room.floor === 'tiles') {
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) if ((x + y) % 2) s += poly([[x, y, 0], [x + 1, y, 0], [x + 1, y + 1, 0], [x, y + 1, 0]], `fill="${fb}" pointer-events="none"`);
  } else {
    for (let y = 0; y < N; y += 0.5) {
      s += `<line x1="${pt(0, y, 0).split(',')[0]}" y1="${pt(0, y, 0).split(',')[1]}" x2="${pt(N, y, 0).split(',')[0]}" y2="${pt(N, y, 0).split(',')[1]}" stroke="${fb}" stroke-width="1.2" pointer-events="none"/>`;
    }
    if (room.floor.includes('wood')) {
      for (let i = 0; i < N * 2; i++) {
        const y = i * 0.5, off = (i * 1.7) % 2;
        for (let x = off; x < N; x += 2.2) s += `<line x1="${pt(x, y, 0).split(',')[0]}" y1="${pt(x, y, 0).split(',')[1]}" x2="${pt(x, y + 0.5, 0).split(',')[0]}" y2="${pt(x, y + 0.5, 0).split(',')[1]}" stroke="${fb}" stroke-width="1" pointer-events="none"/>`;
      }
    }
  }
  if (edit) {
    let g = '';
    for (let i = 0; i <= N; i++) {
      g += `<line x1="${pt(i, 0, 0).split(',')[0]}" y1="${pt(i, 0, 0).split(',')[1]}" x2="${pt(i, N, 0).split(',')[0]}" y2="${pt(i, N, 0).split(',')[1]}"/>`;
      g += `<line x1="${pt(0, i, 0).split(',')[0]}" y1="${pt(0, i, 0).split(',')[1]}" x2="${pt(N, i, 0).split(',')[0]}" y2="${pt(N, i, 0).split(',')[1]}"/>`;
    }
    s += `<g class="grid" pointer-events="none">${g}</g>`;
  }
  return s;
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
  }
  return '';
}

// Dibujo suelto de un objeto (para el catálogo de decoración)
export function itemPreview(type, color) {
  const c = catalogOf(type);
  const it = { id: 'prev-' + type, type, x: 0, y: 0, rot: 0, wall: 'b', p: 0, color: color || c.color };
  if (c.wall) return `<g transform="${faceY(0, 0, 0)}">${drawWallItem(it)}</g>`;
  if (c.flat) return drawRug(it);
  const fake = type === 'shelf'
    ? Array.from({ length: 26 }, (_, i) => ({ id: 'p' + i, spineColor: ['#8c3b3b', '#3f6e8c', '#6b7d4a', '#a0773f', '#5d4a7a'][i % 5] }))
    : [];
  return drawFloorItem(it, fake, false);
}

// ---------- Escena completa ----------
export function renderRoom(room, booksByShelf, { edit = false, selectedId = null, night = false, labels = true } = {}) {
  const N = room.size;
  let s = `<defs>
    <radialGradient id="glow"><stop offset="0" stop-color="#ffd27a" stop-opacity=".75"/><stop offset=".5" stop-color="#ffb84d" stop-opacity=".22"/><stop offset="1" stop-color="#ffb84d" stop-opacity="0"/></radialGradient>
    <radialGradient id="fireglow"><stop offset="0" stop-color="#ff9a3c" stop-opacity=".7"/><stop offset="1" stop-color="#ff7a2c" stop-opacity="0"/></radialGradient>
  </defs>`;
  s += drawRoomShell(room, edit);

  const items = room.items;
  // Objetos de pared
  for (const it of items.filter((i) => catalogOf(i.type).wall)) {
    s += `<g class="item ${it.id === selectedId ? 'selected' : ''}" data-id="${it.id}"><g transform="${wallTransform(it)}">${drawWallItem(it)}</g></g>`;
  }
  // Alfombras
  for (const it of items.filter((i) => catalogOf(i.type).flat)) {
    s += `<g class="item ${it.id === selectedId ? 'selected' : ''}" data-id="${it.id}">${drawRug(it)}</g>`;
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
  for (const it of floorItems) {
    const g = drawFloorItem(it, booksByShelf[it.id] || [], night);
    s += `<g class="item ${it.type === 'shelf' ? 'shelf' : ''} ${it.id === selectedId ? 'selected' : ''}" data-id="${it.id}">${g}</g>`;
  }

  // Luz nocturna
  if (night) {
    s += `<rect x="${-N * 32 - 200}" y="${-WALL_H - 200}" width="${N * 64 + 400}" height="${N * 32 + WALL_H + 400}" fill="#0d1230" opacity=".38" pointer-events="none"/>`;
    for (const it of items) {
      if (it.type === 'lamp') { const [x, y] = proj(it.x + 0.5, it.y + 0.5, 60); s += `<circle class="glow" cx="${x}" cy="${y}" r="95" fill="url(#glow)" pointer-events="none"/>`; }
      if (it.type === 'fireplace') { const fp = footprint(it); const [x, y] = proj(it.x + fp.w / 2, it.y + fp.d, 20); s += `<circle class="glow fire" cx="${x}" cy="${y}" r="90" fill="url(#fireglow)" pointer-events="none"/>`; }
      if (it.type === 'lights') { const c = catalogOf('lights'); const [x, y] = it.wall === 'a' ? proj(0, it.p + c.span / 2, 150) : proj(it.p + c.span / 2, 0, 150); s += `<circle class="glow" cx="${x}" cy="${y}" r="70" fill="url(#glow)" opacity=".7" pointer-events="none"/>`; }
      if (it.type === 'window') { const c = catalogOf('window'); const [x, y] = it.wall === 'a' ? proj(0.3, it.p + c.span / 2, 100) : proj(it.p + c.span / 2, 0.3, 100); s += `<ellipse cx="${x}" cy="${y}" rx="50" ry="40" fill="#9fb4ff" opacity=".08" pointer-events="none"/>`; }
    }
  }

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
export function screenToWall(sx, sy, N) {
  if (sx >= 0) {
    const x = sx / 32, z = 16 * x - sy;
    if (x >= 0 && x <= N && z >= 0 && z <= WALL_H) return { wall: 'b', p: Math.floor(x) };
  } else {
    const y = -sx / 32, z = 16 * y - sy;
    if (y >= 0 && y <= N && z >= 0 && z <= WALL_H) return { wall: 'a', p: Math.floor(y) };
  }
  return null;
}

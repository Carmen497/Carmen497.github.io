// Herramientas de dibujo isométrico compartidas por la sala (room.js) y los ambientes (scenes.js).
// Coordenadas del mundo: x hacia abajo-derecha, y hacia abajo-izquierda (en casillas), z hacia arriba (en píxeles).

export const WALL_H = 170;

export const proj = (x, y, z = 0) => [(x - y) * 32, (x + y) * 16 - z];
export const f1 = (n) => Math.round(n * 10) / 10;
export const pt = (x, y, z) => proj(x, y, z).map(f1).join(',');
export const poly = (pts, attrs) => `<polygon points="${pts.map((p) => pt(...p)).join(' ')}" ${attrs}/>`;

export function shade(hex, f) {
  const n = parseInt((hex || '#888888').slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (f <= 1) { r *= f; g *= f; b *= f; } else { const k = f - 1; r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}

// Caja con las tres caras visibles; las caras verticales llevan un degradado suave (más luz arriba)
export function box(x0, y0, z0, w, d, hh, color) {
  const z1 = z0 + hh;
  const front = [[x0, y0 + d, z0], [x0 + w, y0 + d, z0], [x0 + w, y0 + d, z1], [x0, y0 + d, z1]];
  const side = [[x0 + w, y0, z0], [x0 + w, y0 + d, z0], [x0 + w, y0 + d, z1], [x0 + w, y0, z1]];
  let s = poly([[x0, y0, z1], [x0 + w, y0, z1], [x0 + w, y0 + d, z1], [x0, y0 + d, z1]], `fill="${shade(color, 1.15)}"`)
    + poly(front, `fill="${shade(color, 0.92)}"`)
    + poly(side, `fill="${shade(color, 0.74)}"`);
  if (hh > 10) s += poly(front, 'fill="url(#fshade)"') + poly(side, 'fill="url(#fshade)"');
  return s;
}
export const faceY = (yc, xStart, zTop) => { const [ox, oy] = proj(xStart, yc, zTop); return `matrix(1,0.5,0,1,${f1(ox)},${f1(oy)})`; };
export const faceX = (xc, yEnd, zTop) => { const [ox, oy] = proj(xc, yEnd, zTop); return `matrix(1,-0.5,0,1,${f1(ox)},${f1(oy)})`; };
export const floorM = (x, y, z = 0) => { const [ox, oy] = proj(x, y, z); return `matrix(1,0.5,-1,0.5,${f1(ox)},${f1(oy)})`; };

export function cyl(cx, cy, z0, r, hh, color) {
  const rx = r * 45.25, ry = rx / 2;
  const [bx, by] = proj(cx, cy, z0);
  const ty = by - hh;
  return `<path d="M${f1(bx - rx)},${f1(ty)} L${f1(bx - rx)},${f1(by)} A${f1(rx)},${f1(ry)} 0 0 0 ${f1(bx + rx)},${f1(by)} L${f1(bx + rx)},${f1(ty)} Z" fill="${shade(color, 0.82)}"/>`
    + (hh > 8 ? `<path d="M${f1(bx - rx)},${f1(ty)} L${f1(bx - rx)},${f1(by)} A${f1(rx)},${f1(ry)} 0 0 0 ${f1(bx + rx)},${f1(by)} L${f1(bx + rx)},${f1(ty)} Z" fill="url(#cshade)"/>` : '')
    + `<ellipse cx="${f1(bx)}" cy="${f1(ty)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${shade(color, 1.1)}"/>`;
}

export function hashFrac(str) {
  let h = 2166136261;
  for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000;
}

export function skyColors(hour) {
  if (hour >= 7 && hour < 18) return ['#8fc4ea', '#d6ecf7'];
  if (hour >= 18 && hour < 21) return ['#e9906a', '#f6cf8f'];
  if (hour >= 5 && hour < 7) return ['#a99ed0', '#f3c6a5'];
  return ['#1c2448', '#3a4372'];
}
export const isNightSky = (hour = new Date().getHours()) => skyColors(hour)[0] === '#1c2448';

// Degradados comunes (luz y sombra); se ponen una vez en cada dibujo de sala
export const COMMON_DEFS = `
  <linearGradient id="fshade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".10"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient>
  <linearGradient id="cshade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".12"/><stop offset=".35" stop-color="#fff" stop-opacity=".14"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
  <radialGradient id="softshadow"><stop offset="0" stop-color="#000" stop-opacity=".34"/><stop offset=".6" stop-color="#000" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  <linearGradient id="wl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".07"/><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>
  <linearGradient id="wc" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
  <linearGradient id="aoV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
  <linearGradient id="aoH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>`;

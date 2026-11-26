// Ambientes de la sala: cómo son las paredes, el suelo y lo que rodea a la sala en cada tema.
// Cada ambiente devuelve capas:
//   bg      → fondo de toda la pantalla (cielo, bosque…) para los que están «al aire libre»
//   walls   → lo pintado sobre las dos paredes del fondo (u se mide desde la esquina, v desde arriba)
//   back3d  → piezas en 3D pegadas a las paredes (columnas, almenas, troncos, cúpula trasera…)
//   fore    → lo que va por delante de los muebles (rayos de luz, pétalos, la parte delantera de la cúpula…)
//   lights  → lo que brilla y no se apaga con el modo noche (velas flotantes, luciérnagas…)
import { WALL_H as H, proj, f1, poly, shade, box, cyl, faceX, faceY, floorM, hashFrac as rnd, skyColors } from './geom.js';

const BIG = 4000;
const P = (x, y, z) => proj(x, y, z).map(f1);
const pathOf = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f1(x)},${f1(y)}`).join('');

// Dibuja lo mismo en las dos paredes del fondo (la izquierda en espejo, para que u=0 sea siempre la esquina)
export function onWalls(N, body) {
  const W = N * 32;
  return '<g pointer-events="none">'
    + `<g transform="${faceX(0, N, H)} translate(${W},0) scale(-1,1)"><svg width="${W}" height="${H}" overflow="hidden">${body('a', W)}</svg></g>`
    + `<g transform="${faceY(0, 0, H)}"><svg width="${W}" height="${H}" overflow="hidden">${body('b', W)}</svg></g></g>`;
}

// Piedras irregulares (cada una con su tono, brillo arriba y sombra abajo)
function stones(W, v0, v1, seed, base, { rh = [14, 20], sw = [24, 50], r = 2.5, moss = 0, mortar = 0.62 } = {}) {
  let s = `<rect x="0" y="${v0}" width="${W}" height="${v1 - v0}" fill="${shade(base, mortar)}"/>`;
  for (let v = v0, row = 0; v < v1; row++) {
    const h = rh[0] + rnd(seed + 'h' + row) * (rh[1] - rh[0]);
    for (let u = -rnd(seed + 'o' + row) * sw[1], i = 0; u < W; i++) {
      const w = sw[0] + rnd(seed + row + 'w' + i) * (sw[1] - sw[0]);
      const c = shade(base, 0.84 + rnd(seed + row + 'k' + i) * 0.26);
      s += `<rect x="${f1(u + 1.3)}" y="${f1(v + 1.3)}" width="${f1(w - 2.6)}" height="${f1(h - 2.6)}" rx="${r}" fill="${c}"/>`;
      s += `<rect x="${f1(u + 3)}" y="${f1(v + 1.6)}" width="${f1(w - 6)}" height="1.6" rx=".8" fill="${shade(c, 1.18)}" opacity=".7"/>`;
      s += `<rect x="${f1(u + 3)}" y="${f1(v + h - 3.6)}" width="${f1(w - 6)}" height="2" rx="1" fill="${shade(c, 0.72)}" opacity=".6"/>`;
      if (moss && rnd(seed + row + 'm' + i) < moss * ((v - v0) / (v1 - v0) + 0.2)) {
        s += `<ellipse cx="${f1(u + w * (0.3 + rnd(seed + i + 'mx') * 0.4))}" cy="${f1(v + h - 2.5)}" rx="${f1(w * 0.3)}" ry="2.6" fill="#62803c" opacity=".75"/>`;
      }
      u += w;
    }
    v += h;
  }
  return s;
}

// Tablones de madera (en el plano del suelo)
function planks(W, fa, seed, rowH = 16, len = [50, 130]) {
  let s = `<rect width="${W}" height="${W}" fill="${shade(fa, 0.58)}"/>`;
  for (let v = 0, row = 0; v < W; v += rowH, row++) {
    for (let u = -rnd(seed + 'o' + row) * len[1], i = 0; u < W; i++) {
      const L = len[0] + rnd(seed + row + 'l' + i) * (len[1] - len[0]);
      const c = shade(fa, 0.88 + rnd(seed + row + 'k' + i) * 0.2);
      s += `<rect x="${f1(u + 0.6)}" y="${f1(v + 0.6)}" width="${f1(L - 1.2)}" height="${rowH - 1.2}" fill="${c}"/>`;
      s += `<path d="M${f1(u + 5)},${f1(v + rowH * 0.35)} h${f1(L - 12)} M${f1(u + 9)},${f1(v + rowH * 0.7)} h${f1(L * 0.6)}" stroke="${shade(c, 0.9)}" stroke-width=".6"/>`;
      if (rnd(seed + row + 'n' + i) < 0.14) s += `<ellipse cx="${f1(u + L * 0.6)}" cy="${f1(v + rowH / 2)}" rx="3" ry="1.6" fill="${shade(c, 0.75)}"/>`;
      s += `<circle cx="${f1(u + 3)}" cy="${f1(v + 3.5)}" r=".8" fill="${shade(c, 0.6)}"/><circle cx="${f1(u + 3)}" cy="${f1(v + rowH - 3.5)}" r=".8" fill="${shade(c, 0.6)}"/>`;
      u += L;
    }
  }
  return s;
}

// Cielo con montañas lejanas (para las salas que quedan abiertas por arriba, como el castillo)
function skyline(N, uid) {
  const W = N * 32, [sa, sb] = skyColors(new Date().getHours()), dark = sa === '#1c2448';
  const defs = `<linearGradient id="${uid}sl" gradientUnits="userSpaceOnUse" x1="0" y1="${-H - 300}" x2="0" y2="0"><stop offset="0" stop-color="${sa}"/><stop offset="1" stop-color="${sb}"/></linearGradient>`;
  let bg = `<rect x="${-BIG}" y="${-BIG}" width="${BIG * 2}" height="${BIG * 2}" fill="url(#${uid}sl)"/>`;
  if (dark) for (let i = 0; i < 50; i++) bg += `<circle cx="${f1((rnd('k' + i) - 0.5) * W * 3)}" cy="${f1(-H - 320 + rnd('l' + i) * 280)}" r="${f1(0.6 + rnd('m' + i))}" fill="#fff" opacity=".8"/>`;
  else for (let i = 0; i < 5; i++) bg += `<ellipse cx="${f1((rnd('c' + i) - 0.5) * W * 2.6)}" cy="${f1(-H - 220 + rnd('d' + i) * 110)}" rx="${f1(30 + rnd('e' + i) * 30)}" ry="9" fill="#fff" opacity=".8"/>`;
  for (const [y0, col, amp] of [[-H - 40, dark ? '#2a3350' : '#a9b7c9', 90], [-H + 30, dark ? '#1d2540' : '#8094a8', 60]]) {
    let d = `M${-W * 2},${y0}`;
    for (let x = -W * 2, i = 0; x < W * 2; i++) { const s = 40 + rnd(y0 + 's' + i) * 70; d += ` L${f1(x + s / 2)},${f1(y0 - rnd(y0 + 'h' + i) * amp)} L${f1(x + s)},${y0}`; x += s; }
    bg += `<path d="${d} V${BIG} H${-W * 2} Z" fill="${col}"/>`;
  }
  return { bg, defs };
}

// =====================================================================================
// Paredes
// =====================================================================================
export function wallScene(room, N, uid, night) {
  const fn = {
    stone: castle, timber: tavern, logs: cabin, wainscot: victorian, stripes: fairytale,
    leaves: forest, glass: glasshouse, stars: tower, shoji: zen, wind,
  }[room.wallStyle];
  return fn ? fn(room, N, uid, night) : plain(room, N);
}

function plain(room, N) {
  const w = room.wall || '#e9d8c0';
  return { walls: onWalls(N, (id, W) => `<rect width="${W}" height="${H}" fill="${w}"/><rect width="${W}" height="7" fill="${shade(w, 1.12)}"/><rect y="7" width="${W}" height="2.5" fill="${shade(w, 0.8)}"/>`) };
}

// ---- Castillo medieval: sillares irregulares, columnas en las esquinas y almenas ----
function castle(room, N, uid) {
  const w = room.wall, W = N * 32;
  const { bg, defs } = skyline(N, uid);
  const walls = onWalls(N, (id) => stones(W, 0, H, 'c' + id, w, { rh: [15, 22], sw: [26, 58], moss: 0.35 })
    + `<path d="M0,${H - 2} H${W}" stroke="${shade(w, 0.5)}" stroke-width="4"/>`);
  const pil = (x, y) => box(x - 0.05, y - 0.05, 0, 0.42, 0.42, 14, shade(w, 0.85))
    + box(x, y, 14, 0.32, 0.32, H - 34, shade(w, 1.03))
    + box(x - 0.05, y - 0.05, H - 20, 0.42, 0.42, 8, shade(w, 0.9)) + box(x - 0.08, y - 0.08, H - 12, 0.48, 0.48, 12, shade(w, 0.96));
  const merl = [[-0.32, -0.32, 0.32, 0.32]];
  for (let i = 0; i < N; i++) { merl.push([i + 0.18, -0.32, 0.5, 0.32]); merl.push([-0.32, i + 0.18, 0.32, 0.5]); }
  merl.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
  let back3d = merl.map(([x, y, a, b]) => box(x, y, H, a, b, 20, shade(w, 0.96)) + box(x - 0.02, y - 0.02, H + 20, a + 0.04, b + 0.04, 3, shade(w, 1.08))).join('');
  back3d += pil(0, 0) + pil(N - 0.4, 0) + pil(0, N - 0.4);
  return { walls, back3d, bg, defs };
}

// ---- Taberna: piedra abajo, yeso con entramado de vigas arriba, hierbas colgando ----
function tavern(room, N) {
  const w = room.wall, W = N * 32, beam = '#5a3c28';
  const vt = (x, y, ww, hh) => `<rect x="${f1(x)}" y="${f1(y)}" width="${ww}" height="${hh}" fill="${beam}"/><rect x="${f1(x)}" y="${f1(y)}" width="1.6" height="${hh}" fill="${shade(beam, 1.35)}" opacity=".6"/><path d="M${f1(x + ww * 0.45)},${f1(y + 3)} v${hh - 6}" stroke="${shade(beam, 0.7)}" stroke-width=".8"/>`;
  const ht = (x, y, ww, hh) => `<rect x="${f1(x)}" y="${f1(y)}" width="${ww}" height="${hh}" fill="${beam}"/><rect x="${f1(x)}" y="${f1(y)}" width="${ww}" height="1.6" fill="${shade(beam, 1.35)}" opacity=".6"/><path d="M${f1(x + 3)},${f1(y + hh * 0.55)} h${ww - 6}" stroke="${shade(beam, 0.7)}" stroke-width=".8"/>`;
  const walls = onWalls(N, (id) => {
    let s = `<rect width="${W}" height="${H}" fill="${w}"/>`;
    for (let i = 0; i < W / 9; i++) s += `<ellipse cx="${f1(rnd(id + 'px' + i) * W)}" cy="${f1(rnd(id + 'py' + i) * (H - 50))}" rx="${f1(8 + rnd(id + 'pr' + i) * 20)}" ry="${f1(5 + rnd(id + 'pq' + i) * 9)}" fill="${shade(w, rnd(id + 'pc' + i) > 0.5 ? 1.06 : 0.92)}" opacity=".55"/>`;
    s += stones(W, H - 46, H, 't' + id, '#9b8f7f', { rh: [10, 14], sw: [16, 34], r: 3, moss: 0.2 });
    for (let u = 0; u < W; u += 96) {
      s += `<path d="M${u + 12},${H - 52} L${u + 46},82 M${u + 84},${H - 52} L${u + 50},82" stroke="${beam}" stroke-width="7"/>`;
      s += `<path d="M${u + 12},${H - 52} L${u + 46},82" stroke="${shade(beam, 1.3)}" stroke-width="1" opacity=".5" transform="translate(-3,0)"/>`;
    }
    for (let u = 0; u <= W; u += 96) s += vt(u - 5, 0, 10, H - 46);
    s += ht(0, 0, W, 13) + ht(0, 74, W, 8) + ht(0, H - 52, W, 7);
    for (let u = 0; u <= W; u += 96) for (const v of [6, 78, H - 49]) s += `<circle cx="${u}" cy="${v}" r="1.6" fill="#2e1f14"/>`;
    return s;
  });
  // Viga a lo largo de lo alto de cada pared y, colgando de ella, manojos de hierbas, ajos y un farol
  let back3d = box(0, 0, H - 16, 0.24, N, 16, beam) + box(0, 0, H - 16, N, 0.24, 16, beam);
  let fore = '';
  const hang = (x, y, kind) => {
    const [tx, ty] = P(x, y, H - 16), len = 16 + rnd(x + 'l' + y) * 14;
    let g = `<line x1="${tx}" y1="${ty}" x2="${tx}" y2="${f1(ty + len)}" stroke="#4a3a2a" stroke-width=".8"/>`;
    const by = ty + len;
    if (kind === 0) { // hierbas secas
      g += `<rect x="${tx - 3}" y="${f1(by - 1)}" width="6" height="3" fill="#a33a2e"/>`;
      ['#7a8a4a', '#8f9a58', '#6b7a3a', '#9aa060', '#71803f'].forEach((c, i) => { const a = -24 + i * 12; g += `<ellipse cx="${f1(tx + Math.sin((a * Math.PI) / 180) * 7)}" cy="${f1(by + 9)}" rx="2.4" ry="9" fill="${c}" transform="rotate(${-a} ${f1(tx + Math.sin((a * Math.PI) / 180) * 7)} ${f1(by + 9)})"/>`; });
    } else if (kind === 1) { // trenza de ajos
      for (let i = 0; i < 5; i++) g += `<circle cx="${f1(tx + (i % 2 ? 2.5 : -2.5))}" cy="${f1(by + 3 + i * 5)}" r="3.6" fill="#efe8da" stroke="#c9bfa8" stroke-width=".6"/>`;
    } else { // farol de hierro
      g += `<path d="M${tx - 5},${f1(by + 2)} h10 l-1.5,16 h-7 Z" fill="#ffd27a" opacity=".9"/><path d="M${tx - 6},${f1(by + 2)} h12 M${tx - 5},${f1(by + 18)} h10 M${tx},${f1(by + 2)} v16 M${tx - 3},${f1(by - 2)} h6 l2,4 h-10 Z" stroke="#2b2b2b" stroke-width="1.4" fill="#2b2b2b"/>`;
    }
    fore += g;
  };
  for (let x = 1.3, i = 0; x < N - 0.5; x += 1.6 + rnd('hx' + i) * 0.8, i++) hang(x, 0.12, i % 3 === 2 ? 2 : i % 2);
  for (let y = 1.6, i = 0; y < N - 0.5; y += 1.7 + rnd('hy' + i) * 0.8, i++) hang(0.12, y, (i + 1) % 3 === 2 ? 2 : i % 2);
  return { walls, back3d, fore };
}

// ---- Cabaña de montaña: troncos de distintos tonos, postes en las esquinas, nieve y montañas nevadas detrás ----
function cabin(room, N, uid) {
  const w = room.wall, W = N * 32, lh = 20;
  const sky = snowyline(N, uid);
  const defs = sky.defs + `<linearGradient id="${uid}log" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".24"/><stop offset=".22" stop-color="#fff" stop-opacity=".04"/><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".42"/></linearGradient>`;
  const walls = onWalls(N, (id) => {
    let s = `<rect width="${W}" height="${H}" fill="#ece2c8"/>`;
    for (let v = 0, r = 0; v < H; v += lh, r++) {
      // Cada hilada puede tener una junta (dos troncos unidos)
      const joint = rnd(id + 'j' + r) < 0.55 ? 40 + rnd(id + 'ju' + r) * (W - 80) : -1;
      const segs = joint > 0 ? [[-12, joint], [joint + 2, W + 12]] : [[-12, W + 12]];
      segs.forEach(([u0, u1], k) => {
        const c = shade(w, 0.84 + rnd(id + 'lc' + r + k) * 0.26);
        s += `<rect x="${f1(u0)}" y="${v + 2.2}" width="${f1(u1 - u0)}" height="${lh - 4.4}" rx="9" fill="${c}"/>`;
        for (let i = 0; i < (u1 - u0) / 26; i++) {
          const u = u0 + rnd(id + r + k + 'g' + i) * (u1 - u0 - 30), y = v + 6 + rnd(id + r + k + 'h' + i) * (lh - 12);
          s += `<path d="M${f1(u)},${f1(y)} q8,-1.6 16,0 t16,0" stroke="${shade(c, 0.78)}" stroke-width=".7" fill="none" opacity=".7"/>`;
        }
        if (rnd(id + r + k + 'c') < 0.35) { const u = u0 + rnd(id + r + k + 'cu') * (u1 - u0 - 60); s += `<path d="M${f1(u)},${v + lh / 2} l18,1 14,-1 12,1" stroke="${shade(c, 0.55)}" stroke-width="1" fill="none"/>`; }
        if (rnd(id + r + k + 'k') < 0.5) { const u = u0 + 20 + rnd(id + r + k + 'ku') * (u1 - u0 - 40); s += `<ellipse cx="${f1(u)}" cy="${v + lh / 2}" rx="4.5" ry="3" fill="${shade(c, 0.66)}"/><ellipse cx="${f1(u)}" cy="${v + lh / 2}" rx="2" ry="1.3" fill="${shade(c, 0.45)}"/>`; }
        s += `<rect x="${f1(u0)}" y="${v + 2.2}" width="${f1(u1 - u0)}" height="${lh - 4.4}" rx="9" fill="url(#${uid}log)"/>`;
      });
    }
    return s;
  });
  // Postes redondos en la esquina y en los extremos, y nieve sobre las paredes
  const post = (x, y) => cyl(x, y, 0, 0.17, H + 6, shade(w, 0.92)) + `<ellipse cx="${P(x, y, H + 6)[0]}" cy="${P(x, y, H + 6)[1]}" rx="9" ry="4.5" fill="#f4f7fa"/>`;
  let back3d = '';
  for (let i = 0; i < N; i += 0.5) {
    for (const [x, y] of [[i + 0.25, -0.12], [-0.12, i + 0.25]]) {
      const [sx, sy] = P(x, y, H);
      back3d += `<ellipse cx="${sx}" cy="${f1(sy - 2)}" rx="${f1(10 + rnd('sn' + i + x) * 6)}" ry="4" fill="#f4f7fa"/>`;
    }
  }
  back3d += post(0.05, 0.05) + post(N - 0.17, 0.05) + post(0.05, N - 0.17);
  return { bg: sky.bg, walls, back3d, defs, cap: '#f2f5f8', noBaseboard: true };
}

// Montañas nevadas con pinos y nieve cayendo (fondo de la cabaña)
function snowyline(N, uid) {
  const W = N * 32, [sa, sb] = skyColors(new Date().getHours()), dark = sa === '#1c2448';
  const defs = `<linearGradient id="${uid}snsky" gradientUnits="userSpaceOnUse" x1="0" y1="${-H - 300}" x2="0" y2="0"><stop offset="0" stop-color="${dark ? '#151d3a' : '#a9cbe6'}"/><stop offset="1" stop-color="${dark ? '#2c3760' : '#e8f1f6'}"/></linearGradient>`;
  let bg = `<rect x="${-BIG}" y="${-BIG}" width="${BIG * 2}" height="${BIG * 2}" fill="url(#${uid}snsky)"/>`;
  if (dark) for (let i = 0; i < 50; i++) bg += `<circle cx="${f1((rnd('k' + i) - 0.5) * W * 3)}" cy="${f1(-H - 320 + rnd('l' + i) * 260)}" r="${f1(0.6 + rnd('m' + i))}" fill="#fff" opacity=".8"/>`;
  for (const [y0, col, amp, step] of [[-H - 30, dark ? '#3a4670' : '#b9c8d8', 110, 90], [-H + 30, dark ? '#2b3558' : '#9fb2c6', 80, 70]]) {
    let d = `M${-W * 2},${y0}`, caps = '';
    for (let x = -W * 2, i = 0; x < W * 2; i++) {
      const s = step + rnd(y0 + 's' + i) * step, hgt = amp * (0.5 + rnd(y0 + 'h' + i) * 0.5), px = x + s / 2, py = y0 - hgt;
      d += ` L${f1(px)},${f1(py)} L${f1(x + s)},${y0}`;
      const k = 0.32;
      caps += `<path d="M${f1(px - (s / 2) * k)},${f1(py + hgt * k)} L${f1(px)},${f1(py)} L${f1(px + (s / 2) * k)},${f1(py + hgt * k)} l-6,-5 -5,6 -6,-6 -5,5 Z" fill="${dark ? '#c9d3ea' : '#ffffff'}"/>`;
      x += s;
    }
    bg += `<path d="${d} V${BIG} H${-W * 2} Z" fill="${col}"/>${caps}`;
  }
  // Pinos con nieve
  const pine = dark ? '#16283a' : '#2f5a4a';
  bg += `<rect x="${-BIG}" y="${-H + 70}" width="${BIG * 2}" height="${BIG}" fill="${dark ? '#1a2a3a' : '#e6eef3'}"/>`;
  for (let x = -W * 1.8, i = 0; x < W * 1.8; x += 16 + rnd('px' + i) * 14, i++) {
    const h = 34 + rnd('ph' + i) * 30, y = -H + 74 + rnd('py' + i) * 10;
    bg += `<path d="M${f1(x)},${f1(y - h)} L${f1(x + h * 0.32)},${f1(y)} H${f1(x - h * 0.32)} Z" fill="${pine}"/><path d="M${f1(x)},${f1(y - h)} l${f1(h * 0.1)},${f1(h * 0.3)} h${f1(-h * 0.2)} Z" fill="#f4f7fa"/>`;
  }
  for (let i = 0; i < 60; i++) bg += `<circle class="snow" style="animation-delay:-${f1(rnd('fd' + i) * 8)}s" cx="${f1((rnd('fx' + i) - 0.5) * W * 2.6)}" cy="${f1(-H - 260 + rnd('fy' + i) * 260)}" r="${f1(1 + rnd('fr' + i) * 1.4)}" fill="#fff" opacity=".9"/>`;
  return { bg, defs };
}

// ---- Casa del Viento: palacio tallado en la montaña, arcos abiertos al cielo estrellado y a la ciudad del valle ----
function wind(room, N, uid) {
  const w = room.wall, W = N * 32;
  const defs = `<linearGradient id="${uid}wsky" gradientUnits="userSpaceOnUse" x1="0" y1="${-H - 340}" x2="0" y2="${W}"><stop offset="0" stop-color="#070a22"/><stop offset=".45" stop-color="#1a2150"/><stop offset=".75" stop-color="#3b3470"/><stop offset="1" stop-color="#0d1230"/></linearGradient>`
    + `<linearGradient id="${uid}wview" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0e2c"/><stop offset=".6" stop-color="#2a2a66"/><stop offset="1" stop-color="#4a3c7a"/></linearGradient>`
    + `<linearGradient id="${uid}curt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset=".5" stop-color="#eef0ff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity=".12"/></linearGradient>`;
  // Fondo: cielo de estrellas, luna, montañas y la ciudad iluminada junto al río
  let bg = `<rect x="${-BIG}" y="${-BIG}" width="${BIG * 2}" height="${BIG * 2}" fill="url(#${uid}wsky)"/>`;
  bg += `<ellipse cx="${-W * 0.2}" cy="${-H - 200}" rx="${W * 1.6}" ry="40" fill="#c9c4ff" opacity=".07" transform="rotate(-12 ${-W * 0.2} ${-H - 200})"/>`;
  for (let i = 0; i < 160; i++) bg += `<circle ${i % 7 ? '' : `class="twinkle t${i % 3}" `}cx="${f1((rnd('a' + i) - 0.5) * W * 3.4)}" cy="${f1(-H - 360 + rnd('b' + i) * 330)}" r="${f1(0.5 + rnd('c' + i) * 1.3)}" fill="#fff" opacity="${f1(0.5 + rnd('d' + i) * 0.5)}"/>`;
  bg += `<circle cx="${W * 0.7}" cy="${-H - 210}" r="22" fill="#f3efe0"/><circle cx="${W * 0.7 + 9}" cy="${-H - 216}" r="20" fill="#0f1438"/><circle cx="${W * 0.7}" cy="${-H - 210}" r="60" fill="#f3efe0" opacity=".05"/>`;
  for (const [y0, col, amp] of [[-H - 20, '#1b2150', 120], [-H + 40, '#141a40', 80]]) {
    let d = `M${-W * 2},${y0}`;
    for (let x = -W * 2, i = 0; x < W * 2; i++) { const s = 60 + rnd(y0 + 's' + i) * 90; d += ` L${f1(x + s / 2)},${f1(y0 - amp * (0.4 + rnd(y0 + 'h' + i) * 0.6))} L${f1(x + s)},${y0}`; x += s; }
    bg += `<path d="${d} V${BIG} H${-W * 2} Z" fill="${col}"/>`;
  }
  bg += `<path d="M${-W * 2},${-H + 120} C${-W},${-H + 90} ${-W * 0.3},${-H + 160} ${W * 0.4},${-H + 110} S${W * 1.4},${-H + 150} ${W * 2},${-H + 120}" stroke="#7f8fd8" stroke-width="10" fill="none" opacity=".5"/>`;
  for (let i = 0; i < 220; i++) {
    const x = (rnd('lx' + i) - 0.5) * W * 3.4, y = -H + 60 + rnd('ly' + i) * 140;
    bg += `<circle ${i % 5 ? '' : `class="twinkle t${i % 3}" `}cx="${f1(x)}" cy="${f1(y)}" r="${f1(0.7 + rnd('lr' + i) * 1.2)}" fill="${i % 4 ? '#ffd98a' : '#cfe0ff'}"/>`;
  }
  const view = (x, y, ww, hh, seed) => {
    let g = `<svg x="${x}" y="${y}" width="${ww}" height="${hh}" overflow="hidden"><rect width="${ww}" height="${hh}" fill="url(#${uid}wview)"/>`;
    for (let i = 0; i < 12; i++) g += `<circle cx="${f1(rnd(seed + 's' + i) * ww)}" cy="${f1(rnd(seed + 't' + i) * hh * 0.5)}" r="${f1(0.5 + rnd(seed + 'u' + i))}" fill="#fff"/>`;
    g += `<path d="M0,${f1(hh * 0.55)} L${f1(ww * 0.25)},${f1(hh * 0.36)} L${f1(ww * 0.5)},${f1(hh * 0.5)} L${f1(ww * 0.78)},${f1(hh * 0.32)} L${ww},${f1(hh * 0.48)} V${hh} H0 Z" fill="#1b2150"/>`;
    g += `<rect y="${f1(hh * 0.68)}" width="${ww}" height="${f1(hh * 0.32)}" fill="#11163a"/><path d="M0,${f1(hh * 0.8)} Q${f1(ww * 0.5)},${f1(hh * 0.74)} ${ww},${f1(hh * 0.84)}" stroke="#8090dd" stroke-width="2.5" fill="none" opacity=".6"/>`;
    for (let i = 0; i < 14; i++) g += `<circle cx="${f1(rnd(seed + 'x' + i) * ww)}" cy="${f1(hh * 0.7 + rnd(seed + 'y' + i) * hh * 0.28)}" r=".9" fill="${i % 3 ? '#ffd98a' : '#cfe0ff'}"/>`;
    return g + '</svg>';
  };
  const walls = onWalls(N, (id) => {
    let s = stones(W, 0, H, 'w' + id, w, { rh: [26, 34], sw: [50, 90], r: 1.5, mortar: 0.84 });
    s += `<rect width="${W}" height="${H}" fill="#2a1d40" opacity=".12"/>`;
    for (let u0 = 0; u0 < W; u0 += 64) {
      const x = u0 + 11, ww = 42, top = 26, bot = H - 12, r = ww / 2;
      s += `<path d="M${x - 4},${bot} V${top + r} A${r + 4},${r + 4} 0 0 1 ${x + ww + 4},${top + r} V${bot} Z" fill="${shade(w, 1.12)}"/>`;
      s += view(x, top, ww, bot - top, id + u0);
      s += `<path d="M${x},${top} H${x + ww} V${top + r} A${r},${r} 0 0 0 ${x},${top + r} Z" fill="${shade(w, 1.12)}"/>`;
      s += `<path d="M${x},${bot} V${top + r} A${r},${r} 0 0 1 ${x + ww},${top + r} V${bot}" stroke="${shade(w, 0.7)}" stroke-width="1.2" fill="none"/><path d="M${x + ww / 2 - 4},${top - 3} h8 l-1.5,8 h-5 Z" fill="${shade(w, 1.2)}"/>`;
      // Barandilla de la terraza
      s += `<rect x="${x}" y="${bot - 28}" width="${ww}" height="3" fill="#d9d6e8"/><rect x="${x}" y="${bot - 4}" width="${ww}" height="4" fill="#bcb8d4"/>`;
      for (let b = x + 3; b < x + ww - 2; b += 6) s += `<rect x="${b}" y="${bot - 25}" width="2.6" height="21" rx="1.3" fill="#cfcbe2"/>`;
      // Cortinas finas movidas por el viento
      s += `<path class="curtain" d="M${x + 1},${top + 6} q10,40 3,${f1((bot - top) * 0.55)} q-3,${f1((bot - top) * 0.2)} 2,${f1((bot - top) * 0.38)} h-6 V${top + 6} Z" fill="url(#${uid}curt)"/>`;
      s += `<path class="curtain c2" d="M${x + ww - 1},${top + 6} q-10,40 -3,${f1((bot - top) * 0.55)} q3,${f1((bot - top) * 0.2)} -2,${f1((bot - top) * 0.38)} h6 V${top + 6} Z" fill="url(#${uid}curt)"/>`;
    }
    // Friso con estrellas plateadas
    s += `<rect width="${W}" height="14" fill="${shade(w, 0.85)}"/><rect y="14" width="${W}" height="2" fill="#c9cbe0"/>`;
    for (let u = 12; u < W; u += 24) s += `<path d="M${u},2 L${u + 1.6},5.4 L${u + 5},7 L${u + 1.6},8.6 L${u},12 L${u - 1.6},8.6 L${u - 5},7 L${u - 1.6},5.4 Z" fill="#dfe2f5"/>`;
    return s;
  });
  // Estrella de ocho puntas de plata en el suelo
  const R = Math.min(N * 32 * 0.26, 90), c = N * 16;
  let st = `<circle cx="${c}" cy="${c}" r="${R}" fill="none" stroke="#c9cbe0" stroke-width="1.6" opacity=".8"/><circle cx="${c}" cy="${c}" r="${R * 0.3}" fill="none" stroke="#c9cbe0" stroke-width="1" opacity=".8"/>`;
  const pts = Array.from({ length: 16 }, (_, i) => { const a = (i * Math.PI) / 8, rr = i % 2 ? R * 0.3 : (i % 4 ? R * 0.62 : R * 0.95); return [c + Math.cos(a) * rr, c + Math.sin(a) * rr]; });
  st += `<path d="${pathOf(pts)}Z" fill="#dfe2f5" opacity=".22" stroke="#dfe2f5" stroke-width="1"/>`;
  const back3d = `<g transform="${floorM(0, 0, 0.4)}">${st}</g>`;
  // Ráfagas de viento y luces feéricas flotando
  let fore = '';
  for (let i = 0; i < 5; i++) {
    const [x0, y0] = P(0, 1 + rnd('wy' + i) * (N - 2), 60 + rnd('wz' + i) * 120), [x1, y1] = P(N, 1 + rnd('wv' + i) * (N - 2), 60 + rnd('ww' + i) * 120);
    fore += `<path class="windline" style="animation-delay:-${f1(rnd('wd' + i) * 6)}s" d="M${x0},${y0} C${f1(x0 + 120)},${f1(y0 - 40)} ${f1(x1 - 140)},${f1(y1 + 40)} ${x1},${y1}" stroke="#e8ecff" stroke-width="1.4" fill="none" opacity=".45" stroke-linecap="round"/>`;
  }
  let lights = '';
  for (let i = 0; i < Math.round(N * 1.3); i++) {
    const [x, y] = P(0.6 + rnd('fx' + i) * (N - 1.2), 0.6 + rnd('fy' + i) * (N - 1.2), 120 + rnd('fz' + i) * 110);
    lights += `<g class="float" style="animation-delay:-${f1(rnd('fd' + i) * 4)}s"><circle cx="${x}" cy="${y}" r="12" fill="#cfe0ff" opacity=".18"/><circle cx="${x}" cy="${y}" r="5" fill="#e6eeff" opacity=".5"/><circle cx="${x}" cy="${y}" r="2.2" fill="#fff"/></g>`;
  }
  return { bg, walls, back3d, fore, lights, defs, noBaseboard: true, cap: shade(w, 1.05) };
}

// ---- Biblioteca victoriana: papel adamascado, friso de cuarterones y molduras ----
function victorian(room, N, uid) {
  const w = room.wall, W = N * 32, wood = '#5a3826';
  const defs = `<pattern id="${uid}dam" width="40" height="52" patternUnits="userSpaceOnUse"><rect width="40" height="52" fill="${w}"/>`
    + `<path d="M20,6 C27,14 31,21 20,32 C9,21 13,14 20,6 Z M20,32 C24,38 24,44 20,48 C16,44 16,38 20,32 Z" fill="${shade(w, 1.16)}" opacity=".55"/>`
    + `<path d="M8,20 q4,-6 0,-10 M32,20 q-4,-6 0,-10 M0,46 q4,-4 0,-8 M40,46 q-4,-4 0,-8" stroke="${shade(w, 1.2)}" stroke-width="1.2" fill="none" opacity=".5"/>`
    + `<circle cx="0" cy="0" r="2" fill="${shade(w, 1.2)}" opacity=".5"/><circle cx="40" cy="0" r="2" fill="${shade(w, 1.2)}" opacity=".5"/></pattern>`;
  const walls = onWalls(N, () => {
    let s = `<rect width="${W}" height="${H}" fill="url(#${uid}dam)"/>`;
    s += `<rect y="0" width="${W}" height="9" fill="${shade(wood, 0.7)}"/><rect y="9" width="${W}" height="3" fill="${shade(wood, 1.2)}"/>`;
    for (let u = 2; u < W; u += 7) s += `<rect x="${u}" y="12" width="4" height="5" fill="${shade(wood, 0.95)}"/>`;
    s += `<rect y="17" width="${W}" height="2" fill="${shade(wood, 0.6)}"/><rect y="32" width="${W}" height="2.5" fill="#b08d4a"/>`;
    const top = H - 68;
    s += `<rect y="${top}" width="${W}" height="${H - top}" fill="${wood}"/>`;
    for (let u = 0; u < W; u += 48) {
      s += `<rect x="${u + 5}" y="${top + 12}" width="38" height="40" fill="${shade(wood, 0.82)}"/>`;
      s += `<path d="M${u + 5},${top + 52} V${top + 12} H${u + 43}" stroke="${shade(wood, 1.35)}" stroke-width="1.6" fill="none"/><path d="M${u + 43},${top + 12} V${top + 52} H${u + 5}" stroke="${shade(wood, 0.55)}" stroke-width="1.6" fill="none"/>`;
      s += `<rect x="${u + 11}" y="${top + 18}" width="26" height="28" fill="${shade(wood, 1.06)}"/><path d="M${u + 11},${top + 46} V${top + 18} H${u + 37}" stroke="${shade(wood, 0.7)}" stroke-width="1.2" fill="none"/>`;
    }
    s += `<rect y="${top - 5}" width="${W}" height="7" fill="${shade(wood, 1.15)}"/><rect y="${top - 5}" width="${W}" height="1.6" fill="${shade(wood, 1.5)}"/><rect y="${H - 10}" width="${W}" height="10" fill="${shade(wood, 0.62)}"/>`;
    return s;
  });
  return { walls, defs, noBaseboard: true };
}

// ---- Castillo de cuento: papel rosa con flores de lis, friso blanco y dorado, cortinajes y destellos ----
function fairytale(room, N, uid) {
  const w = room.wall, W = N * 32, white = '#fbf4f1', gold = '#d4af37';
  const defs = `<linearGradient id="${uid}gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6e08a"/><stop offset=".5" stop-color="${gold}"/><stop offset="1" stop-color="#9c7a1e"/></linearGradient>`
    + `<pattern id="${uid}fl" width="24" height="30" patternUnits="userSpaceOnUse"><rect width="24" height="30" fill="${w}"/><rect x="12" width="12" height="30" fill="${shade(w, 1.07)}"/>`
    + `<path d="M18,9 q-2,4 0,8 q2,-4 0,-8 M15,13 q2,1 3,4 M21,13 q-2,1 -3,4" stroke="${gold}" stroke-width=".9" fill="none" opacity=".75"/></pattern>`;
  const walls = onWalls(N, () => {
    let s = `<rect width="${W}" height="${H}" fill="url(#${uid}fl)"/>`;
    const top = H - 60;
    s += `<rect y="${top}" width="${W}" height="${H - top}" fill="${white}"/>`;
    for (let u = 0; u < W; u += 40) s += `<rect x="${u + 5}" y="${top + 9}" width="30" height="40" rx="6" fill="${shade(white, 0.97)}" stroke="${gold}" stroke-width="1.3"/><circle cx="${u + 20}" cy="${top + 29}" r="3" fill="none" stroke="${gold}" stroke-width="1"/>`;
    s += `<rect y="${top - 4}" width="${W}" height="6" fill="url(#${uid}gold)"/><rect y="${H - 7}" width="${W}" height="7" fill="url(#${uid}gold)"/>`;
    s += `<rect y="0" width="${W}" height="12" fill="${white}"/><rect y="12" width="${W}" height="3" fill="url(#${uid}gold)"/>`;
    for (let u = 0; u < W; u += 64) {
      s += `<path d="M${u},14 Q${u + 32},46 ${u + 64},14 L${u + 64},20 Q${u + 32},54 ${u},20 Z" fill="${shade(w, 0.78)}"/>`;
      s += `<path d="M${u + 6},20 Q${u + 32},44 ${u + 58},20" stroke="${shade(w, 1.15)}" stroke-width="1.5" fill="none" opacity=".7"/>`;
      s += `<line x1="${u}" y1="14" x2="${u}" y2="34" stroke="${gold}" stroke-width="1.2"/><path d="M${u - 3},34 h6 l-1,9 h-4 Z" fill="url(#${uid}gold)"/><circle cx="${u}" cy="16" r="3" fill="url(#${uid}gold)"/>`;
    }
    return s;
  });
  const pil = (x, y) => box(x - 0.06, y - 0.06, 0, 0.44, 0.44, 10, gold) + box(x, y, 10, 0.32, 0.32, H - 32, white)
    + box(x - 0.06, y - 0.06, H - 22, 0.44, 0.44, 10, gold) + box(x - 0.09, y - 0.09, H - 12, 0.5, 0.5, 6, white);
  const back3d = pil(0, 0) + pil(N - 0.38, 0) + pil(0, N - 0.38);
  let fore = '';
  for (let i = 0; i < N * 2.2; i++) {
    const [x, y] = P(0.5 + rnd('sx' + i) * (N - 1), 0.5 + rnd('sy' + i) * (N - 1), 50 + rnd('sz' + i) * 170);
    const k = 2 + rnd('sk' + i) * 3;
    fore += `<path class="twinkle t${i % 3}" d="M${x},${f1(y - k)} Q${x},${y} ${f1(x + k)},${y} Q${x},${y} ${x},${f1(y + k)} Q${x},${y} ${f1(x - k)},${y} Q${x},${y} ${x},${f1(y - k)} Z" fill="#fff6d0" opacity=".85"/>`;
  }
  return { walls, back3d, fore, defs, noBaseboard: true };
}

// ---- Torre del mago: piedra azulada con constelaciones, círculo arcano y velas que flotan ----
function tower(room, N, uid) {
  const w = room.wall, W = N * 32;
  const walls = onWalls(N, (id) => {
    let s = stones(W, 0, H, 'm' + id, w, { rh: [14, 19], sw: [22, 46], r: 2, mortar: 0.55 });
    for (let g = 0; g < W / 60; g++) {
      const cx = rnd(id + 'g' + g) * W, cy = 14 + rnd(id + 'h' + g) * 80;
      const pts = Array.from({ length: 4 + Math.floor(rnd(id + 'n' + g) * 3) }, (_, i) => [cx + (rnd(id + g + 'x' + i) - 0.5) * 60, cy + (rnd(id + g + 'y' + i) - 0.5) * 40]);
      s += `<path d="${pathOf(pts)}" stroke="#cdb8ff" stroke-width=".8" fill="none" opacity=".45"/>`;
      s += pts.map(([x, y], i) => `<circle class="twinkle t${i % 3}" cx="${f1(x)}" cy="${f1(y)}" r="${i ? 1.3 : 2}" fill="#fff3c4"/>`).join('');
    }
    const cx = id === 'b' ? W * 0.62 : W * 0.42, cy = 70;
    let c = `<circle cx="${f1(cx)}" cy="${cy}" r="38" fill="none" stroke="#d9bd6c" stroke-width="1.4"/><circle cx="${f1(cx)}" cy="${cy}" r="30" fill="none" stroke="#d9bd6c" stroke-width=".8"/>`;
    for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; c += `<path d="M${f1(cx + Math.cos(a) * 30)},${f1(cy + Math.sin(a) * 30)} L${f1(cx + Math.cos(a) * 38)},${f1(cy + Math.sin(a) * 38)}" stroke="#d9bd6c" stroke-width="1"/><circle cx="${f1(cx + Math.cos(a + 0.26) * 34)}" cy="${f1(cy + Math.sin(a + 0.26) * 34)}" r="1.2" fill="#d9bd6c"/>`; }
    c += `<path d="M${f1(cx)},${cy - 30} L${f1(cx + 26)},${cy + 15} L${f1(cx - 26)},${cy + 15} Z M${f1(cx)},${cy + 30} L${f1(cx + 26)},${cy - 15} L${f1(cx - 26)},${cy - 15} Z" stroke="#d9bd6c" stroke-width=".9" fill="none"/><circle cx="${f1(cx)}" cy="${cy}" r="5" fill="#d9bd6c" opacity=".6"/>`;
    s += `<g opacity=".45">${c}</g>`;
    return s;
  });
  // Velas flotando en el aire
  let lights = '';
  const n = Math.round(N * 1.1);
  for (let i = 0; i < n; i++) {
    const [x, y] = P(0.8 + rnd('cx' + i) * (N - 1.6), 0.8 + rnd('cy' + i) * (N - 1.6), 160 + rnd('cz' + i) * 80);
    const hh = 10 + rnd('ch' + i) * 8;
    lights += `<g class="float" style="animation-delay:-${f1(rnd('cd' + i) * 4)}s"><circle cx="${x}" cy="${f1(y - hh - 4)}" r="14" fill="url(#glow)"/>`
      + `<rect x="${x - 2.2}" y="${f1(y - hh)}" width="4.4" height="${f1(hh)}" rx="1" fill="#f3ead8"/><rect x="${x - 2.2}" y="${f1(y - hh)}" width="1.4" height="${f1(hh)}" fill="#fff" opacity=".5"/>`
      + `<path d="M${x - 2.2},${f1(y - hh + 1)} q1,3 2,0 q1,4 2.4,0" fill="#f3ead8"/>`
      + `<path class="flame" d="M${x},${f1(y - hh - 1)} q-2.6,-3.6 0,-8 q2.6,4.4 0,8 Z" fill="#ffb84d"/><path class="flame f2" d="M${x},${f1(y - hh - 1.5)} q-1.2,-1.8 0,-4 q1.2,2.2 0,4 Z" fill="#fff2b0"/></g>`;
  }
  // Círculo mágico en el suelo
  const R = Math.min(N * 32 * 0.28, 96), c = N * 16;
  let mc = `<circle cx="${c}" cy="${c}" r="${R + 14}" fill="url(#${uid}mc)"/><circle cx="${c}" cy="${c}" r="${R}" fill="none" stroke="#b89cff" stroke-width="2.2"/><circle cx="${c}" cy="${c}" r="${R - 14}" fill="none" stroke="#b89cff" stroke-width="1.2"/>`;
  const star = Array.from({ length: 6 }, (_, i) => [c + Math.cos((i * Math.PI) / 3 - Math.PI / 2) * (R - 14), c + Math.sin((i * Math.PI) / 3 - Math.PI / 2) * (R - 14)]);
  mc += `<path d="${pathOf([star[0], star[2], star[4]])}Z ${pathOf([star[1], star[3], star[5]])}Z" stroke="#b89cff" stroke-width="1.2" fill="none"/>`;
  for (let i = 0; i < 18; i++) {
    const a = (i * 2 * Math.PI) / 18, x = c + Math.cos(a) * (R - 7), y = c + Math.sin(a) * (R - 7);
    mc += `<path d="M${f1(x - 2.5)},${f1(y - 2)} l2.5,4 2.5,-4 M${f1(x)},${f1(y - 3)} v6" stroke="#d9c8ff" stroke-width=".9" fill="none" transform="rotate(${f1((a * 180) / Math.PI + 90)} ${f1(x)} ${f1(y)})"/>`;
  }
  const back3d = `<g class="rune" transform="${floorM(0, 0, 0.5)}">${mc}</g>`;
  const defs = `<radialGradient id="${uid}mc"><stop offset="0" stop-color="#b89cff" stop-opacity=".28"/><stop offset=".85" stop-color="#7a5ad6" stop-opacity=".12"/><stop offset="1" stop-color="#7a5ad6" stop-opacity="0"/></radialGradient>`;
  return { walls, lights, back3d, defs };
}

// ---- Jardín zen: estructura de madera, celosías de papel y dos paneles abiertos al jardín ----
function zen(room, N, uid) {
  const w = room.wall, W = N * 32, fr = '#5b4030';
  const defs = `<pattern id="${uid}kumi" width="16" height="22" patternUnits="userSpaceOnUse"><rect width="16" height="22" fill="${w}"/><rect width="16" height="22" fill="none" stroke="${fr}" stroke-width="1"/></pattern>`
    + `<pattern id="${uid}ranma" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="${shade(w, 0.96)}"/><path d="M0,0 L10,10 M10,0 L0,10" stroke="${fr}" stroke-width=".9"/></pattern>`
    + `<radialGradient id="${uid}paper"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`
    + `<linearGradient id="${uid}zsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe0f2"/><stop offset="1" stop-color="#eef6f0"/></linearGradient>`;
  const garden = (u0, v0, ww, hh, seed) => {
    let g = `<svg x="${u0}" y="${v0}" width="${ww}" height="${hh}" overflow="hidden"><rect width="${ww}" height="${hh}" fill="url(#${uid}zsky)"/>`;
    g += `<path d="M0,${hh * 0.55} L${ww * 0.3},${hh * 0.3} L${ww * 0.55},${hh * 0.5} L${ww * 0.8},${hh * 0.28} L${ww},${hh * 0.45} V${hh} H0 Z" fill="#9bb7b0" opacity=".7"/>`;
    g += `<rect y="${hh * 0.66}" width="${ww}" height="${hh * 0.34}" fill="#e6dfcf"/>`;
    for (let i = 0; i < 6; i++) g += `<path d="M0,${f1(hh * 0.7 + i * 5)} q${ww / 4},-3 ${ww / 2},0 t${ww / 2},0" stroke="#cfc6b2" stroke-width=".8" fill="none"/>`;
    g += `<ellipse cx="${ww * 0.6}" cy="${hh * 0.82}" rx="9" ry="4.5" fill="#8d8a82"/><ellipse cx="${ww * 0.6}" cy="${hh * 0.8}" rx="7" ry="3" fill="#a9a59c"/>`;
    for (let i = 0; i < 4; i++) {
      const x = 6 + i * 9 + rnd(seed + 'b' + i) * 4;
      g += `<rect x="${f1(x)}" y="0" width="4" height="${hh * 0.75}" fill="${i % 2 ? '#6f9a4a' : '#83ad58'}"/>`;
      for (let k = 12; k < hh * 0.7; k += 16) g += `<rect x="${f1(x - 0.5)}" y="${k}" width="5" height="1.6" fill="#4f7a34"/>`;
      g += `<ellipse cx="${f1(x + 7)}" cy="${12 + i * 9}" rx="7" ry="2" fill="#5f9a45" transform="rotate(-25 ${f1(x + 7)} ${12 + i * 9})"/>`;
    }
    for (let i = 0; i < 9; i++) g += `<circle cx="${f1(ww * 0.62 + (rnd(seed + 'm' + i) - 0.3) * ww * 0.5)}" cy="${f1(10 + rnd(seed + 'n' + i) * 28)}" r="${f1(6 + rnd(seed + 'r' + i) * 6)}" fill="${['#c8472d', '#e0703a', '#b23a26'][i % 3]}" opacity=".95"/>`;
    g += `<path d="M${ww * 0.75},${hh * 0.7} q-4,-20 -12,-34" stroke="#4a3426" stroke-width="2.5" fill="none"/></svg>`;
    return g;
  };
  const walls = onWalls(N, (id) => {
    let s = `<rect width="${W}" height="${H}" fill="${w}"/><rect y="47" width="${W}" height="${H - 61}" fill="url(#${uid}kumi)"/>`;
    for (let u = 0; u < W; u += 64) s += `<ellipse cx="${u + 32}" cy="${(H + 33) / 2}" rx="34" ry="60" fill="url(#${uid}paper)"/>`;
    const open = Math.floor(W / 64) - 1;
    s += garden(open * 64 + 3, 47, 58, H - 61, id);
    s += `<rect y="12" width="${W}" height="30" fill="url(#${uid}ranma)"/>`;
    for (let u = 0; u <= W; u += 64) s += `<rect x="${u - 3}" y="0" width="6" height="${H}" fill="${fr}"/><rect x="${u - 3}" y="0" width="1.4" height="${H}" fill="${shade(fr, 1.4)}" opacity=".5"/>`;
    s += `<rect y="0" width="${W}" height="12" fill="${shade(fr, 0.85)}"/><rect y="42" width="${W}" height="5" fill="${fr}"/><rect y="${H - 14}" width="${W}" height="14" fill="${shade(fr, 1.1)}"/><rect y="${H - 14}" width="${W}" height="1.6" fill="${shade(fr, 1.5)}"/>`;
    return s;
  });
  let fore = '';
  for (let i = 0; i < N * 2; i++) {
    const [x, y] = P(0.3 + rnd('px' + i) * (N - 0.6), 0.3 + rnd('py' + i) * (N - 0.6), 70 + rnd('pz' + i) * 160);
    fore += `<ellipse class="petal" style="animation-delay:-${f1(rnd('pd' + i) * 9)}s" cx="${x}" cy="${y}" rx="2.8" ry="1.6" fill="${i % 4 ? '#f6c1d0' : '#fbe1e8'}"/>`;
  }
  return { walls, defs, fore, noBaseboard: true };
}

// ---- Bosque de hadas: al aire libre, con árboles alrededor, copas, matorrales y rayos de luz ----
function forest(room, N, uid, night) {
  const W = N * 32;
  const dark = night || skyColors(new Date().getHours())[0] === '#1c2448';
  const C = dark
    ? { sky: ['#0b1526', '#132a33', '#0c1d18'], far: '#173233', near: '#112623', bark: ['#2a2019', '#4a3a2c'], leaf: ['#2f5a3a', '#1d3d29', '#3f6e46'], ray: '#a9c4ff' }
    : { sky: ['#d9efe2', '#9cc9a6', '#3f6b4a'], far: '#a9cfb0', near: '#7aa982', bark: ['#4a3626', '#7a5c40'], leaf: ['#5f9a4f', '#3f7a3f', '#86b85f'], ray: '#fff6cf' };
  const defs = `<linearGradient id="${uid}fsky" gradientUnits="userSpaceOnUse" x1="0" y1="${-H - 320}" x2="0" y2="${W}"><stop offset="0" stop-color="${C.sky[0]}"/><stop offset=".45" stop-color="${C.sky[1]}"/><stop offset="1" stop-color="${C.sky[2]}"/></linearGradient>`
    + `<linearGradient id="${uid}bark" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${shade(C.bark[0], 0.8)}"/><stop offset=".35" stop-color="${C.bark[1]}"/><stop offset=".7" stop-color="${C.bark[0]}"/><stop offset="1" stop-color="${shade(C.bark[0], 0.6)}"/></linearGradient>`
    + `<radialGradient id="${uid}leaf" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="${C.leaf[2]}"/><stop offset=".6" stop-color="${C.leaf[0]}"/><stop offset="1" stop-color="${C.leaf[1]}"/></radialGradient>`
    + `<linearGradient id="${uid}ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.ray}" stop-opacity="${dark ? 0.1 : 0.28}"/><stop offset="1" stop-color="${C.ray}" stop-opacity="0"/></linearGradient>`;
  // Fondo: cielo, dos filas de bosque lejano y el suelo del bosque
  let bg = `<rect x="${-BIG}" y="${-BIG}" width="${BIG * 2}" height="${BIG * 2}" fill="url(#${uid}fsky)"/>`;
  bg += dark ? `<circle cx="${-W * 0.55}" cy="${-H - 120}" r="18" fill="#f4ecc8" opacity=".9"/><circle cx="${-W * 0.55}" cy="${-H - 120}" r="40" fill="#f4ecc8" opacity=".08"/>`
    : `<circle cx="${-W * 0.55}" cy="${-H - 120}" r="60" fill="#fffbe0" opacity=".35"/>`;
  for (const [base, col, step, rmin] of [[-H - 40, C.far, 30, 26], [-H + 40, C.near, 26, 30]]) {
    bg += `<rect x="${-BIG}" y="${base}" width="${BIG * 2}" height="${BIG}" fill="${col}"/>`;
    for (let x = -W - 360, i = 0; x < W + 360; x += step, i++) {
      const r = rmin + rnd(base + 'r' + i) * 22;
      bg += `<circle cx="${x}" cy="${f1(base - rnd(base + 'y' + i) * 30)}" r="${f1(r)}" fill="${col}"/>`;
      if (i % 3 === 0) bg += `<rect x="${x - 2}" y="${base}" width="4" height="60" fill="${shade(col, 0.75)}"/>`;
    }
  }
  // Árboles en el borde de la sala (detrás de lo que coloques)
  const trees = [[-0.15, -0.15, 0.42, 'corner']];
  for (let x = 1.1, i = 0; x < N - 0.2; x += 1.5 + rnd('tx' + i) * 1.1, i++) trees.push([x, -0.15, 0.24 + rnd('tr' + i) * 0.1, 'b' + i]);
  for (let y = 1.3, i = 0; y < N - 0.2; y += 1.5 + rnd('ty' + i) * 1.1, i++) trees.push([-0.15, y, 0.24 + rnd('ts' + i) * 0.1, 'a' + i]);
  trees.sort((p, q) => p[0] + p[1] - (q[0] + q[1]));
  let back3d = '', canopy = '', lights = '';
  const fairyDoorAt = trees[Math.min(trees.length - 1, 2)][3];
  for (const [tx, ty, r, id] of trees) {
    const [bx, by] = P(tx, ty, 0), rx = r * 45, top = by - H - 170;
    let t = `<ellipse cx="${bx}" cy="${by + 2}" rx="${f1(rx * 2.2)}" ry="${f1(rx * 0.8)}" fill="#000" opacity=".18"/>`;
    t += `<path d="M${f1(bx - rx)},${f1(top)} C${f1(bx - rx * 0.92)},${f1(by - 70)} ${f1(bx - rx * 1.05)},${f1(by - 16)} ${f1(bx - rx * 1.9)},${f1(by + 4)} L${f1(bx + rx * 1.9)},${f1(by + 4)} C${f1(bx + rx * 1.05)},${f1(by - 16)} ${f1(bx + rx * 0.92)},${f1(by - 70)} ${f1(bx + rx)},${f1(top)} Z" fill="url(#${uid}bark)"/>`;
    for (let k = 0; k < 5; k++) {
      const ox = (rnd(id + 'l' + k) - 0.5) * rx * 1.4;
      t += `<path d="M${f1(bx + ox)},${f1(by - 6)} q${f1(rx * 0.15)},-40 0,-80 t0,-80 t0,-80" stroke="${shade(C.bark[0], 0.7)}" stroke-width="1.4" fill="none" opacity=".55"/>`;
    }
    t += `<path d="M${f1(bx - rx * 1.9)},${f1(by + 4)} q${f1(rx * 0.6)},-10 ${f1(rx * 1.2)},-12 M${f1(bx + rx * 1.9)},${f1(by + 4)} q${f1(-rx * 0.6)},-10 ${f1(-rx * 1.2)},-12" stroke="${shade(C.bark[0], 0.6)}" stroke-width="2" fill="none"/>`;
    t += `<path d="M${f1(bx - rx * 1.2)},${f1(by - 4)} q${f1(rx * 0.4)},-14 ${f1(rx * 0.9)},-10 q${f1(rx * 0.3)},-6 ${f1(rx * 0.6)},2 L${f1(bx - rx * 0.1)},${f1(by + 2)} Z" fill="${dark ? '#2f5a2c' : '#6f9a3a'}" opacity=".9"/>`;
    if (rnd(id + 'f') < 0.5) t += `<path d="M${f1(bx + rx * 0.6)},${f1(by - 60)} q${f1(rx * 0.8)},-2 ${f1(rx)},4 q-${f1(rx * 0.5)},3 -${f1(rx)},-1 Z" fill="#d9b98a"/><path d="M${f1(bx + rx * 0.5)},${f1(by - 48)} q${f1(rx * 0.6)},-2 ${f1(rx * 0.8)},3 q-${f1(rx * 0.4)},2 -${f1(rx * 0.8)},-1 Z" fill="#c9a575"/>`;
    if (id === fairyDoorAt) {
      t += `<path d="M${f1(bx - 7)},${by} v-14 a7,7 0 0 1 14,0 v14 Z" fill="#8a5a3a" stroke="#5a3a24" stroke-width="1.2"/><circle cx="${bx}" cy="${by - 13}" r="2.6" fill="#ffd97a"/><circle cx="${bx + 4}" cy="${by - 6}" r="1" fill="#e8c35a"/>`;
      t += `<rect x="${bx - 9}" y="${by}" width="18" height="2.5" rx="1" fill="#9a9488"/>`;
      lights += `<circle cx="${bx}" cy="${by - 13}" r="10" fill="url(#glow)"/>`;
    }
    // Matorrales y helechos al pie
    const bushes = 3 + Math.floor(rnd(id + 'n') * 3);
    for (let k = 0; k < bushes; k++) {
      const [ux, uy] = P(tx + (id[0] === 'a' ? 0.2 : 0.5 + k * 0.28), ty + (id[0] === 'a' ? 0.5 + k * 0.28 : 0.2), 0);
      const rr = 9 + rnd(id + 'br' + k) * 10;
      t += `<circle cx="${ux}" cy="${f1(uy - rr * 0.6)}" r="${f1(rr)}" fill="url(#${uid}leaf)"/>`;
    }
    if (rnd(id + 'fx') < 0.6) {
      const [fx, fy] = P(tx + (id[0] === 'a' ? 0.25 : 0.9), ty + (id[0] === 'a' ? 0.9 : 0.25), 0);
      t += `<path d="M${fx},${fy} v-34" stroke="#4f7a3a" stroke-width="1.4"/>` + [0, 1, 2, 3, 4, 5].map((k) => `<ellipse cx="${f1(fx + (k % 2 ? 2.5 : -2.5))}" cy="${f1(fy - 12 - k * 4)}" rx="2.4" ry="3.2" fill="${dark ? '#8a6bb0' : '#c98ad8'}"/>`).join('');
    }
    back3d += t;
    // Copa
    for (let k = 0; k < 6; k++) {
      const ox = (rnd(id + 'cx' + k) - 0.5) * 120, oy = -H - 60 - rnd(id + 'cy' + k) * 110, rr = 34 + rnd(id + 'cr' + k) * 30;
      canopy += `<circle cx="${f1(bx + ox)}" cy="${f1(by + oy)}" r="${f1(rr)}" fill="url(#${uid}leaf)"/>`;
    }
    // Hiedra colgando
    for (let k = 0; k < 2; k++) {
      const ox = (rnd(id + 'vx' + k) - 0.5) * 70, y0 = by - H - 30, len = 40 + rnd(id + 'vl' + k) * 70;
      let v = `<path d="M${f1(bx + ox)},${f1(y0)} q4,${f1(len / 2)} -2,${f1(len)}" stroke="${C.leaf[1]}" stroke-width="1.2" fill="none"/>`;
      for (let j = 6; j < len; j += 7) v += `<ellipse cx="${f1(bx + ox + (j % 14 ? 3 : -3))}" cy="${f1(y0 + j)}" rx="2.4" ry="3.6" fill="${C.leaf[j % 3]}"/>`;
      canopy += v;
    }
  }
  back3d += canopy;
  // Guirnaldas de lucecitas entre los árboles
  for (let i = 0; i + 1 < trees.length; i++) {
    const [ax, ay] = P(trees[i][0], trees[i][1], H - 20), [cx, cy] = P(trees[i + 1][0], trees[i + 1][1], H - 20);
    if (Math.hypot(cx - ax, cy - ay) > 160) continue;
    const mx = (ax + cx) / 2, my = (ay + cy) / 2 + 24;
    lights += `<path d="M${ax},${ay} Q${f1(mx)},${f1(my)} ${cx},${cy}" stroke="${dark ? '#3a3a2a' : '#5a4a3a'}" stroke-width=".7" fill="none"/>`;
    for (let k = 1; k < 8; k++) {
      const t = k / 8, x = (1 - t) * (1 - t) * ax + 2 * (1 - t) * t * mx + t * t * cx, y = (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * my + t * t * cy;
      lights += `<circle class="twinkle t${k % 3}" cx="${f1(x)}" cy="${f1(y + 2)}" r="2" fill="#ffe7a0"/>${dark ? `<circle cx="${f1(x)}" cy="${f1(y + 2)}" r="7" fill="url(#glow)"/>` : ''}`;
    }
  }
  // Rayos de luz entre los árboles y polen (o luciérnagas por la noche)
  let fore = '';
  for (let i = 0; i < (dark ? 2 : 4); i++) {
    const x0 = -W * 0.6 + i * W * 0.4 + rnd('rx' + i) * 40, w0 = 16 + rnd('rw' + i) * 20;
    fore += `<path class="ray" style="animation-delay:-${i * 2}s" d="M${f1(x0)},${-H - 10} h${f1(w0)} L${f1(x0 + w0 + 200)},${W} h${f1(-w0 * 3)} Z" fill="url(#${uid}ray)"/>`;
  }
  for (let i = 0; i < N * (dark ? 2.5 : 3); i++) {
    const [x, y] = P(0.4 + rnd('fx' + i) * (N - 0.8), 0.4 + rnd('fy' + i) * (N - 0.8), 20 + rnd('fz' + i) * 140);
    if (dark) lights += `<g class="firefly" style="animation-delay:-${f1(rnd('fd' + i) * 6)}s"><circle cx="${x}" cy="${y}" r="7" fill="url(#glow)"/><circle cx="${x}" cy="${y}" r="1.5" fill="#f8ff9a"/></g>`;
    else fore += `<circle class="twinkle t${i % 3}" cx="${x}" cy="${y}" r="1.3" fill="#fffbe0" opacity=".9"/>`;
  }
  return { bg, back3d, fore, lights, defs, hideWalls: true };
}

// ---- Cúpula botánica: invernadero de hierro blanco y cristal, con jardín fuera y cúpula encima ----
function glasshouse(room, N, uid, night) {
  const W = N * 32;
  const [sa, sb] = skyColors(new Date().getHours());
  const dark = sa === '#1c2448';
  const iron = '#f2f4f1', ironS = '#b9c4bf';
  const outT = dark ? '#1c2f3a' : '#7fb37a', hedge = dark ? '#16262d' : '#5c9655', lawn = dark ? ['#16252c', '#0f1b20'] : ['#a3cf8e', '#6fa865'];
  const defs = `<linearGradient id="${uid}gsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sa}"/><stop offset="1" stop-color="${sb}"/></linearGradient>`
    + `<linearGradient id="${uid}bgsky" gradientUnits="userSpaceOnUse" x1="0" y1="${-H - 300}" x2="0" y2="0"><stop offset="0" stop-color="${sa}"/><stop offset="1" stop-color="${sb}"/></linearGradient>`
    + `<linearGradient id="${uid}lawn" gradientUnits="userSpaceOnUse" x1="0" y1="-30" x2="0" y2="${W + 200}"><stop offset="0" stop-color="${lawn[0]}"/><stop offset="1" stop-color="${lawn[1]}"/></linearGradient>`
    + `<linearGradient id="${uid}glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#dff6f0" stop-opacity=".06"/><stop offset="1" stop-color="#fff" stop-opacity=".16"/></linearGradient>`;
  // Fuera: cielo, árboles lejanos y césped
  let bg = `<rect x="${-BIG}" y="${-BIG}" width="${BIG * 2}" height="${BIG * 2}" fill="url(#${uid}bgsky)"/>`;
  if (dark) for (let i = 0; i < 60; i++) bg += `<circle cx="${f1((rnd('s' + i) - 0.5) * W * 3)}" cy="${f1(-H - 300 + rnd('t' + i) * 260)}" r="${f1(0.6 + rnd('u' + i))}" fill="#fff" opacity=".8"/>`;
  else for (let i = 0; i < 6; i++) bg += `<ellipse cx="${f1((rnd('c' + i) - 0.5) * W * 2.6)}" cy="${f1(-H - 200 + rnd('d' + i) * 120)}" rx="${f1(30 + rnd('e' + i) * 30)}" ry="9" fill="#fff" opacity=".8"/>`;
  for (let x = -W * 1.6, i = 0; x < W * 1.6; x += 28, i++) bg += `<circle cx="${f1(x)}" cy="${f1(-40 - rnd('g' + i) * 40)}" r="${f1(26 + rnd('h' + i) * 22)}" fill="${outT}"/>`;
  bg += `<rect x="${-BIG}" y="-40" width="${BIG * 2}" height="${BIG}" fill="url(#${uid}lawn)"/>`;
  // Paredes de cristal: se ve el jardín a través, con reflejos, arcos de hierro y zócalo de ladrillo
  const walls = onWalls(N, (id) => {
    let s = `<rect width="${W}" height="${H}" fill="url(#${uid}gsky)"/>`;
    if (dark) for (let i = 0; i < W / 10; i++) s += `<circle cx="${f1(rnd(id + 's' + i) * W)}" cy="${f1(rnd(id + 't' + i) * 70)}" r=".8" fill="#fff" opacity=".8"/>`;
    for (let u = -10, i = 0; u < W + 20; u += 24, i++) s += `<circle cx="${u}" cy="${f1(H - 62 - rnd(id + 'tr' + i) * 26)}" r="${f1(18 + rnd(id + 'rr' + i) * 12)}" fill="${outT}"/>`;
    s += `<rect y="${H - 60}" width="${W}" height="40" fill="${outT}"/><rect y="${H - 46}" width="${W}" height="18" rx="6" fill="${hedge}"/>`;
    s += `<rect width="${W}" height="${H}" fill="url(#${uid}glass)"/>`;
    for (let u = 20, i = 0; u < W + 60; u += 70 + rnd(id + 'rf' + i) * 50, i++) {
      s += `<path d="M${f1(u)},0 h18 L${f1(u - 50)},${H - 28} h-18 Z" fill="#fff" opacity=".14"/><path d="M${f1(u + 26)},0 h5 L${f1(u - 19)},${H - 28} h-5 Z" fill="#fff" opacity=".12"/>`;
    }
    // Ladrillo y remate de piedra
    s += `<rect y="${H - 28}" width="${W}" height="28" fill="#9c5440"/>`;
    for (let v = H - 28, r = 0; v < H; v += 7, r++) {
      s += `<path d="M0,${v} H${W}" stroke="#d8c6b0" stroke-width=".8"/>`;
      for (let u = (r % 2) * 8; u < W; u += 16) s += `<path d="M${u},${v} v7" stroke="#d8c6b0" stroke-width=".8"/><rect x="${u + 1}" y="${v + 1}" width="14" height="5" fill="${shade('#9c5440', 0.9 + rnd(id + r + 'b' + u) * 0.22)}"/>`;
    }
    s += `<rect y="${H - 32}" width="${W}" height="5" fill="#e6e0d4"/><rect y="${H - 32}" width="${W}" height="1.5" fill="#fff"/>`;
    // Hierro blanco: montantes, travesaños y arcos de cada vano
    for (let u = 0; u <= W; u += 32) {
      s += `<rect x="${u - 2.2}" y="0" width="4.4" height="${H - 32}" fill="${iron}"/><rect x="${u + 1.2}" y="0" width="1" height="${H - 32}" fill="${ironS}"/>`;
      if (u < W) s += `<path d="M${u + 2},46 V26 A14,14 0 0 1 ${u + 30},26 V46" stroke="${iron}" stroke-width="2.2" fill="none"/><circle cx="${u + 16}" cy="14" r="4" stroke="${iron}" stroke-width="1.6" fill="none"/>`;
    }
    s += `<rect y="0" width="${W}" height="6" fill="${iron}"/><rect y="45" width="${W}" height="3" fill="${iron}"/><rect y="${H - 74}" width="${W}" height="3" fill="${iron}"/>`;
    return s;
  });
  // Cúpula de cristal sobre la sala: la mitad de atrás detrás de los muebles y la de delante por encima
  const cx = N / 2, cy = N / 2, r = N / 2, Rz = N * 16;
  const D = (th, ph) => P(cx + r * Math.cos(ph) * Math.cos(th), cy + r * Math.cos(ph) * Math.sin(th), H + Rz * Math.sin(ph));
  const isBack = (th) => Math.cos(th) + Math.sin(th) < -1e-6;
  const M = 16, rings = [0, 0.3, 0.6, 0.9, 1.2, 1.45];
  let back3d = '', fore = '';
  // Cristal de la esquina del fondo, entre las paredes y el arranque de la cúpula
  const corner = [[0, 0, H], [N / 2, 0, H], ...Array.from({ length: 9 }, (_, i) => { const th = (3 * Math.PI) / 2 - (i * Math.PI) / 16; return [cx + r * Math.cos(th), cy + r * Math.sin(th), H]; }), [0, N / 2, H]];
  back3d += poly(corner, `fill="#e8f6f2" opacity=".28"`) + poly(corner, `fill="none" stroke="${iron}" stroke-width="1.6"`);
  for (let k = 0; k < M; k++) {
    const t0 = (k * 2 * Math.PI) / M, t1 = ((k + 1) * 2 * Math.PI) / M, back = isBack((t0 + t1) / 2);
    for (let j = 0; j + 1 < rings.length; j++) {
      const q = [D(t0, rings[j]), D(t1, rings[j]), D(t1, rings[j + 1]), D(t0, rings[j + 1])];
      const shine = back ? (0.1 + 0.06 * ((k + j) % 2)) : 0.035 + 0.02 * ((k + j) % 2);
      (back ? (v) => { back3d += v; } : (v) => { fore += v; })(`<path d="${pathOf(q)}Z" fill="#eafaf6" opacity="${f1(shine * 100) / 100}"/>`);
    }
  }
  const mer = (k, op, wd) => `<path d="${pathOf(Array.from({ length: 11 }, (_, i) => D((k * 2 * Math.PI) / M, ((Math.PI / 2) * i) / 10)))}" stroke="${iron}" stroke-width="${wd}" fill="none" opacity="${op}"/>`;
  const ring = (ph, a0, a1, op, wd) => `<path d="${pathOf(Array.from({ length: 21 }, (_, i) => D(a0 + ((a1 - a0) * i) / 20, ph)))}" stroke="${iron}" stroke-width="${wd}" fill="none" opacity="${op}"/>`;
  for (let k = 0; k < M; k++) { const th = (k * 2 * Math.PI) / M; if (isBack(th)) back3d += mer(k, 0.95, 2.2); else fore += mer(k, 0.5, 1.6); }
  for (const ph of rings) { back3d += ring(ph, (3 * Math.PI) / 4, (7 * Math.PI) / 4, 0.95, ph ? 1.6 : 3); fore += ring(ph, -Math.PI / 4, (3 * Math.PI) / 4, 0.5, ph ? 1.2 : 2.4); }
  // Reflejo grande y linterna de remate
  const hl = Array.from({ length: 12 }, (_, i) => D(Math.PI * 0.55 + i * 0.07, 0.35 + i * 0.05));
  fore += `<path d="${pathOf(hl)}" stroke="#fff" stroke-width="7" stroke-linecap="round" fill="none" opacity=".18"/>`;
  const [ax, ay] = P(cx, cy, H + Rz);
  back3d += `<path d="M${ax - 10},${ay + 2} h20 l-3,-16 h-14 Z" fill="${iron}" opacity=".9"/><path d="M${ax - 7},${ay - 14} q7,-12 14,0 Z" fill="${iron}"/><line x1="${ax}" y1="${ay - 20}" x2="${ax}" y2="${ay - 34}" stroke="${iron}" stroke-width="2"/><circle cx="${ax}" cy="${ay - 35}" r="2.5" fill="#d4af37"/>`;
  // Paredes de cristal delanteras (solo los hierros, muy suaves, para no tapar)
  const frontPost = (a, b) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${iron}" stroke-width="1.8" opacity=".38"/>`;
  for (let i = 0; i <= N; i += 2) { fore += frontPost(P(N, i, 0), P(N, i, H)) + frontPost(P(i, N, 0), P(i, N, H)); }
  for (const z of [H, H - 74]) fore += frontPost(P(N, 0, z), P(N, N, z)) + frontPost(P(0, N, z), P(N, N, z));
  fore += `<path d="${pathOf([P(N, 0, H), P(N, N, H), P(N, N, 0), P(N, 0, 0)])}Z" fill="#eafaf6" opacity=".05"/><path d="${pathOf([P(0, N, H), P(N, N, H), P(N, N, 0), P(0, N, 0)])}Z" fill="#eafaf6" opacity=".05"/>`;
  return { bg, walls, back3d, defs, noBaseboard: true, cap: '#eef2ee' };
}

// =====================================================================================
// Suelos (dibujados en el plano del suelo: u a lo largo de x, v a lo largo de y, 32 por casilla)
// =====================================================================================
export function floorScene(room, N, uid, fa, fb, night) {
  const W = N * 32, f = room.floor || 'wood';
  let local = '', screen = '', defs = '', edge = '';
  if (f === 'wood' || f === 'darkwood') local = planks(W, fa, 'p' + f, 16, f === 'darkwood' ? [70, 150] : [50, 120]);
  else if (f === 'tiles' || f === 'checker' || f === 'marble') {
    local = `<rect width="${W}" height="${W}" fill="${fa}"/>`;
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) if ((x + y) % 2) local += `<rect x="${x * 32}" y="${y * 32}" width="32" height="32" fill="${fb}"/>`;
    if (f !== 'tiles') {
      for (let i = 0; i < N * 1.5; i++) { const x = rnd('vx' + i) * W, y = rnd('vy' + i) * W; local += `<path d="M${f1(x)},${f1(y)} q12,6 18,20 t10,22" stroke="${shade(fb, 0.85)}" stroke-width=".7" fill="none" opacity=".45"/>`; }
      defs += `<linearGradient id="${uid}sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity=".22"/><stop offset=".55" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`;
      local += `<rect width="${W}" height="${W}" fill="url(#${uid}sheen)"/>`;
    }
    for (let i = 0; i <= N; i++) local += `<path d="M${i * 32},0 V${W} M0,${i * 32} H${W}" stroke="${shade(fa, 0.8)}" stroke-width=".6" opacity=".5"/>`;
  } else if (f === 'flagstone') {
    local = `<rect width="${W}" height="${W}" fill="${fb}"/>`;
    for (let v = 0, row = 0; v < W; row++) {
      const rh = 22 + rnd('fr' + row) * 18;
      for (let u = -rnd('fo' + row) * 40, i = 0; u < W; i++) {
        const sw = 24 + rnd('fw' + row + '-' + i) * 36, c = shade(fa, 0.84 + rnd('fk' + row + '-' + i) * 0.26);
        local += `<rect x="${f1(u + 1.8)}" y="${f1(v + 1.8)}" width="${f1(sw - 3.6)}" height="${f1(rh - 3.6)}" rx="5" fill="${c}"/><rect x="${f1(u + 4)}" y="${f1(v + 3)}" width="${f1(sw - 10)}" height="2" rx="1" fill="${shade(c, 1.12)}" opacity=".6"/>`;
        if (rnd('fc' + row + '-' + i) < 0.12) local += `<path d="M${f1(u + sw * 0.3)},${f1(v + 4)} l5,8 -3,6 4,7" stroke="${shade(c, 0.7)}" stroke-width=".8" fill="none"/>`;
        if (rnd('fm' + row + '-' + i) < 0.2) local += `<ellipse cx="${f1(u)}" cy="${f1(v + rh / 2)}" rx="3" ry="6" fill="#5f7d3a" opacity=".6"/>`;
        u += sw;
      }
      v += rh;
    }
  } else if (f === 'terracotta') {
    local = `<rect width="${W}" height="${W}" fill="${fb}"/>`;
    for (let u = 0; u < W; u += 16) for (let v = 0; v < W; v += 16) {
      const c = shade(fa, 0.88 + rnd('t' + u + '-' + v) * 0.2);
      local += `<rect x="${u + 0.9}" y="${v + 0.9}" width="14.2" height="14.2" rx="1" fill="${c}"/>`;
    }
    for (let u = 32; u < W; u += 64) for (let v = 32; v < W; v += 64) local += `<rect x="${u - 3}" y="${v - 3}" width="6" height="6" fill="#3f6e8c" transform="rotate(45 ${u} ${v})"/>`;
  } else if (f === 'tatami') {
    const e = '#3f4f2e';
    local = `<rect width="${W}" height="${W}" fill="${e}"/>`;
    for (let v = 0, row = 0; v < W; v += 64, row++) for (let u = (row % 2) * -32; u < W; u += 96) {
      for (const [x, y, ww, hh] of [[u, v, 64, 32], [u + 64, v, 32, 64], [u, v + 32, 64, 32]]) {
        local += `<rect x="${x + 2}" y="${y + 2}" width="${ww - 4}" height="${hh - 4}" fill="${shade(fa, 0.95 + rnd('m' + x + '-' + y) * 0.1)}"/>`;
        const horiz = ww > hh;
        for (let k = 4; k < (horiz ? hh : ww) - 3; k += 2.4) local += horiz ? `<path d="M${x + 4},${f1(y + k)} h${ww - 8}" stroke="${shade(fa, 0.88)}" stroke-width=".45"/>` : `<path d="M${f1(x + k)},${y + 4} v${hh - 8}" stroke="${shade(fa, 0.88)}" stroke-width=".45"/>`;
        local += horiz ? `<rect x="${x + 2}" y="${y + 2}" width="3.2" height="${hh - 4}" fill="${e}"/><rect x="${x + ww - 5.2}" y="${y + 2}" width="3.2" height="${hh - 4}" fill="${e}"/>`
          : `<rect x="${x + 2}" y="${y + 2}" width="${ww - 4}" height="3.2" fill="${e}"/><rect x="${x + 2}" y="${y + hh - 5.2}" width="${ww - 4}" height="3.2" fill="${e}"/>`;
      }
    }
  } else if (f === 'moss') {
    local = `<rect width="${W}" height="${W}" fill="${fa}"/>`;
    for (let i = 0; i < N * N * 0.7; i++) local += `<ellipse cx="${f1(rnd('ga' + i) * W)}" cy="${f1(rnd('gb' + i) * W)}" rx="${f1(10 + rnd('gc' + i) * 22)}" ry="${f1(7 + rnd('gd' + i) * 14)}" fill="${shade(fa, rnd('ge' + i) > 0.5 ? 1.1 : 0.88)}" opacity=".6"/>`;
    // Camino de piedras
    for (let t = 0; t < 1; t += 1 / (N * 1.3)) {
      const u = W * (0.5 + 0.18 * Math.sin(t * 5)), v = W - t * (W - 30);
      local += `<ellipse cx="${f1(u)}" cy="${f1(v)}" rx="${f1(10 + rnd('st' + t) * 4)}" ry="${f1(8 + rnd('su' + t) * 3)}" fill="#8f8a80"/><ellipse cx="${f1(u - 1.5)}" cy="${f1(v - 1.5)}" rx="${f1(8 + rnd('st' + t) * 3)}" ry="${f1(6 + rnd('su' + t) * 2)}" fill="#b2ada2"/>`;
    }
    for (let i = 0; i < N * N * 2.2; i++) {
      const [x, y] = P(rnd('mx' + i) * N, rnd('my' + i) * N, 0);
      if (i % 6 === 0) screen += [0, 72, 144, 216, 288].map((a) => `<circle cx="${f1(x + Math.cos((a * Math.PI) / 180) * 1.8)}" cy="${f1(y - 3 + Math.sin((a * Math.PI) / 180) * 1.2)}" r="1.3" fill="${['#ffffff', '#f6c6d8', '#f7e7a6', '#c9b6f0'][i % 4]}"/>`).join('') + `<circle cx="${x}" cy="${f1(y - 3)}" r=".8" fill="#e8b33a"/>`;
      else screen += `<path d="M${x},${y} q-1,-4 -3,-6 M${x},${y} q0,-4 0,-8 M${x},${y} q1,-4 3,-6" stroke="${shade(fa, i % 2 ? 0.72 : 1.18)}" stroke-width="1" fill="none"/>`;
    }
    // Borde de tierra con raíces y hierba que cuelga
    const soil = dark(night) ? '#2e2218' : '#5a3f2a';
    edge = `<path d="${pathOf([P(0, N, 0), P(N, N, 0), P(N, N, -22), P(0, N, -22)])}Z" fill="${soil}"/><path d="${pathOf([P(N, 0, 0), P(N, N, 0), P(N, N, -22), P(N, 0, -22)])}Z" fill="${shade(soil, 0.78)}"/>`;
    for (let i = 0; i < N * 3; i++) {
      const t = rnd('ed' + i) * N, [x1, y1] = P(t, N, -6 - rnd('ez' + i) * 12), [x2, y2] = P(N, t, -6 - rnd('ew' + i) * 12);
      edge += `<ellipse cx="${x1}" cy="${y1}" rx="2.4" ry="1.6" fill="#8a7d6b"/><path d="M${x2},${y2} q4,3 8,1" stroke="#3a281a" stroke-width="1" fill="none"/>`;
    }
    for (let i = 0; i <= N * 6; i++) {
      const t = (i / (N * 6)) * N, [x1, y1] = P(t, N, 0), [x2, y2] = P(N, t, 0);
      edge += `<path d="M${x1},${y1} q-1,4 -2,7 M${x2},${y2} q1,4 2,7" stroke="${shade(fa, 0.85)}" stroke-width="1.4"/>`;
    }
  } else if (f === 'nightstone') {
    local = `<rect width="${W}" height="${W}" fill="${fb}"/>`;
    for (let u = 0; u < W; u += 64) for (let v = 0; v < W; v += 64) local += `<rect x="${u + 1}" y="${v + 1}" width="62" height="62" fill="${shade(fa, 0.9 + rnd('ns' + u + '-' + v) * 0.2)}"/>`;
    for (let i = 0; i < N * 2; i++) { const x = rnd('nx' + i) * W, y = rnd('ny' + i) * W; local += `<path d="M${f1(x)},${f1(y)} q14,8 20,24 t12,26" stroke="#8f96c8" stroke-width=".7" fill="none" opacity=".35"/>`; }
    for (let i = 0; i <= N; i += 2) local += `<path d="M${i * 32},0 V${W} M0,${i * 32} H${W}" stroke="#a9aed8" stroke-width=".8" opacity=".45"/>`;
    defs += `<linearGradient id="${uid}sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#cfd6ff" stop-opacity=".16"/><stop offset=".55" stop-color="#fff" stop-opacity=".03"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`;
    local += `<rect width="${W}" height="${W}" fill="url(#${uid}sheen)"/>`;
  } else { // moquetas
    local = `<rect width="${W}" height="${W}" fill="${fa}"/>`;
    for (let i = 0; i < N * N * 3; i++) local += `<circle cx="${f1(rnd('cx' + i) * W)}" cy="${f1(rnd('cy' + i) * W)}" r="${f1(0.6 + rnd('cr' + i))}" fill="${shade(fa, rnd('cs' + i) > 0.5 ? 1.08 : 0.92)}"/>`;
  }
  // Sombra suave donde el suelo se junta con las paredes
  local += `<rect width="${W}" height="44" fill="url(#aoV)"/><rect width="44" height="${W}" fill="url(#aoH)"/>`;
  return { local, screen, defs, edge };
}
const dark = (night) => night || skyColors(new Date().getHours())[0] === '#1c2448';
